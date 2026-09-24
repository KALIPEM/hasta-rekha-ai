import type {SupabaseClient} from '@supabase/supabase-js';
import {HttpError} from './validation';
import {setTimeout as delay} from 'node:timers/promises';

type BudgetDatabase = Pick<SupabaseClient, 'rpc'>;
export const APPROVED_MODEL = 'gpt-4.1-mini-2025-04-14';

// All app AI calls go through this wrapper. No local counters or cached balance.
export function budgetedAzureFetch(database: BudgetDatabase, network: typeof fetch = fetch, wait: (ms:number,signal?:AbortSignal)=>Promise<void> = async(ms,signal)=>{await delay(ms,undefined,{signal});}): typeof fetch {
  return async (url, init) => {
    const reservation = await database.rpc('reserve_ai_request');
    if (reservation.error || typeof reservation.data !== 'string') {
      throw new HttpError(503, 'AI readings are paused because the spending limit was reached or could not be checked.');
    }
    // Do not retry, refund, or expire a reservation on network failure:
    // Azure may already have processed (and billed) the request.
    let response = await network(url, init);
    // Only an explicit throttling rejection may retry. Keep the same budget
    // reservation and stage; never replay earlier successful report stages.
    if(response.status===429){
      const seconds=azureRetrySeconds(response);
      if(seconds<=60 && !init?.signal?.aborted){
        await response.body?.cancel();
        await wait(seconds*1000,init?.signal ?? undefined);
        init?.signal?.throwIfAborted();
        response=await network(url,init);
      }
      if(response.status===429){
        const retryAfter=azureRetrySeconds(response);
        console.warn(JSON.stringify({event:'azure_throttled',retryAfterSeconds:retryAfter}));
        throw new HttpError(429,`Azure is temporarily limiting reading requests. Please wait ${retryAfter} seconds before trying again. No reading credit was used for this attempt.`,retryAfter,'AI_RATE_LIMITED');
      }
    }
    if (response.ok) {
      const body = await response.clone().json().catch(() => null);
      const usage = body?.usage;
      if (body?.model !== APPROVED_MODEL || !Number.isSafeInteger(usage?.prompt_tokens) || !Number.isSafeInteger(usage?.completion_tokens) || usage.prompt_tokens < 0 || usage.prompt_tokens > 1047576 || usage.completion_tokens < 0 || usage.completion_tokens > 3000) {
        await database.rpc('pause_ai_budget');
        throw new HttpError(503, 'AI readings are paused while the service usage is reviewed.');
      }
      const settled = await database.rpc('settle_ai_request', {p_id:reservation.data,p_prompt_tokens:usage.prompt_tokens,p_completion_tokens:usage.completion_tokens});
      if (settled.error) throw new HttpError(503, 'AI usage could not be recorded. The reserved budget remains protected.');
      // Return the validated body already consumed above. A slow database
      // settlement must not leave callers reading an expired fetch stream.
      return new Response(JSON.stringify(body),{status:response.status,headers:{'Content-Type':'application/json'}});
    }
    return response;
  };
}

export function azureRetrySeconds(response:Response,now=Date.now()):number {
  const ms=response.headers.get('retry-after-ms');
  if(ms!==null && ms.trim() && Number.isFinite(Number(ms)) && Number(ms)>=0)return Math.max(1,Math.ceil(Number(ms)/1000));
  const value=response.headers.get('retry-after');
  if(value!==null && value.trim()){
    const seconds=Number(value);
    if(Number.isFinite(seconds) && seconds>=0)return Math.max(1,Math.ceil(seconds));
    const date=Date.parse(value);
    if(Number.isFinite(date))return Math.max(1,Math.ceil((date-now)/1000));
  }
  return 60;
}
