import express, {type Request, type Response, type NextFunction} from 'express';
import { randomUUID } from 'node:crypto';
import {createClient, type SupabaseClient} from '@supabase/supabase-js';
import Razorpay from 'razorpay';
import {azureConfig, readPalm} from './palm';
import {readCouple} from './couple';
import {budgetedAzureFetch} from './ai-budget';
import {validatePhotoQuality} from './photo-quality';
import {HttpError, getPlan, validateInput, verifySignature} from './validation';
export function createApi() {
  const app = express();
  app.disable('x-powered-by');
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publicClient = url && anon ? createClient(url, anon, {auth: {persistSession: false, autoRefreshToken: false}}) : null;
  const admin: SupabaseClient | null = url && secret ? createClient(url, secret, {auth: {persistSession: false, autoRefreshToken: false}}) : null;
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const billing = process.env.BILLING_ENABLED === 'true' && Boolean(admin && keyId && keySecret);
  if (process.env.BILLING_ENABLED === 'true' && !billing) throw new Error('Billing requires Supabase service credentials and both Razorpay keys.');
  const razorpay = billing ? new Razorpay({key_id: keyId!, key_secret: keySecret!}) : null;
  const ai = process.env.AI_ENABLED === 'true' ? azureConfig() : null;
  const wrap = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => { Promise.resolve(fn(req,res)).catch(next); };
  async function userId(req: Request, required = false) {
    const header = req.headers.authorization;
    if (!header) { if (required) throw new HttpError(401, 'Please sign in to use your reading credits.'); return null; }
    if (!publicClient || !header.startsWith('Bearer ')) throw new HttpError(401, 'Please sign in again.');
    const {data, error} = await publicClient.auth.getUser(header.slice(7));
    if (error || !data.user) throw new HttpError(401, 'Your session expired. Please sign in again.');
    return data.user.id;
  }
  const requests = new Map<string, {count: number; until: number}>();
  app.use('/api', (req,res,next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'GET' || req.path === '/payment-webhook') return next();
    const origin = req.headers.origin;
    const expected = process.env.APP_URL ? new URL(process.env.APP_URL).origin : null;
    if (origin && origin !== expected && new URL(origin).host !== req.headers.host) return res.status(403).json({error: 'Request origin is not allowed.'});
    const now = Date.now();
    for (const [key,value] of requests) if (value.until < now) requests.delete(key);
    const ip = req.ip || 'unknown';
    const state = requests.get(ip) || {count: 0, until: now + 600000};
    state.count++; requests.set(ip,state);
    if (state.count > 20) return res.status(429).json({error: 'Please wait a few minutes before making another request.'});
    next();
  });
  async function fulfill(payment: any) {
    if (!admin || !razorpay) throw new HttpError(503, 'Checkout is not available yet.');
    const {data: order, error} = await admin.from('payment_orders').select('*').eq('id', payment.order_id).single();
    if (error || !order) throw new HttpError(404, 'Order not found.');
    if (payment.status !== 'captured' || Number(payment.amount) !== order.amount || payment.currency !== 'INR') throw new HttpError(409, 'Your payment is still processing. Try checking it again in a moment.');
    const {data, error: creditError} = await admin.rpc('fulfill_palm_order', {p_order_id: order.id, p_payment_id: payment.id});
    if (creditError) throw new HttpError(503, 'Payment received, but credits could not be updated yet. Use Check payment to retry.');
    return data;
  }
  app.post('/api/payment-webhook', express.raw({type: 'application/json', limit: '1mb'}), wrap(async (req,res) => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!billing || !webhookSecret || !Buffer.isBuffer(req.body) || !verifySignature(req.body, req.headers['x-razorpay-signature'], webhookSecret)) throw new HttpError(400, 'Invalid webhook signature.');
    const event = JSON.parse(req.body.toString());
    if (event.event === 'payment.captured') {
      const id = event.payload?.payment?.entity?.id;
      if (typeof id !== 'string') throw new HttpError(400,'Missing payment.');
      await fulfill(await razorpay!.payments.fetch(id));
    }
    res.json({received: true});
  }));
  app.use(express.json({limit:'30mb'}));
  app.get('/api/health', (_req,res) => res.json({status:'ok'}));
  app.get('/api/config', (_req,res) => res.json({aiConfigured:Boolean(ai && admin), billingConfigured:billing}));
  app.get('/api/credits', wrap(async (req,res) => {
    const uid = await userId(req,true);
    if (!admin || !billing) return res.json({credits:0, coupleCredits:0, billingConfigured:false});
    const {data,error} = await admin.from('profiles').select('credits,couple_credits').eq('user_id',uid).maybeSingle();
    if (error) throw new HttpError(503,'Could not load your balance.');
    const {data:orders,error:ordersError} = await admin.from('payment_orders').select('id,plan,amount,credits,created_at,fulfilled_at').eq('user_id',uid).order('created_at',{ascending:false}).limit(20);
    if(ordersError) throw new HttpError(503,'Could not load your purchase records. Please retry.');
    res.json({credits:data?.credits || 0, coupleCredits:data?.couple_credits || 0, billingConfigured:true, pendingOrderId:orders?.find(order=>!order.fulfilled_at)?.id,purchases:orders||[]});
  }));
  app.post('/api/palm-reading', wrap(async (req,res) => {
    const input = validateInput(req.body);
    const uid = await userId(req,true);
    if (!ai || !admin) throw new HttpError(503,'The reading service is not connected yet. Please explore the sample reading.');
    if(process.env.NODE_ENV==='production' && !billing) throw new HttpError(503,'Paid readings will open when checkout is connected. The sample is available now.');
    if (billing) {
      const {data,error} = await admin!.from('profiles').select('credits,couple_credits').eq('user_id',uid).maybeSingle();
      if (error) throw new HttpError(503,'Could not check your balance.');
      if (!data || (input.readingKind==='couple' ? data.couple_credits : data.credits) < 1) throw new HttpError(402,input.readingKind==='couple'?'You need a couple reading credit (₹30). Individual credits cannot be used for couples.':'You need an individual reading credit. Choose ₹20 for one or ₹80 for five.');
    }
    let content;
    await validatePhotoQuality(input.images);
    try {content = await (input.readingKind==='couple' ? readCouple(input,ai,budgetedAzureFetch(admin)) : readPalm(input,ai,budgetedAzureFetch(admin)));}
    catch (error) {if (error instanceof HttpError) throw error; throw new HttpError(502,'The AI service could not complete your reading. Please try again.');}
    let savedReadingId: string | undefined;
    if (billing && uid) {
      savedReadingId = randomUUID();
      const {error} = await admin!.rpc('save_paid_palm_reading', {p_id:savedReadingId,p_user_id:uid,p_title:input.title,p_reading_text:JSON.stringify(content),p_mode:input.isRoastMode?'roast':'standard',p_main_focus:input.mainFocus});
      if (error) throw new HttpError(409,'The reading could not be saved or your credits changed. No credit was charged for this attempt.');
    }
    res.json({content,savedReadingId});
  }));
  app.post('/api/create-order', wrap(async (req,res) => {
    const plan = getPlan(req.body?.plan);
    if (!billing) throw new HttpError(503,'Checkout is not available yet.');
    const uid = await userId(req,true);
    const order = await razorpay!.orders.create({amount:plan.amount,currency:'INR',receipt:randomUUID(),notes:{userId:uid!,plan:req.body.plan}});
    const {error} = await admin!.from('payment_orders').insert({id:order.id,user_id:uid,plan:req.body.plan,amount:plan.amount,credits:plan.credits,currency:'INR'});
    if (error) throw new HttpError(503,'Your order could not be prepared. Please try again.');
    res.json({orderId:order.id,amount:plan.amount,currency:'INR',keyId,name:plan.name});
  }));
  app.post('/api/verify-payment', wrap(async (req,res) => {
    if (!billing) throw new HttpError(503,'Checkout is not available yet.');
    const uid = await userId(req,true);
    const {razorpay_order_id: orderId,razorpay_payment_id: paymentId,razorpay_signature: signature} = req.body || {};
    if (typeof orderId !== 'string' || typeof paymentId !== 'string' || !verifySignature(orderId+'|'+paymentId,signature,keySecret!)) throw new HttpError(400,'Payment verification failed.');
    const {data:order} = await admin!.from('payment_orders').select('user_id').eq('id',orderId).single();
    if (!order || order.user_id !== uid) throw new HttpError(404,'Order not found.');
    const payment = await razorpay!.payments.fetch(paymentId);
    if (payment.order_id !== orderId) throw new HttpError(400,'Payment does not match this order.');
    res.json({success:true,credits:await fulfill(payment)});
  }));
  app.post('/api/check-payment', wrap(async (req,res) => {
    if (!billing) throw new HttpError(503,'Checkout is not available yet.');
    const uid = await userId(req,true), orderId = req.body?.orderId;
    if (typeof orderId !== 'string') throw new HttpError(400,'Choose an order to check.');
    const {data:order} = await admin!.from('payment_orders').select('*').eq('id',orderId).eq('user_id',uid).single();
    if (!order) throw new HttpError(404,'Order not found.');
    const payments = await razorpay!.orders.fetchPayments(orderId);
    const payment = payments.items.find(p => p.status === 'captured');
    if (!payment) return res.json({success:false,pending:true});
    res.json({success:true,credits:await fulfill(payment)});
  }));
  app.use('/api', (_req,res) => res.status(404).json({error:'API route not found.'}));
  app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = error instanceof HttpError ? error.status : error.type === 'entity.too.large' ? 413 : error instanceof SyntaxError ? 400 : 500;
    res.status(status).json({error:error instanceof HttpError ? error.message : status === 413 ? 'These photos are too large. Try smaller images.' : status === 400 ? 'Invalid request.' : 'The service could not complete your request. Please try again.'});
  });
  return app;
}
