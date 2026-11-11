<?php
/** Isolated candidate: no activation hooks, routes, installs or scheduler writes. */
namespace HebleoShared;
require_once __DIR__.'/frame-bridge.php';
require_once __DIR__.'/feedback.php';
const FIELDS = ['SourceId','Hebrew','English','Forms','Notes','Grammar','Source','Audio','HebrewNikkud'];
const PACKAGE = '597c2fb3c78591a0c377216ab6668b5408a48a3f5f0a66b57fbb225122dd4e2a';
const PACKAGES = [PACKAGE,'7a91c3d07d493dde5b701ca06a4d748352c8e7f1991a614c1d15814d93c8c1de'];
function digest($v): string { return hash('sha256', json_encode($v, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR)); }
function demand($ok, string $why): void { if (!$ok) throw new \RuntimeException($why); }
function filename(string $s): void { demand((bool)preg_match('/\A[A-Za-z0-9_-]+\.(mp3|png)\z/D', $s), 'Unsafe media basename'); }
/** Artifact bytes must have an independently reviewed digest; self supplied hashes are not trust. */
function artifact(string $path, string $approvedSha): array {
 demand(is_file($path) && hash_equals($approvedSha, hash_file('sha256',$path)), 'Artifact hash mismatch');
 $p=json_decode(file_get_contents($path),true,512,JSON_THROW_ON_ERROR); validate($p); return $p;
}
function validate(array $p): void {
 demand(($p['schema']??'')==='hebleo-wp-shared/1' && in_array($p['packageSha256']??'',PACKAGES,true), 'Unsupported provenance/schema');
 demand(($p['fields']??[])===FIELDS && is_array($p['notes']??null) && count($p['notes'])>0, 'Missing exact fields/notes');
 $seen=[]; foreach($p['notes'] as $n){
  $id=$n['id']??''; demand(is_string($id)&&preg_match('/\A[a-zA-Z0-9_-]+\z/D',$id)&&!isset($seen[$id]),'Duplicate/invalid SourceId'); $seen[$id]=true;
  demand(array_keys($n['fields']??[])===FIELDS && $n['fields']['SourceId']===$id,'Raw field identity/schema mismatch');
  foreach($n['fields'] as $s) demand(is_string($s),'Raw fields must be strings');
  foreach(['he-en','en-he'] as $d) foreach(['front','back'] as $f){
   $doc=$n['documents'][$d][$f]??null; demand(is_string($doc)&&str_contains($doc,'Content-Security-Policy')&&str_contains(html_entity_decode($doc,ENT_QUOTES),"default-src 'none'"),'Missing safe generated document');
  }
 }
 $seen=[]; foreach($p['media']??[] as $m){ filename($m['file']); demand(!isset($seen[$m['file']]) && preg_match('/\A[a-f0-9]{64}\z/D',$m['sha256']) && is_int($m['bytes']) && $m['bytes']>0,'Invalid/duplicate media'); $seen[$m['file']]=true; }
 demand(count($seen)>0,'Media manifest required');
}
function verify_media(array $manifest,string $root): void {
 $root=realpath($root); demand($root!==false,'Missing media root');
 foreach($manifest as $m){filename($m['file']);$f=$root.DIRECTORY_SEPARATOR.$m['file'];demand(is_file($f)&&!is_link($f)&&dirname(realpath($f))===$root,'Unsafe/missing media'); demand(filesize($f)===$m['bytes']&&hash_equals($m['sha256'],hash_file('sha256',$f)),'Media byte/hash mismatch');}
}
/** Store must serialize the complete operation, transactionally, and verify mapping ownership. */
interface Store { public function atomic(callable $fn); public function read(): array; public function write(array $s): void; public function verify(array $map): void; }
class Importer {
 private Store $db;
 public function __construct(Store $db){$this->db=$db;}
 public function apply(array $p,array $map,string $expected,string $mediaRoot): array {
  validate($p); verify_media($p['media'],$mediaRoot);
  return $this->db->atomic(function()use($p,$map,$expected){
   $s=$this->db->read(); demand(hash_equals($expected,digest($s)),'Stale import'); $this->db->verify($map);
   $next=$s; $next['map']=$map; $next['notes']=[]; $next['media']=$p['media']; $next['packageSha256']=$p['packageSha256'];
   demand(count($map)===count($p['notes']),'Mapping coverage mismatch'); $used=[];
   foreach($p['notes'] as $n){$id=$n['id'];demand(isset($map[$id]),'Missing reviewed mapping');
    demand(!isset($used[$map[$id]['note_id']]),'Two SourceIds share note ID');$used[$map[$id]['note_id']]=true;
    if(isset($s['map'][$id])) demand($s['map'][$id]===$map[$id],'Stable mapping changed');
    $next['notes'][$id]=['raw'=>$n['fields'],'documents'=>$n['documents']];
   }
   // Omission must never silently remove a previously imported identity.
   foreach($s['map']??[] as $id=>$v)demand(isset($map[$id]),'Removal requires separate reviewed migration');
   $next['mediaBaseUrl']=$p['mediaBaseUrl']; $next['bindings']=$p['bindings']??[]; $next['audio']=$s['audio']??[]; foreach($next['audio'] as $u) apply_audio($next,$u); return $this->commit($s,$next);
  });
 }
 private function commit(array $before,array $after): array {
  $nativeBefore=$this->db instanceof WordPressStore ? $this->db->snapshotNative($after['map']??[]) : null;
  // New mappings must still equal their exact provisioned baseline. Locking and
  // snapshotting an edit is not permission to overwrite it on the first import.
  if($nativeBefore!==null)foreach($after['notes']??[] as $id=>$n)demand(($nativeBefore[$id]['values']['_card_field_data'][0]??null)===($before['notes'][$id]['raw']??$n['raw']),'Native metadata changed: import refused');
  if($before===$after)return ['changed'=>false,'before'=>$before,'afterHash'=>digest($after),'nativeBefore'=>$nativeBefore,'nativeAfterHash'=>$nativeBefore===null?null:digest($nativeBefore)];
  $after['revision']=($before['revision']??0)+1; $this->db->write($after);
  demand($this->db->read()===$after,'Readback failed'); return ['changed'=>true,'before'=>$before,'afterHash'=>digest($after),'nativeBefore'=>$nativeBefore,'nativeAfterHash'=>$this->db instanceof WordPressStore?digest($this->db->snapshotNative($after['map']??[])):null];
 }
 /** Later audio is metadata-only. Re-materialize approved docs from this overlay before presentation. */
 public function audio(array $u,string $expected,string $root): array {
  filename($u['media']['file']); demand(str_ends_with($u['media']['file'],'.mp3'),'Audio must be MP3'); verify_media([$u['media']],$root);
  return $this->db->atomic(function()use($u,$expected){$s=$this->db->read();demand(digest($s)===$expected,'Stale audio update');$this->db->verify($s['map']);
   $raw=$s['notes'][$u['sourceId']]['raw']??null; demand($raw!==null,'Unknown SourceId');
   // Caller supplies the exact reviewed source form descriptor, not a guessed Hebrew match.
   demand(is_string($u['formKey'])&&$u['formKey']!==''&&is_string($u['formValue'])&&$u['formValue']!=='','Missing form identity');
   demand(($u['rawHash']??'')===digest($raw),'Form source has changed');
   $key=digest([$u['sourceId'],$u['formKey'],$u['formValue']]);
   $next=$s; apply_audio($next,$u); $next['audio'][$key]=$u; return $this->commit($s,$next);
  });
 }
 public function rollback(array $receipt): array {
  return $this->db->atomic(function()use($receipt){$s=$this->db->read();demand(digest($s)===$receipt['afterHash'],'Newer write: rollback refused');$this->db->verify($s['map']??[]);if($this->db instanceof WordPressStore)demand(digest($this->db->snapshotNative($s['map']??[]))===$receipt['nativeAfterHash'],'Newer native metadata: rollback refused');
   if(($receipt['changed']??true)===false)return ['changed'=>false,'afterHash'=>digest($s)];
   // Revision always advances: old receipts cannot be replayed after rollback (ABA guard).
   $before=$receipt['before'];$before['revision']=($s['revision']??0)+1;$this->db->write($before);if($this->db instanceof WordPressStore)$this->db->restoreNative($receipt['nativeBefore']);demand($this->db->read()===$before,'Rollback readback failed');return ['afterHash'=>digest($before)];
  });
 }
}
/** No public endpoint. Caller must be a signed-in administrator plus a current nonce. */
function authorize(string $nonce): void { demand(current_user_can('manage_options') && wp_verify_nonce($nonce,'hebleo_shared_import'),'Forbidden'); }
class WordPressStore implements Store {
 private $db; private array $touched=[]; private string $option='hebleo_shared_cards_v1';
 public function __construct($wpdb){$this->db=$wpdb;}
 public function atomic(callable $fn){$d=$this->db;$lock=$d->prefix.'hebleo_shared_cards';demand((int)$d->get_var($d->prepare('SELECT GET_LOCK(%s,0)',$lock))===1,'Import busy');
  try { foreach([$d->options,$d->posts,$d->postmeta] as $table){$engine=$d->get_var($d->prepare('SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=%s',$table));demand($engine==='InnoDB','Transactional storage required');}
   demand($d->query('START TRANSACTION')!==false,'Cannot start transaction');
   try {$v=$fn();demand($d->query('COMMIT')!==false,'Commit failed');return $v;} catch(\Throwable $e){$d->query('ROLLBACK');throw $e;}
  } finally {foreach(array_keys($this->touched) as $id)clean_post_cache($id);$this->touched=[];$d->get_var($d->prepare('SELECT RELEASE_LOCK(%s)',$lock));}
 }
 public function read(): array {
  $d=$this->db;$prefix=$this->option.'_chunk_';$rows=$d->get_results($d->prepare("SELECT option_name,option_value FROM {$d->options} WHERE option_name=%s OR option_name LIKE %s ORDER BY option_name",$this->option,$d->esc_like($prefix).'%'),ARRAY_A);
  $values=[];foreach($rows as $r)$values[$r['option_name']]=$r['option_value'];if(!isset($values[$this->option])){demand(!$values,'Orphan payload');return [];}
  $head=json_decode($values[$this->option],true,512,JSON_THROW_ON_ERROR);$b64='';
  for($i=0;$i<$head['chunks'];$i++){ $key=$prefix.sprintf('%06d',$i);demand(isset($values[$key]),'Incomplete payload');$b64.=$values[$key]; }
  demand(count($values)===$head['chunks']+1,'Unexpected payload chunks');$json=base64_decode($b64,true);demand($json!==false&&hash_equals($head['sha256'],hash('sha256',$json)),'Stored payload checksum mismatch');return json_decode($json,true,512,JSON_THROW_ON_ERROR);
 }
 public function write(array $s): void {
  foreach($s['map']??[] as $source=>$m)$this->nativeSet($m['note_id'],'_card_field_data',$s['notes'][$source]['raw']);
  $d=$this->db;$json=json_encode($s,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);$chunks=str_split(base64_encode($json),524288);$prefix=$this->option.'_chunk_';
  // All chunks and head commit together. Single statement readers never see mixed generations.
  demand($d->query($d->prepare("DELETE FROM {$d->options} WHERE option_name LIKE %s",$d->esc_like($prefix).'%'))!==false,'Chunk cleanup failed');
  foreach($chunks as $i=>$chunk)$this->put($prefix.sprintf('%06d',$i),$chunk);
  $this->put($this->option,json_encode(['chunks'=>count($chunks),'sha256'=>hash('sha256',$json)],JSON_THROW_ON_ERROR));
  $renderPrefix=$this->option.'_render_';
  demand($d->query($d->prepare("DELETE FROM {$d->options} WHERE option_name LIKE %s",$d->esc_like($renderPrefix).'%'))!==false,'Projection cleanup failed');
  foreach($s['map']??[] as $source=>$m){$projection=['map'=>[$source=>$m],'notes'=>[$source=>['documents'=>$s['notes'][$source]['documents']]]];$this->put($renderPrefix.$m['note_id'],json_encode($projection,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR));}
 }
 private function put(string $key,string $value):void {$d=$this->db;demand($d->query($d->prepare("INSERT INTO {$d->options} (option_name,option_value,autoload) VALUES (%s,%s,'no') ON DUPLICATE KEY UPDATE option_value=VALUES(option_value),autoload='no'",$key,$value))!==false,'Save failed');}
 public function touch(int $id):void {$this->touched[$id]=true;}
 private function nativeSet(int $id,string $key,$value):void {$this->touch($id);update_post_meta($id,$key,wp_slash($value));wp_cache_delete($id,'post_meta');demand(get_post_meta($id,$key,true)===$value,'Native byte readback failed');}
 public function snapshotNative(array $map):array {$out=[];foreach($map as $source=>$m){$id=$m['note_id'];$values=array_map('maybe_unserialize',$this->db->get_col($this->db->prepare("SELECT meta_value FROM {$this->db->postmeta} WHERE post_id=%d AND meta_key='_card_field_data' FOR UPDATE",$id)));wp_cache_delete($id,'post_meta');demand(count($values)<=1,'Duplicate native raw metadata');$out[$source]=['id'=>$id,'values'=>['_card_field_data'=>$values]];}return $out;}
 public function restoreNative(array $snapshot):void {foreach($snapshot as $v)foreach($v['values'] as $key=>$values){$this->touch($v['id']);if(!$values){delete_post_meta($v['id'],$key);wp_cache_delete($v['id'],'post_meta');demand(!metadata_exists('post',$v['id'],$key),'Native deletion failed');}else $this->nativeSet($v['id'],$key,$values[0]);}}
 public function forNote(int $id):array {$d=$this->db;$v=$d->get_var($d->prepare("SELECT option_value FROM {$d->options} WHERE option_name=%s",$this->option.'_render_'.$id));return $v===null?[]:json_decode($v,true,512,JSON_THROW_ON_ERROR);}
 public function verify(array $map): void {
  $d=$this->db; foreach($map as $source=>$m){foreach(['he-en','en-he'] as $dir){demand(isset($m['note_id'],$m['templates'][$dir])&&is_int($m['note_id'])&&is_int($m['templates'][$dir]),'Invalid IDs');
   $note=$d->get_row($d->prepare("SELECT ID,post_type FROM {$d->posts} WHERE ID=%d FOR UPDATE",$m['note_id']));
   $tpl=$d->get_row($d->prepare("SELECT ID,post_type FROM {$d->posts} WHERE ID=%d FOR UPDATE",$m['templates'][$dir]));
   demand($note&&$note->post_type==='notes'&&$tpl&&$tpl->post_type==='card_templates','Missing mapped posts');
   foreach([[$m['note_id'],'_hebleo_shared_source_id',$source],[$m['templates'][$dir],'_hebleo_shared_direction',$dir]] as $check){$values=$d->get_col($d->prepare("SELECT meta_value FROM {$d->postmeta} WHERE post_id=%d AND meta_key=%s FOR UPDATE",$check[0],$check[1])); demand($values===[$check[2]],'Missing/ambiguous ownership metadata');}
   $nt=$d->get_col($d->prepare("SELECT meta_value FROM {$d->postmeta} WHERE post_id=%d AND meta_key='_card_type' FOR UPDATE",$m['note_id']));$tt=$d->get_col($d->prepare("SELECT meta_value FROM {$d->postmeta} WHERE post_id=%d AND meta_key='_template_card_type' FOR UPDATE",$m['templates'][$dir])); demand(count($nt)===1&&$nt===$tt,'Note/template relationship mismatch');
  } demand($m['templates']['he-en']!==$m['templates']['en-he'],'Directions require distinct template IDs');}
 }
}
/** Applied only at prepare_study_card's final return; retains IDs, intervals and state. */
function project(array $card,$progress,array $s): array {
 foreach($s['map']??[] as $source=>$m) if($m['note_id']===(int)$progress->note_id){foreach($m['templates'] as $direction=>$tid)if($tid===(int)$progress->template_id){
  $n=$s['notes'][$source]??null;if(!$n)return $card;
  // Pending audio must not silently continue playing the replaced recording.

  foreach(['front','back'] as $f){$doc=bridge_document(feedback_document($n['documents'][$direction][$f],$source));$card[$f]='<iframe data-hebleo-shared="1" title="Hebleo vocabulary card" sandbox="allow-scripts" referrerpolicy="no-referrer" style="width:100%;min-height:120px;height:240px;border:0" srcdoc="'.htmlspecialchars($doc,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8').'"></iframe>';}
  return $card;
 }} return $card;
}
if(function_exists('add_filter'))add_filter('hebleo_shared_study_card',function($card,$progress){global $wpdb;return project($card,$progress,(new WordPressStore($wpdb))->forNote((int)$progress->note_id));},10,2);

/** Apply only an artifact's reviewed form binding; raw fields stay byte-for-byte unchanged. */
function apply_audio(array &$s,array $u): void {
 $id=$u['sourceId'];$key=digest([$id,$u['formKey'],$u['formValue']]);
 $b=$s['bindings'][$key]??null; demand($b!==null && $b['sourceId']===$id && $b['formKey']===$u['formKey'] && $b['formValue']===$u['formValue'],'Unreviewed/missing form binding');
 demand(digest($s['notes'][$id]['raw'])===$u['rawHash'],'Changed raw source');
 filename($b['file']); filename($u['media']['file']);
 $old=$b['file'];$base=$s['mediaBaseUrl'];
 demand(is_string($base)&&filter_var($base,FILTER_VALIDATE_URL)&&parse_url($base,PHP_URL_SCHEME)==='https'&&str_ends_with($base,'/'),'Verified HTTPS media base required');
 foreach(['he-en','en-he'] as $d)foreach(['front','back'] as $f){
  // Only replace full media URL attributes, never source text/script/CSP.
  foreach(array_unique([$old,$s['audio'][$key]['media']['file']??$old]) as $oldFile) foreach(['data-audio','src'] as $attr){$from=$attr.'="'.$base.$oldFile.'"';$to=$attr.'="'.$base.$u['media']['file'].'"';$s['notes'][$id]['documents'][$d][$f]=str_replace($from,$to,$s['notes'][$id]['documents'][$d][$f]);}
 }
}

/** Explicit admin entry points; not registered as public HTTP routes. */
function admin_import(string $path,string $approvedSha,array $map,string $expected,string $mediaRoot,string $nonce):array {
 authorize($nonce); global $wpdb;return (new Importer(new WordPressStore($wpdb)))->apply(artifact($path,$approvedSha),$map,$expected,$mediaRoot);
}
function seal_receipt(array $receipt):array {return ['receipt'=>$receipt,'mac'=>hash_hmac('sha256',digest($receipt),wp_salt('auth'))];}
function admin_rollback(array $sealed,string $nonce):array {
 authorize($nonce);demand(hash_equals(hash_hmac('sha256',digest($sealed['receipt']),wp_salt('auth')),$sealed['mac']),'Untrusted rollback receipt');
 global $wpdb;return (new Importer(new WordPressStore($wpdb)))->rollback($sealed['receipt']);
}
function admin_audio(array $update,string $expected,string $mediaRoot,string $nonce):array {
 authorize($nonce);global $wpdb;return seal_receipt((new Importer(new WordPressStore($wpdb)))->audio($update,$expected,$mediaRoot));
}

/** Explicit additive provisioning. Creates drafts only, no deck/course membership or progress. */
function admin_provision(array $p,string $nonce):array {
 authorize($nonce);validate($p);global $wpdb;$store=new WordPressStore($wpdb);
 return $store->atomic(function()use($p,$store){
  $find=function(string $type,string $key,string $value,array $meta,array $seed=[]) use($store) {
   $ids=get_posts(['post_type'=>$type,'post_status'=>'any','posts_per_page'=>2,'fields'=>'ids','meta_key'=>$key,'meta_value'=>$value,'suppress_filters'=>true]);
   demand(count($ids)<=1,'Ambiguous additive namespace');
   if($ids){$id=(int)$ids[0];foreach($meta as $k=>$v)demand(get_post_meta($id,$k,true)===$v,'Provisioned post changed');return $id;}
   $savedPost=$_POST;$_POST=[];try{$id=wp_insert_post(wp_slash(['post_type'=>$type,'post_status'=>'draft','post_title'=>'Hebleo shared vocabulary','meta_input'=>array_merge($meta,$seed)]),true);}finally{$_POST=$savedPost;}if(!is_wp_error($id))$store->touch((int)$id);demand(!is_wp_error($id)&&$id>0,'Draft creation failed');return (int)$id;
  };
  $type=$find('note_types','_hebleo_shared_namespace','anki-v2.1',['_hebleo_shared_namespace'=>'anki-v2.1','_card_type_fields'=>array_map(fn($name)=>['name'=>$name,'type'=>'text'],FIELDS)]);
  $templates=[];foreach(['he-en','en-he'] as $dir)$templates[$dir]=$find('card_templates','_hebleo_shared_namespace','anki-v2.1:'.$dir,['_hebleo_shared_namespace'=>'anki-v2.1:'.$dir,'_hebleo_shared_direction'=>$dir,'_template_card_type'=>(string)$type,'_front_template'=>$dir==='he-en'?'{{Hebrew}}':'{{English}}','_back_template'=>$dir==='he-en'?'{{English}}<hr>{{Forms}}{{Notes}}{{Source}}':'{{HebrewNikkud}}<hr>{{Forms}}{{Notes}}{{Source}}']);
  $map=[];foreach($p['notes'] as $n){$id=$find('notes','_hebleo_shared_source_id',$n['id'],['_hebleo_shared_source_id'=>$n['id'],'_card_type'=>(string)$type],['_card_field_data'=>$n['fields']]);$map[$n['id']]=['note_id'=>$id,'templates'=>$templates];}
  $store->verify($map);return $map;
 });
}

if(function_exists('add_action')){ $enqueue=function(){wp_enqueue_script('hebleo-shared-frame',plugins_url('frame-host.js',__FILE__),[],hash_file('sha256',__DIR__.'/frame-host.js'),false);};add_action('wp_enqueue_scripts',$enqueue);add_action('admin_enqueue_scripts',$enqueue); }
