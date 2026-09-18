import {supabase} from './supabase-client';
import type {Reading} from '../types';
function client() {if(!supabase)throw new Error('The Supabase connection is not configured.');return supabase;}
export function fromRow(row:any):Reading {return {id:row.id,userId:row.user_id,title:row.title,readingText:row.reading_text,createdAt:Date.parse(row.created_at),mode:row.mode,mainFocus:row.main_focus};}
export function subscribeReadings(userId:string|undefined,onData:(r:Reading[])=>void,onError:(e:Error)=>void) {
  let active=true;
  async function update() {
    if(!userId){onData([]);return;}
    try {
      const {data,error}=await client().from('readings').select('*').eq('user_id',userId).order('created_at',{ascending:false});
      if(!active)return;
      if(error)onError(error);else onData((data||[]).map(fromRow));
    }catch(e){if(active)onError(e as Error);}
  }
  void update();
  window.addEventListener('readings-changed',update);window.addEventListener('focus',update);
  return ()=>{active=false;window.removeEventListener('readings-changed',update);window.removeEventListener('focus',update);};
}
export async function saveReading(reading:Reading):Promise<Reading> {
  const {data,error}=await client().from('readings').insert({id:reading.id,user_id:reading.userId,title:reading.title,reading_text:reading.readingText,mode:reading.mode,main_focus:reading.mainFocus}).select().single();
  if(error)throw error;
  window.dispatchEvent(new Event('readings-changed'));return fromRow(data);
}
export async function renameReading(reading:Reading,title:string) {
  const {data,error}=await client().from('readings').update({title}).eq('id',reading.id).select('id').single();
  if(error||!data)throw error||new Error('Reading not found.');
  window.dispatchEvent(new Event('readings-changed'));
}
export async function removeReading(reading:Reading) {
  const {data,error}=await client().from('readings').delete().eq('id',reading.id).select('id').single();
  if(error||!data)throw error||new Error('Reading not found.');
  window.dispatchEvent(new Event('readings-changed'));
}
