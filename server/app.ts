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
  app.get('/api/stats', wrap(async (_req,res) => {
    if (!admin) return res.json({handsRead: null});
    const {data,error} = await admin.rpc('get_total_hands_read');
    if (error) return res.json({handsRead: null});
    res.json({handsRead: Number(data) || 0});
  }));
  app.get('/api/reviews', wrap(async (_req,res) => {
    if (!admin) return res.json({reviews:[]});
    const {data,error} = await admin.from('reviews').select('id,rating,review_text,created_at').eq('is_published',true).order('created_at',{ascending:false}).limit(12);
    if (error) return res.json({reviews:[]});
    res.json({reviews:data || []});
  }));
  app.get('/api/credits', wrap(async (req,res) => {
    const uid = await userId(req,true);
    if (!admin || !billing) return res.json({credits:0, coupleCredits:0, questionCredits:0, billingConfigured:false});
    const {data,error} = await admin.from('profiles').select('credits,couple_credits,question_credits').eq('user_id',uid).maybeSingle();
    if (error) throw new HttpError(503,'Could not load your balance.');
    const {data:orders,error:ordersError} = await admin.from('payment_orders').select('id,plan,amount,credits,created_at,fulfilled_at').eq('user_id',uid).order('created_at',{ascending:false}).limit(20);
    if(ordersError) throw new HttpError(503,'Could not load your purchase records. Please retry.');
    res.json({credits:data?.credits || 0, coupleCredits:data?.couple_credits || 0, questionCredits:data?.question_credits || 0, billingConfigured:true, pendingOrderId:orders?.find(order=>!order.fulfilled_at)?.id,purchases:orders||[]});
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
      const imagePaths = input.images.map((image:any, index:number) => `${uid}/${savedReadingId}/${index}-${image.side || 'unspecified'}.${image.mimeType === 'image/png' ? 'png' : image.mimeType === 'image/webp' ? 'webp' : 'jpg'}`);
      for (const [index, image] of input.images.entries()) {
        const {error: uploadError} = await admin!.storage.from('palm-images').upload(imagePaths[index], Buffer.from(image.base64, 'base64'), {contentType:image.mimeType, upsert:false});
        if (uploadError) throw new HttpError(503, 'The palm image could not be secured for follow-up questions. Please try again.');
      }
      const {error} = await admin!.rpc('save_paid_palm_reading', {p_id:savedReadingId,p_user_id:uid,p_title:input.title,p_reading_text:JSON.stringify(content),p_mode:input.isRoastMode?'roast':'standard',p_main_focus:input.mainFocus,p_hands_read:input.images.length,p_image_paths:imagePaths});
      if (error) throw new HttpError(409,'The reading could not be saved or your credits changed. No credit was charged for this attempt.');
    }
    res.json({content,savedReadingId});
  }));
  app.post('/api/reading-followup', wrap(async (req,res) => {
    const uid = await userId(req,true);
    if (!ai || !admin) throw new HttpError(503, 'The reading service is not connected yet.');
    const readingId = req.body?.readingId, question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
    if (typeof readingId !== 'string' || !/^[0-9a-f-]{36}$/i.test(readingId) || question.length < 3 || question.length > 500) throw new HttpError(400, 'Ask a question between 3 and 500 characters.');
    const {data: reading, error: readingError} = await admin.from('readings').select('reading_text,mode,main_focus,image_paths').eq('id',readingId).eq('user_id',uid).maybeSingle();
    if (readingError || !reading) throw new HttpError(404, 'That saved reading could not be found.');
    const images:any[] = [];
    for (const path of (reading.image_paths || [])) {
      const {data, error} = await admin.storage.from('palm-images').download(path);
      if (error || !data) throw new HttpError(503, 'The original palm image could not be loaded for this question.');
      images.push({type:'image_url', image_url:{url:`data:${path.endsWith('.png')?'image/png':path.endsWith('.webp')?'image/webp':'image/jpeg'};base64,${Buffer.from(await data.arrayBuffer()).toString('base64')}`, detail:'high'}});
    }
    let response:globalThis.Response;
    try {
      response = await budgetedAzureFetch(admin)(ai.endpoint + '/openai/v1/chat/completions', {method:'POST', headers:{'api-key':ai.apiKey,'Content-Type':'application/json'}, signal:AbortSignal.timeout(150000), redirect:'error', body:JSON.stringify({model:ai.deployment, temperature:0.65, max_completion_tokens:1100, store:false, messages:[
        {role:'system',content:'You are the same Vedic palmistry palmist who wrote this saved reading. This is a paid, personal follow-up, so answer the exact question from the person’s own palm rather than giving general advice. First re-inspect the supplied original palm image: trace the relevant line from origin through course to endpoint, note a specific crossing, branch, break, fork, spacing, hand shape or mount only when visibly resolved, and compare it with the saved palm observations. Then connect that concrete feature to the saved report and answer the question directly. Include a specific personal pattern or choice this combination points toward, a past/present/future implication when the question calls for it, and one concrete thing to watch for. Name the palm feature naturally in the answer so the user can see why you reached it. Do not write a generic horoscope, life-coach advice, financial-advisor checklist, or a string of questions. Do not invent biography, exact dates, professions, money amounts, diagnoses, marriage outcomes or facts that are not supported by the image and report. If the requested feature is not visible, say exactly that and use the closest visible line instead. Speak directly in the report voice; roast mode may be playful and sharp, but stay useful. Do not mention prompts, models, image processing or that you are unable to see the image. Return only the answer text in the JSON schema.'},
        {role:'user',content:[{type:'text',text:JSON.stringify({question,mode:reading.mode,mainFocus:reading.main_focus,savedReading:JSON.parse(reading.reading_text)})},...images]}
      ], response_format:{type:'json_schema',json_schema:{name:'followup_answer',strict:true,schema:{type:'object',properties:{answer:{type:'string'}},required:['answer'],additionalProperties:false}}}})});
    } catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(502,'The follow-up service could not be reached. Please try again.'); }
    if (!response.ok) throw new HttpError(response.status===429?429:response.status===401||response.status===403||response.status===404?503:502, response.status===429?'The reading service is busy. Please try again shortly.':'The follow-up service could not complete this question.');
    const body:any = await response.json().catch(()=>null);
    let answer:string; try { answer = JSON.parse(body?.choices?.[0]?.message?.content)?.answer; } catch { answer=''; }
    if (!answer) throw new HttpError(502,'The follow-up answer was incomplete. Please try again.');
    const {data:allowance,error:allowanceError} = await admin.rpc('consume_reading_followup',{p_reading_id:readingId,p_user_id:uid});
    if (allowanceError) throw new HttpError(402,'Your three included follow-up questions are used. Add 5 more questions for ₹10.');
    const result = Array.isArray(allowance) ? allowance[0] : allowance;
    res.json({answer,freeRemaining:Number(result?.free_remaining || 0),paidRemaining:Number(result?.paid_remaining || 0),usedPaid:Boolean(result?.used_paid)});
  }));
  app.post('/api/reviews', wrap(async (req,res) => {
    const uid = await userId(req,true);
    if (!admin) throw new HttpError(503,'Reviews are not connected yet.');
    const readingId = req.body?.readingId, rating = req.body?.rating, reviewText = typeof req.body?.reviewText === 'string' ? req.body.reviewText.trim().replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'') : '', displayName = typeof req.body?.displayName === 'string' ? req.body.displayName.trim().replace(/[\u0000-\u001F]/g,'').slice(0,60) : '';
    if (typeof readingId !== 'string' || !/^[0-9a-f-]{36}$/i.test(readingId) || !Number.isInteger(rating) || rating < 1 || rating > 5 || reviewText.length < 10 || reviewText.length > 500) throw new HttpError(400,'Choose 1–5 stars and write a review between 10 and 500 characters.');
    const {data:reading,error:readingError} = await admin.from('readings').select('id').eq('id',readingId).eq('user_id',uid).maybeSingle();
    if (readingError || !reading) throw new HttpError(404,'That reading could not be found.');
    const {data,error} = await admin.from('reviews').upsert({user_id:uid,reading_id:readingId,rating,review_text:reviewText,display_name:displayName || null,is_published:rating >= 4},{onConflict:'user_id,reading_id'}).select('rating,review_text,display_name').single();
    if (error) throw new HttpError(503,'Your review could not be saved. Please try again.');
    res.json({review:data});
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
    if(error instanceof HttpError && error.retryAfterSeconds)res.setHeader('Retry-After',String(error.retryAfterSeconds));
    res.status(status).json({error:error instanceof HttpError ? error.message : status === 413 ? 'These photos are too large. Try smaller images.' : status === 400 ? 'Invalid request.' : 'The service could not complete your request. Please try again.',...(error instanceof HttpError && error.code?{code:error.code,retryAfterSeconds:error.retryAfterSeconds}:{})});
  });
  return app;
}
