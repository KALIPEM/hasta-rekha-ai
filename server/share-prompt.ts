import {validShareLines} from '../src/lib/share-lines';
import {HttpError} from './validation';
export const shareLinesSchema={type:'array',items:{type:'object',properties:{theme:{type:'string'},text:{type:'string'},intro:{type:'string'}},required:['theme','text','intro'],additionalProperties:false}};
export const SHARE_PROMPT=`
SHAREABLE CAPTIONS
Generate exactly three original shareLines alongside this report, each with a short theme (50 characters maximum), a standalone text (15–240 characters), and a generated share intro (12–160 characters). Derive all three fields from a different specific theme you actually developed in this reading. These are creative captions, not factual claims about the person. Never select from a stock bank or copy examples. In roast mode create new, punchy jokes with concrete imagery and an unexpected ending; do not reuse the normal captions. In normal mode write vivid, memorable thoughts rather than generic motivational slogans.
The intro appears directly above the shared quote. Make every intro specific to its own caption. In roast mode each intro must begin exactly with “My AI palmist roasted me” and include one to three fitting emoji, then a distinct, funny continuation tied to the quote. In normal mode write a short, natural lead-in that makes clear this is a line from a palm reading, with a distinct detail from the caption rather than generic wording.
Frame every caption as something a palm reading said, using a third-person subject such as "This palm" or "The reading", and for couples "These palms". Do not address the recipient with "you", ask questions, request a reply, or use first-person dialogue that could sound like the sender is talking to the recipient. Make the context clear even without the report.
Use only harmless everyday themes like imagination, planning, patience, rest, ambition or communication. No names, ages, contact details, locations, identifiers, photo descriptions, private biography, health, sexual details, money amounts, debt, relationship status, accusations, sensitive traits or predictions of harm. No links, handles, markup or newlines. Do not include the report title. Check all three for privacy, distinctness and relevance before returning them.`;
export function requireShareLines(value:unknown){
  if(!validShareLines(value))throw new HttpError(502,'The shareable captions were incomplete. Please try again.');
  return value;
}
