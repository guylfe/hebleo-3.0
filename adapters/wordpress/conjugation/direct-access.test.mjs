// Real PHP HTTP regression, wholly isolated synthetic data and WordPress doubles.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn,execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {fixture} from './rehearsal/fixture.js';
const here=path.dirname(fileURLToPath(import.meta.url));
test('actual PHP HTTP denies direct catalog URLs while authorized shortcode alone embeds the key',{timeout:20000},async t=>{
  const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'hebleo-conjugation-http-')),out=path.join(tmp,'plugin');
  t.after(()=>fs.rm(tmp,{recursive:true,force:true}));
  const catalog=structuredClone(fixture);catalog.forms.forEach(f=>f.approval='approved');
  catalog.forms[0].english='SYNTHETIC PROTECTED GRADING RECORD';
  const input=path.join(tmp,'synthetic-only.json');await fs.writeFile(input,JSON.stringify(catalog));
  execFileSync(process.execPath,[path.join(here,'package.mjs'),input,out]);
  const manifest=JSON.parse(await fs.readFile(path.join(out,'manifest.json'),'utf8'));
  assert.deepEqual(manifest.forbiddenFiles,['assets/catalog.json']);
  assert.equal(manifest.files['assets/catalog.json'],undefined);
  execFileSync(process.execPath,[path.join(here,'verify-package.mjs'),out]);
  const deprecated=path.join(out,'assets/catalog.json');await fs.writeFile(deprecated,'{"obsolete":true}');
  const overlay=await new Promise(resolve=>{const check=spawn(process.execPath,[path.join(here,'verify-package.mjs'),out],{stdio:'ignore',windowsHide:true});check.once('exit',resolve);});
  assert.notEqual(overlay,0,'An overlay retaining the old public catalog must be refused');
  await fs.unlink(deprecated);
  const router=path.join(tmp,'router.php');await fs.writeFile(router,`<?php
if (parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) !== '/shortcode') return false;
define('ABSPATH', __DIR__);
function is_user_logged_in(){return ($_GET['authorized'] ?? '') === '1';}
function get_current_user_id(){return is_user_logged_in()?7:0;}
function apply_filters($name,$default,$userId){return ($_GET['denied'] ?? '') === '1'?false:$default;}
function sfwd_lms_has_access(...$args){throw new Exception('Course enrollment must not gate flashcard audience');}
function add_shortcode(...$args){}
function wp_unique_id($p){return $p.'test';}
function wp_enqueue_style(...$args){}
function plugins_url($p,$file){return '/'.$p;}
function esc_attr($s){return htmlspecialchars($s,ENT_QUOTES);}
function esc_url($s){return esc_attr($s);}
function wp_json_encode($value,$flags){return json_encode($value,$flags);}
require __DIR__.'/plugin/conjugation.php';
echo \\HebleoConjugation\\shortcode();
`);
  const probe=net.createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));
  const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
  const child=spawn('php',['-S','127.0.0.1:'+port,'-t',out,router],{stdio:['ignore','ignore','pipe'],windowsHide:true});
  t.after(()=>new Promise(resolve=>{if(child.exitCode!==null)return resolve();child.once('exit',resolve);child.kill();}));
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('Isolated PHP HTTP server did not start')),10000);
    child.on('error',error=>{clearTimeout(timer);reject(error);});
    child.stderr.on('data',bytes=>{if(/Development Server.*started/.test(bytes.toString())){clearTimeout(timer);resolve();}});
    child.once('exit',code=>{clearTimeout(timer);reject(Error('PHP HTTP exited '+code));});
  });
  const origin='http://127.0.0.1:'+port;
  for(const url of ['/catalog-data.php','/catalog-data.php?authorized=1','/assets/catalog.json']){
    const response=await fetch(origin+url),body=await response.text();
    assert.equal(response.status,404,url);assert(!body.includes('SYNTHETIC PROTECTED GRADING RECORD'));
    if(url.startsWith('/catalog-data.php'))assert.equal(body,'');
  }
  const denied=await fetch(origin+'/shortcode').then(r=>r.text());
  assert.match(denied,/unavailable for this account/);assert(!denied.includes('data-conjugation-catalog'));
  const restricted=await fetch(origin+'/shortcode?authorized=1&denied=1').then(r=>r.text());
  assert.match(restricted,/unavailable for this account/);assert(!restricted.includes('data-conjugation-catalog'));
  const allowed=await fetch(origin+'/shortcode?authorized=1').then(r=>r.text());
  const embedded=JSON.parse(allowed.match(/data-conjugation-catalog>([^<]+)<\/script>/)[1]);
  assert.equal(embedded.forms.length,7);assert.equal(embedded.forms[0].english,'SYNTHETIC PROTECTED GRADING RECORD');
  assert.match(allowed,/type="module"/);
});
