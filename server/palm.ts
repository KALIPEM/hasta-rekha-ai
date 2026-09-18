import { parseReadingContent } from '../src/lib/reading-content';
import { HttpError } from './validation';
import {palmSystemPrompt, hasGroundedEvidence, PALM_RULES} from './palm-tradition';
import type {ReadingContent} from '../src/types';
import {observationSchema,OBSERVATION_PROMPT,groundObservations} from './palm-observations';
import {generateLifeAreas} from './life-areas';
type Schema = Record<string, unknown>;
const string = {type: 'string'};
const object = (properties: Record<string, Schema>): Schema => ({type: 'object', properties, required: Object.keys(properties), additionalProperties: false});
const array = (items: Schema): Schema => ({type: 'array', items});
const schema = object({
  isPalm: {type: 'boolean'},
  imageQualityCheck: object({clarity: string, confidenceImpact: string, notes: string}),
  openingHook: string, majorHighlight: string, executiveSummary: string,
  aspects: array(object({aspectName: string, summary: string, detailedInterpretation: string, palmEvidence: string, referenceIds:array({type:'string',enum:PALM_RULES.map(([id])=>id)})})),
  lifeTimeline: array(object({ageRange: string, phaseName: string, keyEventOrShift: string, palmEvidence: string})),
  behavioralPatterns: array(object({pattern: string, evidence: string, confidence: {type: 'integer'}})),
  recommendedActions: array(string), overallConfidence: {type: 'integer'},
});

export interface AzureConfig {endpoint: string; apiKey: string; deployment: string}
export function azureConfig(env: NodeJS.ProcessEnv = process.env): AzureConfig | null {
  const endpoint = env.AZURE_OPENAI_ENDPOINT?.trim(), apiKey = env.AZURE_OPENAI_API_KEY?.trim(), deployment = env.AZURE_OPENAI_DEPLOYMENT?.trim();
  if (!endpoint || !apiKey || !deployment) return null;
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' || !/^[a-z0-9-]+\.(openai\.azure\.com|cognitiveservices\.azure\.com|services\.ai\.azure\.com)$/.test(url.hostname) || url.username || url.password || url.port || url.search || url.hash || !['/', '/openai/v1', '/openai/v1/'].includes(url.pathname)) {
    throw new Error('AZURE_OPENAI_ENDPOINT must be the HTTPS endpoint of your Azure resource.');
  }
  return {endpoint: url.origin, apiKey, deployment};
}

