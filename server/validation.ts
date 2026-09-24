import { createHmac, timingSafeEqual } from 'node:crypto';
export class HttpError extends Error { constructor(public status: number, message: string, public retryAfterSeconds?: number, public code?: string) { super(message); } }
export const plans = {deepdive: {amount: 2000, credits: 1, name: 'Individual reading'}, couple: {amount:3000,credits:1,name:'Couple reading'}, mystic: {amount: 8000, credits: 5, name: 'Family pack — 5 individuals'}} as const;
export function getPlan(value: unknown) {
  if (typeof value !== 'string' || !Object.hasOwn(plans, value)) throw new HttpError(400, 'Choose a valid reading pack.');
  return plans[value as keyof typeof plans];
}
export function verifySignature(body: string | Buffer, signature: unknown, secret: string): boolean {
  if (typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  return timingSafeEqual(createHmac('sha256', secret).update(body).digest(), Buffer.from(signature, 'hex'));
}
export function validateInput(body: any) {
  if(body?.readingKind === 'couple') {
    if(!Array.isArray(body.partners) || body.partners.length!==2 || body.partners[0]?.label!=='Male partner' || body.partners[1]?.label!=='Female partner' || body.consent!==true) throw new HttpError(400,'Add both partners and confirm permission to use their photos.');
    const partners=body.partners.map((p:any)=>{
      if(!['Right','Left','Unknown / ambidextrous'].includes(p.dominantHand) || !Array.isArray(p.photos) || p.photos.length<1 || p.photos.length>2 || p.photos.some((photo:any)=>!['Right','Left'].includes(photo?.side)) || new Set(p.photos.map((photo:any)=>photo.side)).size!==p.photos.length) throw new HttpError(400,'Label one or both hands separately for each partner.');
      validateInput({images:p.photos,dominantHand:'Right-handed',ageRange:p.ageRange,mainFocus:'Love & connection',isRoastMode:false});
      const ageRange=p.ageRange;
      if(!['18–24','25–34','35–44','45–54','55–64','65+'].includes(ageRange))throw new HttpError(400,'Choose a valid age range for each partner.');
      return {label:p.label,dominantHand:p.dominantHand,ageRange,photos:p.photos.map((photo:any)=>({side:photo.side,base64:photo.base64,mimeType:photo.mimeType}))};
    });
    if(body.title!==undefined && (typeof body.title!=='string' || body.title.length>100))throw new HttpError(400,'Use a title of up to 100 characters.');
    return {readingKind:'couple',partners,images:partners.flatMap((p:any)=>p.photos),title:body.title?.trim()||'Our couple reading',mainFocus:'Couple compatibility',isRoastMode:false};
  }
  if (!body || !Array.isArray(body.images) || body.images.length < 1 || body.images.length > 2) throw new HttpError(400, 'Add one or two palm photos.');
  const sides=body.images.map((image:any)=>image?.side);
  if(sides.some((side:unknown)=>side!==undefined) && (sides.some((side:unknown)=>!['Left','Right'].includes(side as string)) || new Set(sides).size!==sides.length)) throw new HttpError(400,'Label each palm separately as Left or Right.');
  for (const image of body.images) {
    if (!image || !['image/jpeg','image/png','image/webp'].includes(image.mimeType) || typeof image.base64 !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(image.base64) || image.base64.length > 7000000) throw new HttpError(400, 'Choose a valid JPG, PNG, or WebP photo under 5 MB after resizing.');
    const bytes = Buffer.from(image.base64, 'base64');
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const png = bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const webp = bytes.subarray(0,4).toString() === 'RIFF' && bytes.subarray(8,12).toString() === 'WEBP';
    if (!(image.mimeType === 'image/jpeg' && jpeg || image.mimeType === 'image/png' && png || image.mimeType === 'image/webp' && webp)) throw new HttpError(400, 'This file does not match its image type.');
  }
  const hands = ['Right-handed','Left-handed','Ambidextrous'];
  const ages = ['18–24','25–34','35–44','45–54','55–64','65+'];
  const focuses = ['Overall life path','Personality & purpose','Career & growth','Love & connection','Everyday balance'];
  if (!hands.includes(body.dominantHand) || !ages.includes(body.ageRange) || !focuses.includes(body.mainFocus) || typeof body.isRoastMode !== 'boolean') throw new HttpError(400, 'Choose valid reading preferences.');
  if (body.title !== undefined && (typeof body.title !== 'string' || body.title.length > 100)) throw new HttpError(400, 'Use a title of up to 100 characters.');
  return {...body, title: body.title?.trim() || 'My palm reading'};
}
