import test from 'node:test';
import assert from 'node:assert/strict';
import {Store} from '../src/store.js';
import {createServer} from '../src/server.js';
test('complete retained workspace above 20 MB supports impact and exact-token draft; oversized input returns 413 without losing work',async t=>{
 const s=new Store(),server=createServer(s);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(async()=>{await new Promise(r=>server.close(r));s.close();});
 const post=(path,body)=>fetch('http://127.0.0.1:'+server.address().port+'/api/'+path,{method:'POST',headers:{'x-demo-user':'author-demo','content-type':'application/json'},body});
 const content=s.snapshot(),baseRevisionId=s.get('active');content.syntheticRetainedWorkspaceFixture='SYNTHETIC size regression '+'.'.repeat(20100000);
 const wire=JSON.stringify({content,baseRevisionId,expectedDraftToken:null});assert.ok(Buffer.byteLength(wire)>20000000);
 const impact=await post('studio/impact',wire);assert.equal(impact.status,200);const reviewed=await impact.json();assert.ok(reviewed.candidateDraftToken);
 const saved=await post('studio/draft',wire);assert.equal(saved.status,200);const receipt=await saved.json();assert.equal(receipt.draftToken,reviewed.candidateDraftToken);assert.equal(s.currentDraft().content.syntheticRetainedWorkspaceFixture,content.syntheticRetainedWorkspaceFixture);
 const before=s.currentDraft().draftToken,rejected=await post('studio/draft',' '.repeat(50000001));assert.equal(rejected.status,413);assert.equal((await rejected.json()).code,'PAYLOAD_TOO_LARGE');assert.equal(s.currentDraft().draftToken,before);assert.equal(s.get('active'),baseRevisionId);
});
