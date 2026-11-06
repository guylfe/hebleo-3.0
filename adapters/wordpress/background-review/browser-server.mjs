import http from 'node:http';import fs from 'node:fs';
const source=fs.readFileSync('evidence/candidate-reviewed/archive-decks.php','utf8');
let script=source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/window.HebleoBackgroundConfig=<\?php[\s\S]*?\?>;/,'window.HebleoBackgroundConfig={siteId:"http://127.0.0.1:33562",ownerId:"1",nonce:"synthetic",endpoint:"/?hebleo_review=1"};').replace(/<\?php echo wp_json_encode[\s\S]*?\?>/g,'"/ajax"').replace(/<\?php[\s\S]*?\?>/g,'fixture').replace('let studyApp;','window.studyApp;').replace('studyApp = new StudyApp();','StudyApp.prototype.init=async function(){await this.startStudy(1);};studyApp = new StudyApp();');
const mock=`
window.fixture={calls:[],receipts:{},hold:true};
const cards=[10,10,11,12].map((n,i)=>({note_id:n,template_id:20+i,state:'new',front:'Synthetic card '+n,back:'Synthetic answer '+n,review_version:'a'.repeat(64),intervals:{again:'1m',hard:'5m',good:'10m',easy:'8d'}}));
window.fetch=async(url,opts)=>{const f=window.fixture,action=opts.body.get('action');f.calls.push({action,at:performance.now()});let data={};const serverNow=Date.now();
if(action==='start_study_session')data={cards};
if(action==='hebleo_bg_clock')data={anchors:JSON.parse(opts.body.get('card_ids')).map(cardId=>({cardId,expectedVersion:'a'.repeat(64),clockTicketId:'synthetic-clock-000001',issuedAt:serverNow,expiresAt:serverNow+86400000}))};
if(action==='hebleo_bg_status')data={receipt:f.receipts[opts.body.get('request_id')]||null};
if(action==='hebleo_bg_save'){const i=JSON.parse(opts.body.get('intent'));if(f.hold)await new Promise(r=>f.release=r);const c='{'+Object.keys(i).sort().map(k=>JSON.stringify(k)+':'+JSON.stringify(i[k])).join(',')+'}';const intentHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(c))),x=>x.toString(16).padStart(2,'0')).join('');const receipt={protocolVersion:1,requestId:i.requestId,intentHash,cardId:i.cardId,expectedVersion:i.expectedVersion,resultingVersion:'b'.repeat(64),outcome:'committed',acceptedAnswerAt:serverNow,committedAt:serverNow,authoritativeSchedule:{due:new Date(serverNow+600000).toISOString()},siblingsUntil:serverNow+86400000};f.receipts[i.requestId]=receipt;data={receipt};}
return {ok:true,headers:{get:()=>null},json:async()=>({success:true,data:{...data,serverNow:Date.now(),siteId:'http://127.0.0.1:33562',ownerId:'1'}})};};`;
const css=source.match(/<style>([\s\S]*?)<\/style>/)[1];
http.createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end('<!doctype html><meta charset="utf-8"><title>Synthetic WordPress background review</title><style>'+css+'</style><div id="study-app"></div><script>'+mock+script+'</script>');}).listen(33562,'127.0.0.1',()=>console.log('Synthetic candidate ready 33562'));
