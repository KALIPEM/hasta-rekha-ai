import dotenv from 'dotenv';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import {azureConfig,readPalm,roastPalmReading} from '../server/palm';
import type {ReadingContent} from '../src/types';
import {budgetedAzureFetch} from '../server/ai-budget';
import {validatePhotoQuality} from '../server/photo-quality';
dotenv.config({path:'.env.local',quiet:true});
const paths=process.argv.slice(2);
if(paths.length<1 || paths.length>2)throw new Error('Supply one or two authorized JPEG photo paths.');
const images=await Promise.all(paths.map(async path=>({mimeType:'image/jpeg',base64:(await readFile(path)).toString('base64')})));
await validatePhotoQuality(images);
console.log('Both photo-quality checks passed.');
const ai=azureConfig()!;
const db=createClient(process.env.SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
const before=await db.from('ai_budget').select('spent_microusd,reserved_microusd').single();
if(before.error)throw new Error(before.error.message);
// Each guarded inference reserves at most $1. Include all existing app usage
// conservatively so prior tests cannot be forgotten across restarts.
const modes=process.env.TEST_READING_MODE==='roast'?[true]:process.env.TEST_READING_MODE==='normal'?[false]:[false,true];
const maxCalls=process.env.TEST_READING_MODE==='normal'?3:5;
const testCeiling=10000000;
if(before.data.spent_microusd+before.data.reserved_microusd+maxCalls*1000000>testCeiling) {
 throw new Error('Test stopped: existing usage plus the worst-case test allowance exceeds the $10 testing ceiling.');
}
let calls=0;
const guarded=budgetedAzureFetch(db);
const testFetch:typeof fetch=async(url,init)=>{
 if(++calls>maxCalls)throw new Error('Test call limit reached; no further Azure requests permitted.');
 return guarded(url,init);
};
await mkdir('test-results',{recursive:true});
let normal:ReadingContent|undefined;
for(const isRoastMode of modes) {
 const mode=isRoastMode?'roast':'normal';
 console.log('Generating '+mode+' reading...');
 const result=isRoastMode && normal ? await roastPalmReading(normal,ai,testFetch) : await readPalm({images,dominantHand:'Not supplied; do not infer dominance',ageRange:'Prefer not to say',mainFocus:'Overall life path',isRoastMode},ai,testFetch);
 if(!isRoastMode)normal=result;
 const markdown=['# '+(isRoastMode?'Roast':'Normal')+' reading test','Generated from the two user-supplied photos. Dominant hand and age were not supplied. Traditional symbolism and entertainment, not factual personality assessment.',result.openingHook,result.executiveSummary,...result.aspects.flatMap(a=>['## '+a.aspectName,a.summary,a.detailedInterpretation,'**Palm evidence:** '+a.palmEvidence]),...(result.lifeAreas ?? []).flatMap(area=>['## '+area.title,area.summary,...area.questions.flatMap(q=>['### '+q.question,q.answer]),'**Watch out for:** '+area.watchOutFor,'**Try this:** '+area.nextStep,'*'+area.basis+'*']),'## Reflection prompts',...result.lifeTimeline.map(t=>'**'+t.ageRange+':** '+t.keyEventOrShift),'## Try this',...result.recommendedActions.map(a=>'- '+a)].join('\n\n');
 await writeFile('test-results/'+mode+'-reading.md',markdown);
 console.log(JSON.stringify({mode,quality:result.imageQualityCheck,opening:result.openingHook,aspects:result.aspects,actions:result.recommendedActions,lifeAreas:result.lifeAreas}));
}
const after=await db.from('ai_budget').select('spent_microusd,reserved_microusd').single();
if(after.error)throw new Error(after.error.message);
console.log('Buffered test cost USD:',(after.data.spent_microusd-before.data.spent_microusd)/1e6,'Pending reservation change USD:',(after.data.reserved_microusd-before.data.reserved_microusd)/1e6);
console.log('Total app ledger including all earlier tests USD:',(after.data.spent_microusd+after.data.reserved_microusd)/1e6);