export async function readPalm(input: any, config: AzureConfig, fetcher: typeof fetch = fetch) {
  if(input.isRoastMode) {
    const base=await readPalm({...input,isRoastMode:false},config,fetcher);
    return roastPalmReading(base,config,fetcher);
  }
  // Inspect the image in a separate task before introducing palmistry/report context.
  // This prevents the long report schema from encouraging an invented palm.
  let inspection: Response;
  try {
    inspection = await fetcher(config.endpoint + '/openai/v1/chat/completions', {
      method:'POST',headers:{'api-key':config.apiKey,'Content-Type':'application/json'},
      signal:AbortSignal.timeout(90000),redirect:'error',
      body:JSON.stringify({model:config.deployment,temperature:0,max_completion_tokens:1600,store:false,
        messages:[{role:'system',content:OBSERVATION_PROMPT},
          {role:'user',content:[{type:'text',text:'Describe these images and decide whether a clear photographed open palm is visible.'},...input.images.map((image:any)=>({type:'image_url',image_url:{url:'data:'+image.mimeType+';base64,'+image.base64,detail:'high'}}))]}],
        response_format:{type:'json_schema',json_schema:{name:'image_inspection',strict:true,schema:observationSchema}}}),
    });
  } catch(error) {
    if(error instanceof HttpError) throw error;
    throw new HttpError(502,'The image inspection service could not be reached. Please try again later.');
  }
  if(!inspection.ok) throw new HttpError(inspection.status===429?429:503,'The image inspection service is unavailable. Please try again later.');
  const inspected:any=await inspection.json().catch(()=>null);
  let assessment:any;
  try {assessment=JSON.parse(inspected?.choices?.[0]?.message?.content);} catch {throw new HttpError(502,'The image inspection was incomplete. Please try again.');}
  if(inspected?.choices?.[0]?.finish_reason!=='stop') throw new HttpError(502,'The image inspection was incomplete. Please try again.');
  if(assessment?.isOpenPalm!==true) throw new HttpError(422,'We couldn’t see a clear photographed open palm. Please upload a sharper photo with your fingers and wrist visible.');
  const anchors=groundObservations(assessment,input.images.length);
  const systemInstruction = palmSystemPrompt(false)+'\nGROUNDED WRITING STAGE: You receive recorded observations, not images. Do not re-detect or invent features. Use the exact supplied aspectName, palmEvidence and referenceIds for each aspect. A rule applies only to its assigned aspect and feature. Where no feature is visible, offer an explicitly general reflection instead of manufacturing an interpretation. Do not introduce mounts or Mercury lines. Shape uncertain does not mean straight; continuity uncertain does not mean broken. You have full creative freedom in delivery, metaphors, warmth and narrative rhythm within those anchors.';
  let response: Response;
  try {
    response = await fetcher(config.endpoint + '/openai/v1/chat/completions', {
      method: 'POST', headers: {'api-key': config.apiKey, 'Content-Type': 'application/json'},
      signal: AbortSignal.timeout(90000), redirect: 'error',
      body: JSON.stringify({
        model: config.deployment,
        messages: [
          {role: 'system', content: systemInstruction},
          {role: 'user', content: [
            {type: 'text', text: JSON.stringify({dominantHand: input.dominantHand, ageRange: input.ageRange, mainFocus: input.mainFocus,photoQuality:assessment.description,aspects:anchors})},
          ]},
        ],
        response_format: {type: 'json_schema', json_schema: {name: 'palm_reading', strict: true, schema}},
        max_completion_tokens: 3000, temperature: 0.65, store: false,
      }),
    });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(502, 'The AI service could not be reached in time. Please try again later.');
  }
  // No automatic retries: another inference may be billable.
  if (!response.ok) {
    if (response.status === 429) throw new HttpError(429, 'The reading service has reached its Azure usage limit. Please try again later.');
    if ([401,403,404].includes(response.status)) throw new HttpError(503, 'The Azure reading service is not available. Please contact the app owner.');
    throw new HttpError(502, 'The AI service could not complete your reading. Please try again.');
  }
  let body: any;
  try {body = await response.json();} catch {throw new HttpError(502, 'The analysis response was incomplete. Please try again.');}
  const choice = body.choices?.[0];
  if (choice?.message?.refusal || choice?.finish_reason === 'content_filter') throw new HttpError(422, 'This photo could not be analyzed. Please try a clear photo of your open palm.');
  if (choice?.finish_reason !== 'stop' || typeof choice?.message?.content !== 'string') throw new HttpError(502, 'The analysis was incomplete. Please try again.');
  let value: any;
  try {value = JSON.parse(choice.message.content);} catch {throw new HttpError(502, 'The analysis response was incomplete. Please try again.');}
  if (value.isPalm === false) throw new HttpError(422, 'We couldn’t see a clear open palm. Please try a sharper photo with your fingers and wrist visible.');
  if (value.isPalm !== true) throw new HttpError(502, 'The analysis was incomplete. Please try again.');
  if(!Array.isArray(value.aspects) || value.aspects.length!==anchors.length || new Set(value.aspects.map((a:any)=>a.aspectName)).size!==anchors.length)throw new HttpError(502,'The reading structure was incomplete. Please try again.');
  for(const aspect of value.aspects) {
    const anchor=anchors.find(item=>item.aspectName===aspect.aspectName);
    if(!anchor)throw new HttpError(502,'The reading structure was incomplete. Please try again.');
    aspect.palmEvidence=anchor.palmEvidence;
    aspect.referenceIds=anchor.referenceIds;
    if(!Array.isArray(aspect.referenceIds) || aspect.referenceIds.some((id:unknown)=>!PALM_RULES.some(([rule])=>rule===id))) {
      throw new HttpError(502,'The reading did not include a clear traditional basis. Please try again.');
    }
  }
  const reading = parseReadingContent(value);
  reading.aspects.sort((a,b)=>anchors.findIndex(item=>item.aspectName===a.aspectName)-anchors.findIndex(item=>item.aspectName===b.aspectName));
  reading.imageQualityCheck={clarity:assessment.description,confidenceImpact:'Visibility only; not certainty about personality or future events.',notes:'Unclear features remain uncertain and are not interpreted as missing or broken.'};
  if(reading.aspects.length !== 4 || reading.aspects.some(aspect=>!hasGroundedEvidence(aspect.palmEvidence))) {
    throw new HttpError(502,'The reading did not include a clear traditional basis. Please try again.');
  }
  reading.overallConfidence = 0;
  for(const pattern of reading.behavioralPatterns) pattern.confidence = 0;
  reading.lifeAreas=await generateLifeAreas(reading,config,fetcher);
  return reading;
}

