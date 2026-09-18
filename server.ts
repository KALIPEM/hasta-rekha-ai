import express from 'express';
import {createServer as createViteServer} from 'vite';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';
import {createApi} from './server/app';
dotenv.config({path:['.env.local','.env'],quiet:true});
async function startServer() {
  const app = createApi();
  const root = path.dirname(fileURLToPath(import.meta.url));
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({server:{middlewareMode:true},appType:'spa'});
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(root,'dist')));
    app.get('*', (_req,res) => res.sendFile(path.join(root,'dist','index.html')));
  }
  const port = Number(process.env.PORT || 3000);
  app.listen(port, process.env.HOST || '127.0.0.1', () => console.log('Hasta Rekha is ready at http://localhost:'+port));
}
startServer().catch(error => {console.error(error.message);process.exitCode = 1;});
