import type {ReadingContent} from '../types';

// Only reviewed, public-facing captions can leave through the share controls.
// Reading prose selects broad themes but is never interpolated into a caption.
const captions = [
  {theme:'Big ideas',match:/imagin|creativ|idea/i,normal:'A little imagination, a little courage, and room for my next chapter.',roast:'My ideas have a cinematic universe. My completed tasks have a cameo.'},
  {theme:'Overthinking',match:/overthink|possibilit|reflect|thinking/i,normal:'Making room for a thoughtful pause—and then a first step.',roast:'I asked my palm for direction. It asked me to stop holding a committee meeting for every decision.'},
  {theme:'Getting started',match:/procrastin|starting|start|planning/i,normal:'Small beginnings count. Today gets one real step.',roast:'My five-year plan is immaculate. Unfortunately, it’s been five years.'},
  {theme:'Boundaries',match:/boundar|people.pleas|saying no/i,normal:'Warm heart. Clear boundaries. Both can fit in the same hand.',roast:'My palm said set boundaries. I asked if that would inconvenience anyone.'},
  {theme:'High standards',match:/perfect|standard|detail/i,normal:'Leaving a little room for progress to be imperfect.',roast:'I don’t miss deadlines. I give perfectionism an extended residency.'},
  {theme:'Rest',match:/rest|balance|routine|pace/i,normal:'A slower moment can still be part of a meaningful day.',roast:'My to-do list needs a project manager. I need a snack and an unreasonable amount of applause.'},
  {theme:'Main character',match:/direction|ambition|purpose/i,normal:'Curious about what comes next, ready to help shape it.',roast:'Main-character energy. Loading-screen execution.'},
  {theme:'Connection',match:/connection|communication|relationship/i,normal:'More honest conversations. Less guessing what someone meant.',roast:'My palm reading and I have agreed: character development would be easier with a skip-intro button.'},
];
export function getShareLines(content:ReadingContent|null,roast:boolean){
  const context=content?.aspects.map(a=>a.summary+' '+a.detailedInterpretation).join(' ')||'';
  return captions.map((entry,index)=>({entry,index,score:entry.match.test(context)?1:0}))
    .sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,4)
    .map(({entry})=>({theme:entry.theme,text:roast?entry.roast:entry.normal}));
}
export function shareCaption(text:string,roast:boolean){
  // A caller cannot accidentally share report text, names, or titles.
  if(!captions.some(c=>(roast?c.roast:c.normal)===text))throw new Error('Choose one of the share-ready lines.');
  return text+'\n\nHasta Rekha · '+(roast?'A playful palm roast, not a fact about me.':'A palm-inspired reflection, not a prediction.')+' #HastaRekha';
}
