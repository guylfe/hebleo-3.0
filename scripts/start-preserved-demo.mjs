import {parseArgs} from 'node:util';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createServer} from '../src/server.js';
import {GoogleAuth,windowsCredentialVault} from '../src/google-auth.js';
import {databaseReceipt,openPreservedStore,executableIdentity} from './runtime-state.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const {values}=parseArgs({options:{database:{type:'string'},'media-root':{type:'string'},'vault-path':{type:'string'},port:{type:'string'},revision:{type:'string'}}});
assert.notEqual(process.env.HEBLEO_DEMO_FRESH_PROGRESS,'1','Fresh-progress environment is forbidden for this installation.');
for(const key of ['database','media-root','vault-path','port','revision'])assert.ok(values[key],'Supply --'+key+'.');
const port=Number(values.port);
assert.ok(Number.isInteger(port)&&port>0&&port<=65535,'Invalid port.');
const buildIdentity=executableIdentity(root,values.revision);
const {store,before}=openPreservedStore(resolve(values.database));
try {
  const sourceAuth=new GoogleAuth({vault:windowsCredentialVault(resolve(values['vault-path']))});
  const server=createServer(store,{mediaRoot:resolve(values['media-root']),sourceAuth,buildIdentity});
  assert.deepEqual(databaseReceipt(resolve(values.database)),before,'Server startup changed persistent state.');
  server.on('error',error=>{console.error(error.message);store.close();process.exitCode=1;});
  server.listen(port,'127.0.0.1',()=>console.log(JSON.stringify({url:'http://127.0.0.1:'+port+'/',pid:process.pid,revision:buildIdentity.revision,runtimeSha256:buildIdentity.runtimeSha256,preservationMode:true,databaseReceipt:before})));
  for(const event of ['SIGINT','SIGTERM'])process.on(event,()=>server.close(()=>{store.close();process.exit(0);}));
} catch(error) {store.close();throw error;}
