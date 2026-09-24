import type {ReadingContent} from '../types';
export interface ShareLine {theme:string;text:string;intro:string}
export const PUBLIC_APP_URL='https://hasta.sadhanaboard.com';
// Defense in depth, not a guarantee of semantic privacy.
export function validShareLines(value:unknown): value is ShareLine[] {
  return Array.isArray(value) && value.length===3 && value.every(line=>
    line && typeof line.theme==='string' && line.theme.trim().length>0 && line.theme.length<=50 &&
    typeof line.intro==='string' && line.intro.trim().length>=12 && line.intro.length<=160 &&
    typeof line.text==='string' && line.text.trim().length>=15 && line.text.length<=240 &&
    !/[\r\n<>]|https?:|www\.|@|\d{5,}/i.test(line.theme+' '+line.text+' '+line.intro)
  ) && new Set(value.map(line=>line.text.trim().toLowerCase())).size===3;
}
export function getShareLines(content:ReadingContent|null,roast:boolean){
  const saved:unknown=content?.shareLines;
  if(validShareLines(saved))return saved;
  // Saved captions predate generated intros. Preserve the original caption;
  // only add a plain attribution, never invent a replacement share suggestion.
  if(!Array.isArray(saved))return [];
  const legacy=saved.map(line=>line && line.intro===undefined
    ? {...line,intro:roast?'My AI palmist roasted me 💀🔥 — from my Hasta Rekha reading:':'A line from a Hasta Rekha palm reading:'}
    : line);
  return validShareLines(legacy)?legacy:[];
}
export function shareCaption(text:string,roast:boolean,content:ReadingContent|null){
  const line=getShareLines(content,roast).find(line=>line.text===text);
  if(!line)throw new Error('Choose a caption from this reading.');
  return line.intro+'\n\n“'+text+'”\n\nGet your own reading: '+PUBLIC_APP_URL+'\n#HastaRekha';
}
