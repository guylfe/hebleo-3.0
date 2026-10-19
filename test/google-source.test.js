import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sha256,canonicalJSON,parseStrictJSON} from '../src/source-utils.js';
import {GoogleSourceTransport,validateCapture,capturePayload} from '../src/google-source.js';
import {GoogleAuth,windowsCredentialVault} from '../src/google-auth.js';
import {mkdtempSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const headers=['Hebrew','English','Lesson','Part'];
const registration=()=>({sourceId:'synthetic-source',spreadsheetId:'synthetic_spreadsheet_123',sheetId:7,connectionSlot:'synthetic-google',expectedAccount:'synthetic@example.invalid',headers,headerSha256:sha256(headers),extent:{startRow:0,endRow:6,startColumn:0,endColumn:4},gridExtent:{rowCount:6,columnCount:4}});
const cell=v=>({userEnteredValue:{stringValue:v},effectiveValue:{stringValue:v},formattedValue:v});
function provider(options={}){let version='1',driveCount=0,gridCount=0;const calls=[],properties={title:'SYNTHETIC source',defaultFormat:{textFormat:{bold:true}},spreadsheetTheme:{themeColors:[]}},rows=[headers.map(cell),[cell('אֲנִי'),cell('SYNTHETIC I'),cell('1.3.5'),cell('A')]];
 const sheetProperties=()=>({sheetId:7,title:options.renamed?"SYNTHETIC 'new'":'SYNTHETIC',sheetType:'GRID',gridProperties:{rowCount:options.extentChange?7:6,columnCount:4}});
 const fetcher=async(input,init)=>{const u=new URL(input);calls.push({url:u.href,method:init.method});assert.equal(init.method,'GET');assert.equal(init.headers.Authorization,'Bearer SYNTHETIC token');
  if(u.hostname==='www.googleapis.com'){driveCount++;if(options.churn&&driveCount>1)version='2';return Response.json({id:registration().spreadsheetId,mimeType:'application/vnd.google-apps.spreadsheet',version,modifiedTime:'SYNTHETIC observation',owners:[{emailAddress:'synthetic@example.invalid',me:true}]});}
  const range=u.searchParams.get('ranges');if(!range)return Response.json({spreadsheetId:registration().spreadsheetId,properties,sheets:[{properties:sheetProperties(),merges:[]}]});gridCount++;
  if(options.rateLimit&&gridCount===1)return new Response('',{status:429,headers:{'retry-after':'0.1'}});if(options.partial&&gridCount===2)return Response.json({error:{code:429}});
  const start=Number(/!A(\d+)/.exec(range)[1])-1,end=Number(/:D(\d+)/.exec(range)[1]);const rowData=rows.slice(start,end).map(values=>({values}));if(options.headerChange&&start===0)rowData[0].values[0]=cell('SYNTHETIC changed');
  return Response.json({spreadsheetId:registration().spreadsheetId,properties,sheets:[{properties:sheetProperties(),data:[{startRow:start,startColumn:0,...(rowData.length?{rowData}:{})}]}]});};
 const auth={getToken:async()=>({accessToken:'SYNTHETIC token',account:options.wrongAccount?'other@example.invalid':'synthetic@example.invalid',verified:true})};const delays=[];const transport=new GoogleSourceTransport({auth,fetcher,chunkRows:2,sleep:async ms=>delays.push(ms)});return {transport,calls,delays,advanceMetadata(){version=String(Number(version)+1);}};
}
test('source contract canonical hashes preserve arrays/Unicode and strict parsing rejects duplicate/reserved keys',()=>{
 assert.equal(canonicalJSON({b:1,a:['אֲנִי',null]}),'{"a":["אֲנִי",null],"b":1}');assert.equal(sha256({b:1,a:2}),sha256({a:2,b:1}));assert.notEqual(sha256(['a','b']),sha256(['b','a']));
 for(const raw of ['{"x":1,"x":2}','{"__proto__":{}}','{"a":{"x":1,"x":2}}','[1,]','{"x":NaN}','{"x":1} trailing'])assert.throws(()=>parseStrictJSON(raw));assert.deepEqual(parseStrictJSON('{"x":[true,false,null,-1.2e3,"a\\nb"]}'),{x:[true,false,null,-1200,'a\nb']});
});
test('complete read-only capture includes confirmed sparse blanks, exact source cells, defaults and region receipts',async()=>{
 const p=provider(),r=registration(),capture=await p.transport.captureSource(r);assert.equal(capture.cells.length,6);assert.deepEqual(capture.cells[5],[{},{},{},{}]);assert.equal(capture.cells[1][0].formattedValue,'אֲנִי');assert.equal(capture.cells[1][2].formattedValue,'1.3.5');assert.equal(capture.receipts.length,3);assert.equal(capture.capturePayloadSha256,sha256(capturePayload(capture)));assert.equal(p.calls.filter(x=>x.method!=='GET').length,0);
 const corrupted=structuredClone(capture);corrupted.receipts[1].startRow=1;assert.throws(()=>validateCapture(corrupted,r),e=>e.code==='PARTIAL_CAPTURE');
});
test('metadata version advance and numeric tab rename do not create source content changes',async()=>{
 const p=provider(),one=await p.transport.captureSource(registration());p.advanceMetadata();const two=await p.transport.captureSource(registration());assert.notEqual(one.postVersion,two.postVersion);assert.equal(one.capturePayloadSha256,two.capturePayloadSha256);
 const renamed=provider({renamed:true}),three=await renamed.transport.captureSource(registration());assert.equal(three.capturePayloadSha256,one.capturePayloadSha256);assert.ok(renamed.calls.some(x=>x.url.includes('new')));
});
test('missing/error region, changed headers/extent and mixed capture reject with typed errors',async()=>{
 for(const [options,code]of [[{partial:true},'SOURCE_RESPONSE'],[{headerChange:true},'SCHEMA_CHANGED'],[{extentChange:true},'RANGE_CHANGED'],[{churn:true},'SOURCE_CHANGED']])await assert.rejects(()=>provider(options).transport.captureSource(registration()),e=>e.code===code);
});
test('429 retry is bounded to the author action, honors Retry-After and does not become a blank region',async()=>{
 const p=provider({rateLimit:true}),c=await p.transport.captureSource(registration());assert.equal(c.complete,true);assert.deepEqual(p.delays,[100]);assert.equal(c.cells[1][1].formattedValue,'SYNTHETIC I');
});
test('source account/file identity is enforced and arbitrary source URL cannot select transport',async()=>{
 await assert.rejects(()=>provider({wrongAccount:true}).transport.captureSource(registration()),e=>e.code==='ACCOUNT_MISMATCH');const r=registration();r.spreadsheetId='https://unrelated.invalid';await assert.rejects(()=>provider().transport.captureSource(r),e=>e.code==='INVALID_REGISTRATION');
});
function oauth({wrongAccount=false,scopeMissing=false}={}){let value={},clock=100000;const calls=[];const vault={read:()=>structuredClone(value),write:next=>{value=structuredClone(next);}};
 const fetcher=async(url,init)=>{calls.push({url,method:init.method,body:init.body});if(url.endsWith('/token'))return Response.json({access_token:'SYNTHETIC access',refresh_token:'SYNTHETIC refresh',expires_in:3600,scope:scopeMissing?'openid email':'https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.metadata.readonly openid email'});return Response.json({email:wrongAccount?'other@example.invalid':'synthetic@example.invalid',verified_email:true});};
 const auth=new GoogleAuth({vault,fetcher,expectedAccount:'synthetic@example.invalid',clock:()=>clock});const configure=()=>auth.configureClient({installed:{client_id:'synthetic.apps.googleusercontent.com',client_secret:'SYNTHETIC client secret'}});return {auth,configure,calls,getStored:()=>value,advance:()=>clock+=3600000};
}
test('OAuth PKCE/state binds the local callback, read-only scopes and verified designated identity without exposing tokens',async()=>{
 const p=oauth();p.configure();const start=p.auth.begin({authorId:'author-demo',connectionSlot:'synthetic-google',redirectUri:'http://127.0.0.1:63261/oauth/google/callback'}),url=new URL(start.authorizationUrl);assert.equal(url.searchParams.get('code_challenge_method'),'S256');assert.ok(!url.searchParams.get('scope').split(' ').includes('https://www.googleapis.com/auth/spreadsheets'));assert.equal(url.searchParams.get('login_hint'),'synthetic@example.invalid');
 const result=await p.auth.finish({state:url.searchParams.get('state'),code:'SYNTHETIC code'});assert.equal(result.connected,true);assert.equal(result.account,'synthetic@example.invalid');assert.ok(!JSON.stringify(result).includes('SYNTHETIC access'));assert.equal((await p.auth.getToken('synthetic-google')).accessToken,'SYNTHETIC access');p.advance();await p.auth.getToken('synthetic-google');assert.equal(p.calls.filter(x=>x.url.endsWith('/token')).length,2);
});
test('OAuth refuses wrong scopes/account/state/remote callbacks without persisting connection credentials',async()=>{
 for(const flags of [{wrongAccount:true},{scopeMissing:true}]){const p=oauth(flags);p.configure();const start=p.auth.begin({authorId:'author-demo',connectionSlot:'synthetic-google',redirectUri:'http://127.0.0.1:63261/oauth/google/callback'});await assert.rejects(()=>p.auth.finish({state:new URL(start.authorizationUrl).searchParams.get('state'),code:'SYNTHETIC code'}));assert.deepEqual(p.getStored().connections,{});}
 const p=oauth();p.configure();assert.throws(()=>p.auth.begin({authorId:'author-demo',redirectUri:'https://other.invalid/oauth/google/callback'}));await assert.rejects(()=>p.auth.finish({state:'SYNTHETIC wrong',code:'SYNTHETIC code'}));assert.ok(!p.auth.status().connected);
});
test('actual Windows DPAPI vault roundtrips synthetic secrets outside SQLite and never writes plaintext',()=>{
 if(process.platform!=='win32')return;const folder=mkdtempSync(join(tmpdir(),'hebleo-synthetic-vault-')),path=join(folder,'connection.dpapi'),vault=windowsCredentialVault(path),value={clientSecret:'SYNTHETIC test-only secret'};vault.write(value);assert.deepEqual(vault.read(),value);assert.equal(readFileSync(path).includes(Buffer.from(value.clientSecret)),false);
});

test('OAuth setup malformed JSON errors never echo supplied secret fragments and approval proofs stay bound to exact payload',()=>{let state={};const vault={read:()=>structuredClone(state),write:next=>{state=structuredClone(next);}},auth=new GoogleAuth({vault});assert.throws(()=>auth.configureClient('{"installed":{"client_secret":"SYNTHETIC_SECRET_FRAGMENT"'),e=>e.code==='OAUTH_CONFIG'&&!e.message.includes('SYNTHETIC_SECRET_FRAGMENT'));const payload={contentSha256:'synthetic-content',sourceStateSha256:'synthetic-source'},proof=auth.signApproval(payload);assert(auth.verifyApproval(payload,proof));assert(!auth.verifyApproval({...payload,contentSha256:'changed'},proof));assert(!JSON.stringify(auth.status()).includes(state.approvalKey));});
