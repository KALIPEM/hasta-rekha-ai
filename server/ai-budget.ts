import type {SupabaseClient} from '@supabase/supabase-js';
import {HttpError} from './validation';

type BudgetDatabase = Pick<SupabaseClient, 'rpc'>;
export const APPROVED_MODEL = 'gpt-4.1-mini-2025-04-14';

// All app AI calls go through this wrapper. No local counters or cached balance.
export function budgetedAzureFetch(database: BudgetDatabase, network: typeof fetch = fetch): typeof fetch {
  return async (url, init) => {
    const reservation = await database.rpc('reserve_ai_request');
    if (reservation.error || typeof reservation.data !== 'string') {
      throw new HttpError(503, 'AI readings are paused because the spending limit was reached or could not be checked.');
    }
    // Do not retry, refund, or expire a reservation on network failure:
    // Azure may already have processed (and billed) the request.
    const response = await network(url, init);
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
