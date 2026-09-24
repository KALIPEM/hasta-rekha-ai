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
export function getShareLines(content:ReadingContent|null,_roast:boolean){
  return validShareLines(content?.shareLines)?content.shareLines:[];
}
export function shareCaption(text:string,roast:boolean,content:ReadingContent|null){
  const line=getShareLines(content,roast).find(line=>line.text===text);
  if(!line)throw new Error('Choose a caption from this reading.');
  return line.intro+'\n\n“'+text+'”\n\nGet your own reading: '+PUBLIC_APP_URL+'\n#HastaRekha';
}
