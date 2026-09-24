import type {AzureConfig} from './palm';
import type {ReadingContent,LifeAreaReading} from '../src/types';
import {HttpError} from './validation';
import {palmSystemPrompt} from './palm-tradition';

// Topic demand sources and limits: docs/READING_TOPICS.md.
export const LIFE_TOPICS=[
 {id:'romance',title:'Romance & lasting partnership',basis:'Heart-line and head-line reading.'},
 {id:'social',title:'Friendships & social life',basis:'Heart-line and life-line reading.'},
 {id:'money',title:'Money, assets & security',basis:'Fate-line, head-line and life-line reading.'},
 {id:'home',title:'Family, home & belonging',basis:'Life-line and heart-line reading.'},
 {id:'career',title:'Career, business & recognition',basis:'Fate-line and head-line reading.'},
 {id:'change',title:'Learning, travel & new chapters',basis:'Head-line, fate-line and life-line reading.'},
 {id:'watchouts',title:'Blind spots & things to watch for',basis:'The combined pattern of the major lines.'},
] as const;
const string={type:'string'};
const object=(properties:Record<string,unknown>)=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const area=object({summary:string,insightOne:string,insightTwo:string,insightThree:string,watchOutFor:string,nextStep:string});
const schema=object(Object.fromEntries(LIFE_TOPICS.map(topic=>[topic.id,area])));

export function parseLifeAreas(value:any):LifeAreaReading[] {
 return LIFE_TOPICS.map(topic=>{
  const item=value?.[topic.id];
  if(!item || ['summary','insightOne','insightTwo','insightThree','watchOutFor','nextStep'].some(key=>typeof item[key]!=='string' || !item[key].trim()))throw new HttpError(502,'The detailed life sections were incomplete. Please try again.');
  return {id:topic.id,title:topic.title,summary:item.summary,insights:[item.insightOne,item.insightTwo,item.insightThree],watchOutFor:item.watchOutFor,nextStep:item.nextStep,basis:topic.basis};
 });
}

export async function generateLifeAreas(base:ReadingContent,config:AzureConfig,fetcher:typeof fetch,roast=false) {
 const prompt=palmSystemPrompt(roast)+`\nDETAILED LIFE READING: Replace the main-report format with the supplied seven-topic schema. These are findings, never questions or answers. Write 140–180 words per topic across all fields. summary is one short, decisive finding; insightOne, insightTwo and insightThree are each 1–2 sentences of direct palm-reading interpretation. Every insight must add a different implication of the established palm pattern: do not restate the same advice three ways. Avoid repeating the main report or recycling the same advice. Build every topic around a distinct visible-line theme already established in the supplied report. Lead each insight with that specific palm pattern and unfold it as a traditional palmist would; do not produce generic life-coach or financial-advisor language that could fit any person. Make the money section a real material-security reading: connect the visible fate, head, or life-line pattern to how the person approaches ambition, risk, discipline, timing, and long-term stability. Do not give stock picks, loan instructions, or claim an exact income, asset amount, inheritance, gain or loss. Every watchOutFor names a vivid, ordinary pattern that could derail the reading's specific theme. Each nextStep is a concrete action connected to that theme. Do not add scope statements or the words symbolic/reflection to the report. The shareLines instruction is handled by the main report; return only the seven-topic schema here.
Do not assume relationship status, orientation, partner behavior, number of marriages, children, home ownership, wealth, debt or a particular job. Romance may describe the reader's emotional style and commitment pattern without inventing a partner's behavior. For missing context, draw from the available palm-line combination rather than falling back to generic questions. Never turn watch-outs into illness, accidents, curses, betrayal or bad-luck predictions.
${roast?'Rewrite the supplied life reading into witty, sharp Gen Z prose while preserving its findings, meaning, uncertainty and practical substance. Keep money guidance clear; roast hypothetical shopping habits, not poverty or debt. Give each topic its own comic angle.':'Speak like a thoughtful palmist having a rich conversation, with warm detail and varied imagery. Explore possibilities without claiming fixed fate.'}`;
 let response:Response;
 try {response=await fetcher(config.endpoint+'/openai/v1/chat/completions',{
  method:'POST',headers:{'api-key':config.apiKey,'Content-Type':'application/json'},redirect:'error',signal:AbortSignal.timeout(150000),
  body:JSON.stringify({model:config.deployment,temperature:roast?0.85:0.65,max_completion_tokens:3000,store:false,
   messages:[{role:'system',content:prompt},{role:'user',content:JSON.stringify({reading:base,topics:LIFE_TOPICS})}],
   response_format:{type:'json_schema',json_schema:{name:'life_reading',strict:true,schema}}})});
 }catch(error){if(error instanceof HttpError)throw error;throw new HttpError(502,'The detailed reading could not be reached. Please try again later.');}
 if(!response.ok)throw new HttpError(response.status===429?429:502,'The detailed reading could not be completed. Please try again later.');
 const body:any=await response.json().catch(()=>null);
 if(body?.choices?.[0]?.finish_reason!=='stop')throw new HttpError(502,'The detailed reading was incomplete. Please try again.');
 try {return parseLifeAreas(JSON.parse(body.choices[0].message.content));}catch(error){if(error instanceof HttpError)throw error;throw new HttpError(502,'The detailed reading was incomplete. Please try again.');}
}
