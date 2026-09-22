import type {AzureConfig} from './palm';
import type {ReadingContent,LifeAreaReading} from '../src/types';
import {HttpError} from './validation';
import {palmSystemPrompt} from './palm-tradition';

// Topic demand sources and limits: docs/READING_TOPICS.md.
export const LIFE_TOPICS=[
 {id:'romance',title:'Romance & lasting partnership',questions:['What could help me build a fulfilling romantic connection?','What should I explore before a deeper commitment?'],basis:'Symbolic relationship themes and reflection; not partner compatibility, marriage timing or relationship history.'},
 {id:'social',title:'Friendships & social life',questions:['How can I balance closeness with personal boundaries?','What makes a friendship worth investing in?'],basis:'Reflection on connection and boundaries; a palm does not reveal friends’ intentions or loyalty.'},
 {id:'money',title:'Money, assets & security',questions:['What should I consider when balancing spending, saving and long-term security?','What should I clarify before a large purchase or shared financial commitment?'],basis:'General financial reflection only. A palm cannot establish income, assets, debt, inheritance or investment outcomes.'},
 {id:'home',title:'Family, home & belonging',questions:['How can I balance family expectations with my own direction?','What would make my home life feel more supportive?'],basis:'General family and home reflection; no assumptions about family history, children or property ownership.'},
 {id:'career',title:'Career, business & recognition',questions:['What working conditions could help me use my strengths?','What should I weigh before changing jobs or starting something of my own?'],basis:'Symbolic direction and decision-making themes, not a forecast of promotions, business success or income.'},
 {id:'change',title:'Learning, travel & new chapters',questions:['What kind of learning or unfamiliar experience could stretch me?','What should I explore before relocating or making a major change?'],basis:'Reflection on possibilities; no prediction of travel, migration, visas or the timing of events.'},
 {id:'watchouts',title:'Blind spots & things to watch for',questions:['Which everyday tensions would be useful to check in myself?','How could I notice when I am overextending or avoiding a decision?'],basis:'Hypothetical self-reflection, not a diagnosis or warning of destined harm.'},
] as const;
const string={type:'string'};
const object=(properties:Record<string,unknown>)=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const area=object({summary:string,answerOne:string,answerTwo:string,watchOutFor:string,nextStep:string});
const schema=object(Object.fromEntries(LIFE_TOPICS.map(topic=>[topic.id,area])));

export function parseLifeAreas(value:any):LifeAreaReading[] {
 return LIFE_TOPICS.map(topic=>{
  const item=value?.[topic.id];
  if(!item || ['summary','answerOne','answerTwo','watchOutFor','nextStep'].some(key=>typeof item[key]!=='string' || !item[key].trim()))throw new HttpError(502,'The detailed life sections were incomplete. Please try again.');
  return {id:topic.id,title:topic.title,summary:item.summary,questions:topic.questions.map((question,i)=>({question,answer:i===0?item.answerOne:item.answerTwo})),watchOutFor:item.watchOutFor,nextStep:item.nextStep,basis:topic.basis};
 });
}

export async function generateLifeAreas(base:ReadingContent,config:AzureConfig,fetcher:typeof fetch,roast=false) {
 const prompt=palmSystemPrompt(roast)+`\nDETAILED LIFE QUESTIONS: Replace the main-report format with the supplied seven-topic schema. Write 110–150 words per topic across all fields; each answer needs 2–3 useful, specific sentences. Avoid repeating the main report or recycling the same advice. Keep summary to one short sentence. Every watchOutFor is a conditional everyday pattern, not a prediction of danger. Each nextStep is a concrete, low-stakes action. Use the supplied normal report as context, not proof of character. Do not invent additional physical features or expand a rule into an unsupported prediction. Where a topic cannot be established by the palm, answer as a clearly framed general reflection rather than filling it with invented facts. Do not add repetitive scope statements or the words symbolic/reflection to every answer; scope is available in the interface. Build each section around a different theme from the supplied report. Use concrete everyday situations and clear takeaways, not generic advice that could be pasted into every report. Do not force a palm-based conclusion where the evidence does not support one. The shareLines instruction is handled by the main report; return only the seven-topic schema here.
Do not assume relationship status, orientation, partner behavior, number of marriages, children, home ownership, wealth, debt or career. Romance may discuss communication, commitment and mutual respect; never infer a specific partner's fidelity or compatibility. Money and assets must discuss ordinary decision questions only, never assess the user's actual assets, prescribe investments, suggest loans or predict gains/losses. For missing context give alternative situations naturally, not an interrogation or repeated disclaimer. Never turn watch-outs into illness, accidents, curses, betrayal or bad-luck predictions.
${roast?'Rewrite the supplied lifeAreas into witty, sharp Gen Z prose while preserving their questions, meaning, uncertainty and practical substance. Keep money guidance clear; roast hypothetical shopping habits, not poverty or debt. Give each topic its own comic angle.':'Speak like a thoughtful palmist having a rich conversation, with warm detail and varied imagery. Explore possibilities without claiming fixed fate.'}`;
 let response:Response;
 try {response=await fetcher(config.endpoint+'/openai/v1/chat/completions',{
  method:'POST',headers:{'api-key':config.apiKey,'Content-Type':'application/json'},redirect:'error',signal:AbortSignal.timeout(90000),
  body:JSON.stringify({model:config.deployment,temperature:roast?0.85:0.65,max_completion_tokens:3000,store:false,
   messages:[{role:'system',content:prompt},{role:'user',content:JSON.stringify({reading:base,topics:LIFE_TOPICS})}],
   response_format:{type:'json_schema',json_schema:{name:'life_questions',strict:true,schema}}})});
 }catch(error){if(error instanceof HttpError)throw error;throw new HttpError(502,'The detailed reading could not be reached. Please try again later.');}
 if(!response.ok)throw new HttpError(response.status===429?429:502,'The detailed reading could not be completed. Please try again later.');
 const body:any=await response.json().catch(()=>null);
 if(body?.choices?.[0]?.finish_reason!=='stop')throw new HttpError(502,'The detailed reading was incomplete. Please try again.');
 try {return parseLifeAreas(JSON.parse(body.choices[0].message.content));}catch(error){if(error instanceof HttpError)throw error;throw new HttpError(502,'The detailed reading was incomplete. Please try again.');}
}
