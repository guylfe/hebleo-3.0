import http from 'node:http';
import {GoogleAuth,windowsCredentialVault} from './google-auth.js';
import {GoogleSourceTransport} from './google-source.js';
import {SourceAuthoring} from './source-authoring.js';
import {parseStrictJSON} from './source-utils.js';
import { readFile, stat, realpath } from 'node:fs/promises';
import { mkdirSync, createReadStream } from 'node:fs';
import { resolve, dirname, relative, isAbsolute, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store, DomainError } from './store.js';
import { help } from './tutor.js';
import { demoBuildFingerprint } from './demo-build.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
// Fresh demo progress is an explicit demo-only switch: npm start passes the flag; watch mode and tests do not.
export const demoFreshProgressEnabled = (argv = process.argv, env = process.env) => argv.includes('--demo-fresh-progress') || env.HEBLEO_DEMO_FRESH_PROGRESS === '1';
// Runs once before listening. A running server never re-fingerprints, so saving files mid-session cannot wipe new progress.
export async function prepareDemoProgress(store, { enabled = demoFreshProgressEnabled(), fingerprint = demoBuildFingerprint } = {}) { return enabled ? store.resetDemoProgressForBuild(await fingerprint()) : false; }
export function createServer(store, { mediaRoot = resolve(root, 'uploads'),sourceAuth,sourceTransport,sourceClock,developerAudit=false } = {}) {
  store.media.bindRoot(mediaRoot);
  const auth=sourceAuth||new GoogleAuth({vault:windowsCredentialVault(resolve(root,'.private','google-auth.bin'))});
  const sources=new SourceAuthoring(store,{auth,transport:sourceTransport||new GoogleSourceTransport({auth}),...(sourceClock?{clock:sourceClock}:{})});
  sources.validatePersistent();
  const server=http.createServer(async (req, res) => {
    const headers = { 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self' https: data:; media-src 'self' https: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'", 'Referrer-Policy': 'no-referrer' };
    const json = (status, data) => { res.writeHead(status, { ...headers, 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      let host; try { host = new URL('http://' + req.headers.host).hostname; } catch { throw new DomainError('Invalid host.', 403); }
      if (!['localhost', '127.0.0.1', '[::1]'].includes(host)) throw new DomainError('This demonstration is available only on localhost.', 403);
      if (req.headers.origin && req.headers.origin !== 'http://' + req.headers.host) throw new DomainError('Cross-origin requests are not allowed.', 403);
      const sourceCookie=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('hebleo-source='))?.slice(14)||null;
      if(url.pathname==='/oauth/google/callback'&&req.method==='GET'){if(url.searchParams.has('error'))auth.cancel({state:url.searchParams.get('state'),error:url.searchParams.get('error')});const result=await auth.finish({state:url.searchParams.get('state'),code:url.searchParams.get('code')});const cookie=sources.establishSession(result);res.writeHead(200,{...headers,'Content-Type':'text/html; charset=utf-8','Set-Cookie':'hebleo-source='+cookie+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800'});return res.end('<!doctype html><html lang="en"><meta charset="utf-8"><title>Hebleo Google connection</title><p>Application Google connection verified. Return to Studio and refresh connection status. No content was changed.</p><a href="/">Return to Hebleo</a></html>');}
      if (url.pathname === '/api/health' && req.method === 'GET') return json(200, { ok: true, demo: true });
      if (url.pathname.startsWith('/api/')) {
        const userId = req.headers['x-demo-user'] || 'learner-demo'; store.learner(userId);
        if (req.method === 'GET') {
          if(url.pathname==='/api/studio/media/status'){store.requireAuthor(userId);return json(200,store.media.status(store.currentDraft()?.content||store.snapshot()));}
          if(url.pathname==='/api/studio/sources/auth/setup'){store.requireAuthor(userId);return json(200,auth.setup('http://127.0.0.1:'+server.address().port+'/oauth/google/callback'));}
          if(url.pathname==='/api/studio/sources/status'){store.requireAuthor(userId);return json(200,sources.status(userId,sourceCookie));}
          if (url.pathname === '/api/bootstrap') return json(200, store.bootstrap(userId));
          if (url.pathname === '/api/session') return json(200,store.session(userId,url.searchParams.get('lessonId')));
          if(url.pathname==='/api/debug/questions'){if(!developerAudit)return json(404,{error:'Not found.',code:'NOT_FOUND'});return json(200,store.questionAudit(userId));}
          if (url.pathname === '/api/questions') return json(200,store.questions(userId));
          if (url.pathname === '/api/reports') return json(200,store.reports(userId));
          if (['/api/studio','/api/export','/api/content'].includes(url.pathname)) store.requireAuthor(userId);
          if (url.pathname === '/api/studio') return json(200, { ...store.active(), preview: store.preview() });
          if (url.pathname === '/api/export') return json(200, store.backup());
          if (url.pathname === '/api/content') return json(200, store.snapshot());
        }
        if (req.method === 'POST') {
          if (!String(req.headers['content-type']).startsWith('application/json')) throw new DomainError('JSON content type required.', 415);
          // Backups carry every referenced revision, so restore gets a larger bound than ordinary edits.
          const chunks = []; let bytes = 0; const limit = url.pathname === '/api/restore' ? 200000000 : url.pathname==='/api/studio/media/import'?30000000:url.pathname.startsWith('/api/studio/sources/')?20000000:750000;
          for await (const chunk of req) { bytes += chunk.length; if (bytes > limit) throw new DomainError('Request exceeds the local import limit.', 413); chunks.push(chunk); }
          let input; try { input = parseStrictJSON(Buffer.concat(chunks).toString()); } catch { throw new DomainError('Malformed JSON.'); }
          if (!input || typeof input !== 'object' || Array.isArray(input)) throw new DomainError('Expected a JSON object.');
          if (url.pathname.startsWith('/api/studio/') || ['/api/restore','/api/reports/resolve','/api/questions/answer','/api/questions/moderate'].includes(url.pathname)) store.requireAuthor(userId);
          if(url.pathname==='/api/studio/media/import')return json(200,store.media.importAsset(userId,input));
          if(url.pathname.startsWith('/api/studio/sources/')){const action=url.pathname.slice('/api/studio/sources/'.length);
            if(action==='auth/configure'){const status=auth.configureClient(input.clientJSON);sources.sessions.clear();return json(200,status);}
            if(action==='auth/begin')return json(200,auth.begin({...input,authorId:userId,redirectUri:'http://127.0.0.1:'+server.address().port+'/oauth/google/callback'}));
            if(action==='auth/disconnect'){const session=sources.session(sourceCookie,userId);if(input.connectionSlot!==session.connectionSlot)throw new DomainError('Connection slot differs.',403);sources.sessions.clear();return json(200,auth.disconnect(input.connectionSlot));}
            const session=sources.session(sourceCookie,userId);if(['register','refreshPreview','resolveReview','discardReview','stageSourceReview','publishStagedSource','rollbackSourceRevision','approveStagedSource'].includes(action))return json(200,await sources[action](userId,input,session));
          }
          if (url.pathname === '/api/progress') return json(200, store.saveProgress(userId,input));
          if (url.pathname === '/api/session/latest') return json(200,store.startLatestLesson(userId,input.lessonId));
          if (url.pathname === '/api/practice') return json(200,store.practice(userId,input));
          if (url.pathname === '/api/report') return json(200,store.report(userId,input));
          if (url.pathname === '/api/reports/resolve') return json(200,store.resolveReport(userId,input));
          if (url.pathname === '/api/questions') return json(200,store.askQuestion(userId,input));
          if (url.pathname === '/api/questions/answer') return json(200,store.answerQuestion(userId,input));
          if (url.pathname === '/api/questions/moderate') return json(200,store.moderateQuestion(userId,input));
          if (url.pathname === '/api/help') return json(200,await help(store,userId,input));
          if (url.pathname === '/api/review/undo') return json(200,store.undoReview(userId,input));
          if (url.pathname === '/api/preferences') return json(200, store.updateLearner(userId, input));
          if (url.pathname === '/api/attempt') return json(200, store.attempt(userId, input));
          if (url.pathname === '/api/review') return json(200, store.review(userId, input));
          if (url.pathname === '/api/enroll') return json(200, store.enroll(userId, input.wordId));
          if (url.pathname === '/api/studio/impact') return json(200,store.workspaceImpact(input));
          if (url.pathname === '/api/studio/dependencies') return json(200,store.exerciseDependencies(input));
          if (url.pathname === '/api/studio/draft') return json(200, store.stage(input));
          if (url.pathname === '/api/studio/publish') return json(200, store.publish(input.baseRevisionId, input.draftToken));
          if (url.pathname === '/api/studio/rollback') return json(200, store.rollback(input.revisionId, input.baseRevisionId, input.expectedDraftToken));
          // Author rehearsal: read-only against one exact draft token; no learner record is touched.
          if (url.pathname === '/api/studio/preview/session') return json(200, store.previewSession(input));
          if (url.pathname === '/api/studio/preview/evaluate') return json(200, store.previewEvaluate(input));
          if (url.pathname === '/api/demo/event') return json(200, store.entitlement(userId, input));
          if (url.pathname === '/api/restore') return json(200, store.restore(input));
        }
        return json(404, { error: 'API endpoint not found.', code: 'NOT_FOUND' });
      }
      if (url.pathname.startsWith('/media/') && ['GET','HEAD'].includes(req.method)) {
        let stored;try{stored=store.media.resolveLocal(url.pathname);}catch(error){if(error.code==='MEDIA_PATH')throw new DomainError('Media not found.',404,'NOT_FOUND');throw error;}if(stored){let start=0,end=stored.byteLength-1,status=200;if(req.headers.range){const range=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);if(!range||(!range[1]&&!range[2])){res.writeHead(416,{...headers,'Content-Range':'bytes */'+stored.byteLength});return res.end();}start=range[1]?Number(range[1]):Math.max(0,stored.byteLength-Number(range[2]));end=range[1]&&range[2]?Math.min(end,Number(range[2])):end;if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=stored.byteLength){res.writeHead(416,{...headers,'Content-Range':'bytes */'+stored.byteLength});return res.end();}status=206;}res.writeHead(status,{...headers,'Content-Type':stored.mimeType,'Content-Length':end-start+1,'Accept-Ranges':'bytes',...(status===206?{'Content-Range':'bytes '+start+'-'+end+'/'+stored.byteLength}:{})});return res.end(req.method==='HEAD'?undefined:stored.bytes.subarray(start,end+1));}
        const mediaTypes={'.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg','.m4a':'audio/mp4','.mp4':'video/mp4','.webm':'video/webm','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.pdf':'application/pdf'};
        const name=url.pathname.slice(7),type=mediaTypes[extname(name).toLowerCase()];
        if(!type || !/^[A-Za-z0-9_./-]+$/.test(name) || name.includes('..'))throw new DomainError('Media not found.',404);
        let file,base;
        try { base=await realpath(mediaRoot);file=await realpath(resolve(base,name)); } catch { throw new DomainError('Media not found.',404); }
        const path=relative(base,file);if(path.startsWith('..') || isAbsolute(path))throw new DomainError('Media not found.',404);
        const info=await stat(file);if(!info.isFile())throw new DomainError('Media not found.',404);
        let start=0,end=info.size-1,status=200;
        if(req.headers.range){
          const range=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
          if(!range || !info.size || (!range[1]&&!range[2])){res.writeHead(416,{...headers,'Content-Range':'bytes */'+info.size});return res.end();}
          start=range[1]?Number(range[1]):Math.max(0,info.size-Number(range[2]));end=range[1]&&range[2]?Math.min(end,Number(range[2])):end;
          if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=info.size){res.writeHead(416,{...headers,'Content-Range':'bytes */'+info.size});return res.end();}
          status=206;
        }
        res.writeHead(status,{...headers,'Content-Type':type,'Accept-Ranges':'bytes','Content-Length':Math.max(0,end-start+1),...(status===206?{'Content-Range':`bytes ${start}-${end}/${info.size}`}:{})});
        if(req.method==='HEAD'||!info.size)return res.end();
        const stream=createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);return;
      }
      if (req.method !== 'GET') return json(405, { error: 'Method not allowed.', code: 'METHOD_NOT_ALLOWED' });
      const allowed = { '/assets/hebleo-wide-navy.png':'assets/hebleo-wide-navy.png', '/': 'index.html','/google-setup':'google-setup.html','/google-setup.html':'google-setup.html','/google-setup.js':'google-setup.js','/studio/media-library.js':'studio/media-library.js','/studio/media-library.css':'studio/media-library.css', '/app.js': 'app.js', '/content.js': 'content.js', '/course.js':'course.js', '/vocabulary-import.js':'vocabulary-import.js', '/studio/markdown-editor.js':'studio/markdown-editor.js', '/studio/vocabulary-browser.js':'studio/vocabulary-browser.js', '/studio/vendor/easymde.min.js':'studio/vendor/easymde.min.js', '/studio/vendor/easymde.min.css':'studio/vendor/easymde.min.css', '/answer-policy.js':'answer-policy.js', '/review-schedule.js':'review-schedule.js', '/ux.js': 'ux.js', '/media.js': 'media.js', '/styles.css': 'styles.css', '/refinement.css':'refinement.css', '/rich.js':'rich.js', '/rich-browser.js':'rich-browser.js', '/interactions.js':'interactions.js', '/learner-view.js':'learner-view.js', '/preview/learner-renderer.js':'preview/learner-renderer.js', '/preview/lesson-preview.js':'preview/lesson-preview.js', '/studio/unified-studio.js':'studio/unified-studio.js', '/studio/selector-editor.js':'studio/selector-editor.js', '/studio/curriculum-editor.js':'studio/curriculum-editor.js', '/studio/import-workflow.js':'studio/import-workflow.js', '/studio/editor-fields.js':'studio/editor-fields.js', '/studio/lesson-editor.js':'studio/lesson-editor.js', '/studio/exercise-editor.js':'studio/exercise-editor.js', '/studio/import-review.js':'studio/import-review.js', '/studio/studio.css':'studio/studio.css','/studio/sources-editor.js':'studio/sources-editor.js','/studio/sources.css':'studio/sources.css', '/keyboard-owner.js':'keyboard-owner.js', '/keyboard-owner.css':'keyboard-owner.css', '/hebleo-lion-mark.svg':'hebleo-lion-mark.svg', '/vendor/marked.js':'../node_modules/marked/lib/marked.esm.js', '/vendor/purify.js':'../node_modules/dompurify/dist/purify.es.mjs' };
      if (!allowed[url.pathname]) return json(404, { error: 'Page not found.', code: 'NOT_FOUND' });
      const file = allowed[url.pathname]; const ext = url.pathname.startsWith('/vendor/') ? '.js' : '.' + file.split('.').pop();
      const body = await readFile(resolve(root, 'public', file));
      res.writeHead(200, { ...headers, 'Content-Type': types[ext] + (ext==='.png'?'':'; charset=utf-8') }); res.end(body);
    } catch (e) { json(e instanceof DomainError ? e.status : 500, e instanceof DomainError ? { error: e.message, code: e.code, ...e.details } : { error: 'Local server error. See terminal for details.', code: 'SERVER_ERROR' }); if (!(e instanceof DomainError)) console.error(e.message); }
  });
  server.sourceAuthoring=sources;return server;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  mkdirSync(resolve(root, 'data'), { recursive: true });
  const store = new Store(resolve(root, 'data', 'hebleo-demo.sqlite'));
  if (await prepareDemoProgress(store)) console.log('Fresh demo progress for this app build: fictional lesson/review progress cleared; settings and content kept.');
  const server = createServer(store,{developerAudit:process.argv.includes('--developer-audit')}); const port = Number(process.env.PORT || 4173);
  server.listen(port, '127.0.0.1', () => console.log('Hebleo local demo: http://127.0.0.1:' + port));
  const stop = () => server.close(() => { store.close(); process.exit(0); });
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
