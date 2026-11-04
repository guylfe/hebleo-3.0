import http from 'node:http';import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const [work,adapter,port='63444']=process.argv.slice(2);
const fixtures=JSON.parse(readFileSync(work+'/fixtures.json'));
const archive=readFileSync(work+'/archive-decks.php','utf8');
const css=archive.match(/<style>([\s\S]*?)<\/style>/)[1];
const script=archive.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/<\?php[\s\S]*?\?>/g,'fixture-only');
const host=readFileSync(adapter+'/shared-cards/frame-host.js','utf8');
const escape=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
http.createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost');const note=fixtures[u.searchParams.get('id')]||Object.values(fixtures)[0];const dir=u.searchParams.get('dir')==='en-he'?'en-he':'he-en';
 const card={front:'',back:'',state:'new',note_id:1,template_id:2,intervals:{again:'SERVER AGAIN',hard:'SERVER HARD',good:'SERVER GOOD',easy:'SERVER EASY'}};
 for(const f of ['front','back']){
  let doc=note.documents[dir][f];
  if(f==='back'&&u.searchParams.get('expanded')==='1'){
   const check=readFileSync(adapter+'/study-layout/browser-check.js','utf8').replaceAll('\r\n','\n');
   const hash=createHash('sha256').update(check).digest('base64');
   doc=doc.replace('script-src ',`script-src &#39;sha256-${hash}&#39; `).replace('</body>','<script>'+check+'</script></body>');
  }
  card[f]=`<iframe data-hebleo-shared="1" title="Hebleo vocabulary card" sandbox="allow-scripts" referrerpolicy="no-referrer" style="width:100%;min-height:120px;height:240px;border:0" srcdoc="${escape(doc)}"></iframe>`;
 }
 res.setHeader('Content-Type','text/html; charset=utf-8');
 const width=[360,390,740,1120].includes(Number(u.searchParams.get('width')))?Number(u.searchParams.get('width')):1120;
 res.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Isolated WordPress layout fixture</title><style>body{margin:0;background:#f3f5f7}*{box-sizing:border-box}${css}#study-app{width:min(100%,${width}px)}</style><p style="font:12px system-ui">Isolated actual-card fixture: ${note.id} ${dir}. Ratings are fixture server sentinels; no persistence. Container ${width}px (not device emulation).</p><div id="study-app"></div><p id="geometry" role="status"></p><script>${host}</script><script>${script.replace('studyApp = new StudyApp();','StudyApp.prototype.init=function(){}; studyApp = new StudyApp(); studyApp.currentCard='+JSON.stringify(card)+';studyApp.cards=[];studyApp.renderStudyInterface();studyApp.showAnswer();')}</script><script>function geometry(){const app=document.querySelector('#study-app'),r=[...document.querySelectorAll('.rating-btn')].map(x=>x.getBoundingClientRect());document.querySelector('#geometry').textContent='Rendered geometry: container '+app.clientWidth+'px; horizontal overflow '+(app.scrollWidth-app.clientWidth)+'px; four ratings share row '+r.every(x=>Math.abs(x.top-r[0].top)<1)+'; iframe heights '+[...document.querySelectorAll('iframe')].filter(x=>x.getClientRects().length).map(x=>x.clientHeight).join(',');}new ResizeObserver(geometry).observe(document.querySelector('#study-app'));geometry();</script>`);
}).listen(Number(port),'127.0.0.1',()=>console.log('Candidate only http://127.0.0.1:'+port+'; ids '+Object.keys(fixtures).join(',')));