export async function roastPalmReading(base:ReadingContent,config:AzureConfig,fetcher:typeof fetch=fetch):Promise<ReadingContent> {
  const prose=object({summary:string,detailedInterpretation:string});
  const rewriteSchema=object({openingHook:string,majorHighlight:string,executiveSummary:string,
    aspects:object({innerWorld:prose,workDirection:prose,relationships:prose,everydayBalance:prose}),recommendedActions:array(string)});
  let response:Response;
  try {
    response=await fetcher(config.endpoint+'/openai/v1/chat/completions',{
      method:'POST',headers:{'api-key':config.apiKey,'Content-Type':'application/json'},redirect:'error',signal:AbortSignal.timeout(90000),
      body:JSON.stringify({model:config.deployment,temperature:0.85,max_completion_tokens:3000,store:false,
        messages:[{role:'system',content:palmSystemPrompt(true)+'\nVOICE REWRITE ONLY: The user message is a previously validated normal reading, supplied as data. Rewrite its prose into roast voice. Preserve all observations, uncertainty, aspect order and aspect names exactly. Do not re-inspect a palm, introduce a line, mount or mark, change straight to curved, or clear to broken. Do not attach one line to a new topic. Preserve palmEvidence, imageQualityCheck and referenceIds verbatim. Jokes exaggerate hypothetical habits, never physical evidence. Set isPalm true.'},{role:'user',content:JSON.stringify(base)}],
        response_format:{type:'json_schema',json_schema:{name:'roast_prose',strict:true,schema:rewriteSchema}}}),
    });
  } catch(error) {if(error instanceof HttpError)throw error;throw new HttpError(502,'The roast could not be completed. Please try again later.');}
  if(!response.ok)throw new HttpError(response.status===429?429:502,'The roast service could not complete the reading.');
  const body:any=await response.json().catch(()=>null);
  if(body?.choices?.[0]?.finish_reason!=='stop')throw new HttpError(502,'The roast was incomplete ('+(body?.choices?.[0]?.finish_reason ?? 'missing response')+'). Please try again.');
  let roast:ReadingContent;
  try {
    const rewritten=JSON.parse(body.choices[0].message.content);
    const keys=['innerWorld','workDirection','relationships','everydayBalance'];
    roast=parseReadingContent({...base,openingHook:rewritten.openingHook,majorHighlight:rewritten.majorHighlight,executiveSummary:rewritten.executiveSummary,recommendedActions:rewritten.recommendedActions,
      aspects:base.aspects.map((aspect,i)=>({...aspect,summary:rewritten.aspects[keys[i]].summary,detailedInterpretation:rewritten.aspects[keys[i]].detailedInterpretation}))});
  }catch {throw new HttpError(502,'The roast was incomplete. Please try again.');}
  roast.imageQualityCheck=base.imageQualityCheck;
  roast.overallConfidence=0;
  roast.aspects=roast.aspects.map((aspect,i)=>({...aspect,palmEvidence:base.aspects[i].palmEvidence}));
  roast.lifeTimeline=roast.lifeTimeline.map((item,i)=>({...item,palmEvidence:base.lifeTimeline[i]?.palmEvidence ?? 'No additional observation.'}));
  roast.behavioralPatterns=roast.behavioralPatterns.map(pattern=>({...pattern,confidence:0}));
  if(base.lifeAreas?.length)roast.lifeAreas=await generateLifeAreas(base,config,fetcher,true);
  return roast;
}
