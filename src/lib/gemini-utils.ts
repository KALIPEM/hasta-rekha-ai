import { supabase } from './supabase-client';
import { parseReadingContent } from './reading-content';
export interface PalmImage {base64: string; mimeType: string}
export async function apiRequest(url: string, body?: unknown, signal?: AbortSignal) {
  const session = await supabase?.auth.getSession();
  const token = session?.data.session?.access_token;
  const response = await fetch(url, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {'Content-Type': 'application/json', ...(token ? {Authorization: `Bearer ${token}`} : {})},
    ...(body === undefined ? {} : {body: JSON.stringify(body)}), signal,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || 'The service could not complete your request. Please try again.');
  return data;
}
export async function generatePalmReading(images: PalmImage[], dominantHand: string, ageRange: string, mainFocus: string, isRoastMode = false, signal?: AbortSignal, title = 'My palm reading'): Promise<{readingText: string; savedReadingId?: string}> {
  const data = await apiRequest('/api/palm-reading', {images, dominantHand, ageRange, mainFocus, isRoastMode, title}, signal);
  return {readingText: JSON.stringify(parseReadingContent(data.content)), savedReadingId: data.savedReadingId};
}
