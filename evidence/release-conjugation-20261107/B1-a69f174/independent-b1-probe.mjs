// Independent B1 reproduction. Synthetic test data only; no live WordPress access.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import net from 'node:net';
import {spawn,execFileSync,spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const [repo,out]=process.argv.slice(2);
await fs.mkdir(out,{recursive:true});
const run=await fs.mkdtemp(path.join(out,'isolated-'));
const source=path.join(repo,'adapters/wordpress/conjugation'),supplied=path.resolve(repo,'../wordpress-conjugation-corrected-package');
const {fixture}=await import(pathToFileURL(path.join(source,'rehearsal/fixture.js')).href);
const node=(file,args=[])=>execFileSync(process.execPath,[path.join(source,file),...args],{encoding:'utf8',windowsHide:true});
const hash=async file=>crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');
const results={revision:'a69f17438f66c8a6a8e1808b5904e808bed078dd',scope:'Isolated synthetic package HTTP and supplied zero-form package; no destination installation',http:[]};
const regenerated=path.join(run,'regenerated-zero');
node('package.mjs',[path.join(repo,'public/conjugation/catalog.json'),regenerated]);
const expected=['assets/bootstrap.js','assets/catalog-contract.js','assets/engine.js','assets/practice.css','assets/view.js','catalog-data.php','conjugation.php'];
for(const target of [supplied,regenerated]){
 const manifest=JSON.parse(await fs.readFile(path.join(target,'manifest.json')));
 assert.equal(manifest.schema,2);assert.equal(manifest.approvedForms,0);
 assert.deepEqual(Object.keys(manifest.files).sort(),expected);
 assert.deepEqual(manifest.forbiddenFiles,['assets/catalog.json']);
 for(const [file,sha]of Object.entries(manifest.files))assert.equal(await hash(path.join(target,file)),sha);
 const read=execFileSync('php',['-r',"define('ABSPATH',__DIR__); eval('namespace HebleoConjugation; function allowed(){return true;}'); echo json_encode(require $argv[1]);",path.join(target,'catalog-data.php')],{encoding:'utf8',windowsHide:true});
 const catalog=JSON.parse(read);assert.equal(catalog.forms.length,0);assert.equal(catalog.words.length,30);
 assert.equal(catalog.words.filter(w=>w.kind==='verb').length,11);assert.equal(catalog.words.filter(w=>w.kind==='prep').length,19);
 node('verify-package.mjs',[target]);
}
assert.equal(await hash(path.join(supplied,'manifest.json')),await hash(path.join(regenerated,'manifest.json')));
for(const file of expected)assert.equal(await hash(path.join(supplied,file)),await hash(path.join(regenerated,file)),file);
results.suppliedPackage={canonicalSevenFiles:true,allHashesMatch:true,regeneratedBytesIdentical:true,verbs:11,prepositions:19,gradingForms:0};
const synthetic=structuredClone(fixture);synthetic.status='SYNTHETIC INDEPENDENT SECURITY TEST - NEVER DEPLOY';
synthetic.forms.forEach(f=>f.approval='approved');
synthetic.forms[0].english='SYNTHETIC B1 PROTECTED RECORD';
const input=path.join(run,'SYNTHETIC-ONLY.json'),pkg=path.join(run,'synthetic-plugin');
await fs.writeFile(input,JSON.stringify(synthetic));node('package.mjs',[input,pkg]);
results.verifierRejects=[];
for(const relative of ['assets/catalog.json','unreviewed-extra.txt']){
 const p=path.join(pkg,relative);await fs.writeFile(p,'synthetic obsolete or extra data');
 const check=spawnSync(process.execPath,[path.join(source,'verify-package.mjs'),pkg],{encoding:'utf8',windowsHide:true});
 assert.notEqual(check.status,0);results.verifierRejects.push(relative);await fs.unlink(p);
}
const asset=path.join(pkg,'assets/engine.js'),original=await fs.readFile(asset);
await fs.appendFile(asset,'\n// synthetic tamper');
assert.notEqual(spawnSync(process.execPath,[path.join(source,'verify-package.mjs'),pkg],{encoding:'utf8',windowsHide:true}).status,0);
results.verifierRejects.push('modified asset hash');await fs.writeFile(asset,original);node('verify-package.mjs',[pkg]);
const router=path.join(run,'router.php');
await fs.writeFile(router,`<?php
if (parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) !== '/shortcode') return false;
define('ABSPATH',__DIR__);
function is_user_logged_in(){return ($_GET['login']??'0')==='1';}
function get_current_user_id(){return 7;}
function apply_filters($name,$default,$id){if($name!=='hebleo_conjugation_access'||$id!==7)throw new Exception('Wrong account gate');return match($_GET['access']??'false'){'true'=>true,'truthy'=>'yes',default=>false};}
function add_shortcode(...$args){}
function wp_unique_id($prefix){return $prefix.'probe';}
function wp_enqueue_style(...$args){}
function plugins_url($file,$source){return '/'.$file;}
function esc_attr($value){return htmlspecialchars($value,ENT_QUOTES);}
function esc_url($value){return esc_attr($value);}
function wp_json_encode($value,$flags){return json_encode($value,$flags);}
require __DIR__.'/synthetic-plugin/conjugation.php';
echo \\HebleoConjugation\\shortcode();
`);
const reserve=net.createServer();await new Promise(r=>reserve.listen(0,'127.0.0.1',r));const port=reserve.address().port;await new Promise(r=>reserve.close(r));
const php=spawn('php',['-S','127.0.0.1:'+port,'-t',pkg,router],{windowsHide:true,stdio:['ignore','ignore','pipe']});
try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('PHP did not start')),10000);php.once('error',e=>{clearTimeout(timer);reject(e);});php.stderr.on('data',b=>{if(String(b).includes('Development Server')){clearTimeout(timer);resolve();}});});
 const origin='http://127.0.0.1:'+port;
 for(const url of ['/catalog-data.php','/catalog-data.php?login=1&access=true','/assets/catalog.json']){
  const response=await fetch(origin+url),body=await response.text();
  assert.equal(response.status,404);assert(!body.includes('SYNTHETIC B1 PROTECTED RECORD'));
  if(url.startsWith('/catalog-data.php'))assert.equal(body,'');
  results.http.push({url,status:response.status,bodyBytes:Buffer.byteLength(body),catalogExposed:false});
 }
 for(const [login,access,allowed] of [['0','false',false],['0','true',false],['1','false',false],['1','truthy',false],['1','true',true]]){
  const url='/shortcode?login='+login+'&access='+access,response=await fetch(origin+url),body=await response.text();
  const match=body.match(/data-conjugation-catalog>([^<]+)<\/script>/);
  assert.equal(!!match,allowed,url);
  if(allowed){const catalog=JSON.parse(match[1]);assert.equal(catalog.forms.length,7);assert.equal(catalog.forms[0].english,'SYNTHETIC B1 PROTECTED RECORD');}
  else assert.match(body,/unavailable for this account/);
  results.http.push({url,status:response.status,embeddedForms:allowed?7:0});
 }
}finally{await new Promise(resolve=>{if(php.exitCode!==null)return resolve();php.once('exit',resolve);php.kill();});}
results.verdict='B1 CLOSED';
await fs.writeFile(path.join(out,'independent-b1-results.json'),JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results,null,2));

