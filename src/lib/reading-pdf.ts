import {PUBLIC_APP_URL} from './share-lines';
import './reading-pdf.css';

// Clone the rendered report so PDF layout stays in sync with the web reading.
// The live report's disclosure state, title editor and sharing controls stay intact.
export function createPrintableReading(source:HTMLElement,title:string):HTMLElement {
  const report=source.cloneNode(true) as HTMLElement;
  report.querySelectorAll('.report-toolbar, .excerpt-entry, .modal-backdrop, .notice, button, .report-jump-links').forEach(node=>node.remove());
  const editor=report.querySelector('.title-editor');
  if(editor){const heading=document.createElement('h1');heading.textContent=title;editor.replaceWith(heading);}
  report.querySelectorAll('details').forEach(details=>{
    details.open=true;
    details.querySelector('.life-area-toggle')?.remove();
  });
  report.querySelectorAll('a[href]').forEach(link=>{
    const href=link.getAttribute('href')||'';
    if(!/^https?:\/\//i.test(href))link.removeAttribute('href');
  });
  const root=document.createElement('div');root.className='reading-pdf-root';
  const brand=document.createElement('header');brand.className='pdf-brand';
  const home=document.createElement('a');home.href=PUBLIC_APP_URL;home.textContent='hasta rekha';
  const subtitle=document.createElement('span');subtitle.textContent='THE WISDOM WITHIN';
  brand.append(home,subtitle);
  const footer=document.createElement('footer');footer.className='pdf-backlink';
  const back=document.createElement('a');back.href=PUBLIC_APP_URL;back.textContent='Get your own reading at hasta.sadhanaboard.com';
  footer.append(back);root.append(brand,report,footer);
  return root;
}

let cleanupPrevious:(()=>void)|undefined;
export async function printReadingPdf(source:HTMLElement,title:string):Promise<void> {
  cleanupPrevious?.();
  await document.fonts.ready;
  const root=createPrintableReading(source,title);
  const previousTitle=document.title;
  const cleanup=()=>{
    root.remove();document.body.classList.remove('printing-reading');document.title=previousTitle;
    window.removeEventListener('afterprint',cleanup);cleanupPrevious=undefined;
  };
  cleanupPrevious=cleanup;
  document.title=(title.trim()||'My palm reading')+' - Hasta Rekha';
  document.body.append(root);document.body.classList.add('printing-reading');
  window.addEventListener('afterprint',cleanup,{once:true});
  try {window.print();}catch(error){cleanup();throw error;}
}
