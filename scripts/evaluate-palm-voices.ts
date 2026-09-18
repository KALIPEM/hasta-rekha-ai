import dotenv from 'dotenv';
import {createClient} from '@supabase/supabase-js';
import {azureConfig} from '../server/palm';
import {palmSystemPrompt} from '../server/palm-tradition';
import {budgetedAzureFetch} from '../server/ai-budget';
dotenv.config({path:'.env.local',quiet:true});
const ai=azureConfig()!;
const db=createClient(process.env.SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
const {data:budget,error}=await db.from('ai_budget').select('spent_microusd,reserved_microusd').single();
if(error || !budget || budget.spent_microusd+budget.reserved_microusd+2000000>10000000)throw new Error('The $10 total testing ceiling prevents this run.');
for(const roast of [false,true]) {
 const response=await budgetedAzureFetch(db)(ai.endpoint+'/openai/v1/chat/completions',{
  method:'POST',headers:{'api-key':ai.apiKey,'Content-Type':'application/json'},redirect:'error',signal:AbortSignal.timeout(90000),
  body:JSON.stringify({model:ai.deployment,temperature:0,max_completion_tokens:400,store:false,messages:[
   {role:'system',content:palmSystemPrompt(roast)+'\nEVALUATION OVERRIDE: This is a synthetic voice test, not a user photo. Instead of the full report, output only a 90–120 word inner-world excerpt using the supplied fictional observation. Keep the grounding and selected voice. Do not invent any other visible feature.'},
   {role:'user',content:'Fictional observation: a clearly visible head line crosses the middle of the palm and curves gently toward the outer lower palm. Apply HR2 only.'}
  ]})});
 if(!response.ok)throw new Error('Azure status '+response.status);
 const body=await response.json();
 if(body.choices?.[0]?.finish_reason!=='stop')throw new Error('Incomplete voice evaluation');
 console.log(roast?'ROAST':'NORMAL');console.log(body.choices[0].message.content);
}
