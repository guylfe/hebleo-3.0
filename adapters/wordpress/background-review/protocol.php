<?php
/** Additive per-user protocol metadata. No content or FSRS algorithm changes. */
namespace HebleoBackground;
const HORIZON=86400000;
/** Millisecond UTC avoids inventing a future-time allowance for a seconds clock. */
function now(): int { return (int)\apply_filters('hebleo_background_now_ms',(int)floor(microtime(true)*1000)); }
function site(): string { return rtrim(\home_url('/'),'/'); }
function canonical($v): string {
 if(is_array($v)){if(array_is_list($v))return '['.implode(',',array_map(__NAMESPACE__.'\\canonical',$v)).']';ksort($v,SORT_STRING);$a=[];foreach($v as $k=>$x)$a[]=canonical((string)$k).':'.canonical($x);return '{'.implode(',',$a).'}';}
 return json_encode($v,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
}
function hash_intent(array $i): string {return hash('sha256',canonical($i));}
function key(string $kind,string $id): string {return '_hebleo_bg_v1_'.$kind.'_'.hash('sha256',$id);}
function load(int $u,string $kind,string $id): ?array {
 global $wpdb;$s=$wpdb->get_var($wpdb->prepare("SELECT meta_value FROM {$wpdb->usermeta} WHERE user_id=%d AND meta_key=%s ORDER BY umeta_id DESC LIMIT 1",$u,key($kind,$id)));$v=is_string($s)?json_decode($s,true):null;return is_array($v)?$v:null;
}
function put(int $u,string $kind,string $id,array $v): void {
 if($kind==='receipt')$v['retainedUntil']=($v['committedAt']??$v['rejectedAt'])+7*HORIZON;
 $s=\wp_json_encode($v,JSON_THROW_ON_ERROR);$k=key($kind,$id);$ok=\update_user_meta($u,$k,\wp_slash($s));if($ok===false&&load($u,$kind,$id)!==$v)throw new \RuntimeException('Protocol persistence failed');
}
function intent(array $i,int $u): array {
 $fields=['protocolVersion','siteId','ownerId','requestId','cardId','siblingGroupId','expectedVersion','rating','clockTicketId','elapsedMs'];$keys=array_keys($i);sort($keys);sort($fields);if($keys!==$fields)throw new \RuntimeException('Invalid intent fields');
 if($i['protocolVersion']!==1||$i['siteId']!==site()||$i['ownerId']!==(string)$u||!is_int($i['rating'])||!in_array($i['rating'],[1,2,3,4],true)||!is_int($i['elapsedMs'])||$i['elapsedMs']<0||$i['elapsedMs']>HORIZON)throw new \RuntimeException('Invalid intent');
 foreach(['requestId','clockTicketId'] as $k)if(!is_string($i[$k])||!preg_match('/\A[A-Za-z0-9-]{16,80}\z/D',$i[$k]))throw new \RuntimeException('Invalid identity');
 if(!is_string($i['cardId'])||!preg_match('/\A[1-9][0-9]{0,18}:[1-9][0-9]{0,18}\z/D',$i['cardId'])||!is_string($i['siblingGroupId'])||explode(':',$i['cardId'])[0]!==$i['siblingGroupId']||!is_string($i['expectedVersion'])||!preg_match('/\A[a-f0-9]{64}\z/D',$i['expectedVersion']))throw new \RuntimeException('Invalid card');return $i;
}
function receipt(int $u,array $i): ?array {$r=load($u,'receipt',$i['requestId']);if($r!==null)unset($r['retainedUntil']);if($r!==null&&!hash_equals($r['intentHash'],hash_intent($i)))throw new \RuntimeException('Request identity reused');return $r;}
function reject(int $u,array $i,string $reason,int $at): array {
 $r=['protocolVersion'=>1,'requestId'=>$i['requestId'],'intentHash'=>hash_intent($i),'outcome'=>'rejected','cardId'=>$i['cardId'],'expectedVersion'=>$i['expectedVersion'],'reasonCode'=>$reason,'rejectedAt'=>$at];put($u,'receipt',$i['requestId'],$r);return $r;
}
/** Runs after progress/note locks. Receipt lookup precedes ticket expiry and CAS. */
function validate(int $u,$p,array $meta,array $day,array $i): array {
 $at=now();$t=load($u,'ticket',$i['clockTicketId']);
 if(!$t||$t['siteId']!==site()||$t['ownerId']!==(string)$u||$t['cardId']!==$i['cardId']||$t['expectedVersion']!==$i['expectedVersion'])return ['reject'=>'clock-ticket','now'=>$at];
 if($at<$t['issuedAt'])throw new \RuntimeException('Server clock regressed');
 $answer=$t['issuedAt']+$i['elapsedMs'];if($at>$t['expiresAt'])return ['reject'=>'expired','now'=>$at];if($answer>$at)return ['reject'=>'future-answer','now'=>$at];$sec=intdiv($answer,1000);
 if(!hash_equals(\HebleoFollowup\version($p,$meta),$i['expectedVersion']))return ['reject'=>'version-changed','now'=>$at];
 if((int)($p->suspended??0)!==0)return ['reject'=>'suspended','now'=>$at];
 $last=max((int)($meta['last_review_utc']??(\HebleoStudy\parse_local($p->last_reviewed??null,\wp_timezone())??0)),(int)($day['reviewed_utc']??0));
 if($sec<$last||$answer<max((int)($meta['last_review_ms']??0),(int)($day['reviewed_ms']??0)))return ['reject'=>'answer-before-review','now'=>$at];
 if(\HebleoFollowup\buried($day,(int)$p->template_id,$sec)||\HebleoFollowup\buried($day,(int)$p->template_id,intdiv($at,1000)))return ['reject'=>'sibling-buried','now'=>$at];
 $due=$meta['due_utc']??\HebleoStudy\parse_local($p->next_review??null,\wp_timezone());if($p->state!=='new'&&($due===null||$due>$sec))return ['reject'=>'not-due','now'=>$at];
 return ['answer'=>$sec,'accepted'=>$answer,'now'=>$at];
}
function committed(int $u,$p,array $s,array $i,int $accepted,int $at): array {
 global $wpdb;$fresh=$wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}flashcard_progress WHERE id=%d",$p->id));
 $r=['protocolVersion'=>1,'requestId'=>$i['requestId'],'intentHash'=>hash_intent($i),'outcome'=>'committed','cardId'=>$i['cardId'],'expectedVersion'=>$i['expectedVersion'],'resultingVersion'=>\HebleoFollowup\version($fresh),'acceptedAnswerAt'=>$accepted,'committedAt'=>$at,'authoritativeSchedule'=>['due'=>gmdate('Y-m-d\TH:i:s\Z',$s['due']),'state'=>$s['state'],'step'=>$s['step']],'siblingsUntil'=>\HebleoFollowup\next_day(intdiv($accepted,1000))*1000];put($u,'receipt',$i['requestId'],$r);return $r;
}
function issue(int $u,array $ids): array {
 global $wpdb;$out=[];$at=now();
 // Horizon retention, never count eviction: tickets/anchors expire after 24h;
 // committed and rejected receipts remain recoverable for seven days.
 foreach(['ticket'=>'expiresAt','anchor'=>'expiresAt','receipt'=>'retainedUntil'] as $kind=>$field){$pattern=$wpdb->esc_like('_hebleo_bg_v1_'.$kind.'_').'%';if($wpdb->query($wpdb->prepare("DELETE FROM {$wpdb->usermeta} WHERE user_id=%d AND meta_key LIKE %s AND JSON_VALID(meta_value) AND CAST(JSON_UNQUOTE(JSON_EXTRACT(meta_value,%s)) AS UNSIGNED)<%d",$u,$pattern,'$.'.$field,$at))===false)throw new \RuntimeException('Protocol retention failed');}
 foreach($ids as $id){if(!is_string($id)||!preg_match('/\A[1-9][0-9]{0,18}:[1-9][0-9]{0,18}\z/D',$id))throw new \RuntimeException('Invalid clock card');[$n,$t]=array_map('intval',explode(':',$id));$lock=\HebleoFollowup\lock($u,$n);try{
 $p=$wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}flashcard_progress WHERE user_id=%d AND note_id=%d AND template_id=%d",$u,$n,$t));if(!$p)continue;$v=\HebleoFollowup\version($p);$at=now();$index=$id.'|'.$v;$old=load($u,'anchor',$index);$ticket=$old?load($u,'ticket',$old['id']):null;
 if(!$ticket||$ticket['expiresAt']<=$at){$tid=\wp_generate_uuid4();$ticket=['id'=>$tid,'cardId'=>$id,'expectedVersion'=>$v,'siteId'=>site(),'ownerId'=>(string)$u,'issuedAt'=>$at,'expiresAt'=>$at+HORIZON];put($u,'ticket',$tid,$ticket);put($u,'anchor',$index,['id'=>$tid,'expiresAt'=>$at+HORIZON]);}
 $out[]=['cardId'=>$id,'expectedVersion'=>$v,'clockTicketId'=>$ticket['id'],'issuedAt'=>$ticket['issuedAt'],'expiresAt'=>$ticket['expiresAt']];
 }finally{\HebleoFollowup\unlock($lock);}}return ['anchors'=>$out,'serverNow'=>now(),'siteId'=>site(),'ownerId'=>(string)$u];
}
function dispatch(): void {
 if(($_SERVER['REQUEST_METHOD']??'')!=='POST'||($_GET['hebleo_review']??null)!=='1'||\is_admin())return;$action=$_POST['action']??null;if(!in_array($action,['hebleo_bg_clock','hebleo_bg_save','hebleo_bg_status'],true))return;\nocache_headers();
 try{
 $allowed=['action'=>32,'nonce'=>64,'intent'=>4096,'card_ids'=>4096,'request_id'=>80];if((int)($_SERVER['CONTENT_LENGTH']??0)>8192||count($_POST)>count($allowed)||!empty($_FILES))throw new \RuntimeException('Invalid request');foreach($_POST as $k=>$v)if(!isset($allowed[$k])||!is_string($v)||strlen($v)>$allowed[$k])throw new \RuntimeException('Invalid scalar');
 if(isset($_SERVER['HTTP_ORIGIN'])&&rtrim($_SERVER['HTTP_ORIGIN'],'/')!==site())throw new \RuntimeException('Security check failed');if(!\wp_verify_nonce($_POST['nonce']??'','study_nonce')||!($u=\get_current_user_id()))throw new \RuntimeException('Security check failed');
 if($action==='hebleo_bg_clock'){$ids=json_decode(\wp_unslash($_POST['card_ids']??''),true,4,JSON_THROW_ON_ERROR);if(!is_array($ids)||!array_is_list($ids)||count($ids)>100)throw new \RuntimeException('Invalid clock request');$result=issue($u,$ids);}
 elseif($action==='hebleo_bg_status'){$id=$_POST['request_id']??'';if(!preg_match('/\A[A-Za-z0-9-]{16,80}\z/D',$id))throw new \RuntimeException('Invalid request');$result=['receipt'=>load($u,'receipt',$id),'serverNow'=>now(),'siteId'=>site(),'ownerId'=>(string)$u];}
 else{$i=intent(json_decode(\wp_unslash($_POST['intent']??''),true,8,JSON_THROW_ON_ERROR),$u);[$n,$t]=array_map('intval',explode(':',$i['cardId']));$saved=\HebleoStudy\persist_rating($u,$n,$t,$i['rating'],null,['id'=>$i['requestId'],'version'=>$i['expectedVersion'],'background'=>$i]);$result=['receipt'=>$saved['background_receipt'],'serverNow'=>now(),'siteId'=>site(),'ownerId'=>(string)$u];if(empty($saved['duplicate'])&&$result['receipt']['outcome']==='committed')\update_user_streak($u);}
 \wp_send_json_success($result);
 }catch(\Throwable $e){\wp_send_json_error($e->getMessage());}
}
\add_action('wp_loaded',__NAMESPACE__.'\\dispatch',PHP_INT_MAX);
