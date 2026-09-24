import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
dotenv.config({path:['.env.local','.env'],quiet:true});
const allowed=new Set(['VITE_SUPABASE_URL','VITE_SUPABASE_ANON_KEY','VITE_EXCERPT_SHARING']);
if(process.env.VITE_EXCERPT_SHARING && !['true','false'].includes(process.env.VITE_EXCERPT_SHARING))throw new Error('VITE_EXCERPT_SHARING must be true or false.');
for(const name of Object.keys(process.env)){
  if(name.startsWith('VITE_')&&!allowed.has(name))throw new Error(`Unapproved browser environment variable: ${name}`);
}
const publicKey=process.env.VITE_SUPABASE_ANON_KEY||'';
let role='';
try{role=JSON.parse(Buffer.from(publicKey.split('.')[1]||'','base64url').toString()).role;}catch{}
if(publicKey.startsWith('sb_secret_')||role==='service_role')throw new Error('A privileged Supabase key was configured as a browser key.');
const secrets=['AZURE_OPENAI_API_KEY','SUPABASE_SERVICE_ROLE_KEY','RAZORPAY_KEY_SECRET','RAZORPAY_WEBHOOK_SECRET'].map(k=>process.env[k]).filter(v=>v&&v.length>=8);
function scan(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){
  const file=path.join(dir,item.name);
  if(item.isDirectory()){scan(file);continue;}
  if(item.name.startsWith('.env'))throw new Error('Environment file found in public output.');
  const data=fs.readFileSync(file).toString();
  if(secrets.some(secret=>data.includes(secret))||/sb_secret_[A-Za-z0-9_-]{15,}/.test(data))throw new Error('Server secret detected in browser output. Deployment blocked.');
}}
scan('dist');
console.log('Browser build secret check passed.');
