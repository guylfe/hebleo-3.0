<?php
namespace HebleoFollowup;
function key(int $note): string { return '_hebleo_note_day_v1_'.$note; }
function load(int $user,int $note): array {
 global $wpdb;$raw=$wpdb->get_var($wpdb->prepare("SELECT meta_value FROM {$wpdb->usermeta} WHERE user_id=%d AND meta_key=%s ORDER BY umeta_id DESC LIMIT 1",$user,key($note)));$s=is_string($raw)?json_decode($raw,true):null;
 return is_array($s)&&($s['schema']??null)===1&&($s['note_id']??null)===$note&&is_int($s['allowed_template']??null)&&$s['allowed_template']>0&&is_int($s['expires_utc']??null)&&$s['expires_utc']>0&&$s['expires_utc']<=253402300799?$s:[];
}
function next_day(int $now): int { return (new \DateTimeImmutable('@'.$now))->setTimezone(\wp_timezone())->modify('tomorrow')->setTime(0,0,0)->getTimestamp(); }
function buried(array $s,int $template,int $now): bool { return ($s['expires_utc']??0)>$now&&($s['allowed_template']??$template)!==$template; }
function sql(int $now): array {
 global $wpdb;$j="CASE WHEN JSON_VALID(hday.meta_value) THEN hday.meta_value ELSE '{}' END";$get=static fn($k)=>"JSON_UNQUOTE(JSON_EXTRACT(($j),'$.$k'))";$type=static fn($k)=>"JSON_TYPE(JSON_EXTRACT(($j),'$.$k'))";
 $valid=$type('schema')."='INTEGER' AND ".$get('schema')."='1' AND ".$type('note_id')."='INTEGER' AND ".$get('note_id')."=p.note_id AND ".$type('allowed_template')."='INTEGER' AND ".$get('allowed_template').">0 AND ".$type('expires_utc')."='INTEGER' AND ".$get('expires_utc')." BETWEEN 1 AND 253402300799";
 return ['join'=>"LEFT JOIN {$wpdb->usermeta} hday ON hday.umeta_id=(SELECT MAX(hn.umeta_id) FROM {$wpdb->usermeta} hn WHERE hn.user_id=p.user_id AND hn.meta_key=CONCAT('_hebleo_note_day_v1_',p.note_id))",'where'=>"(CASE WHEN ($valid) THEN NOT (CAST(".$get('expires_utc')." AS SIGNED)>$now AND CAST(".$get('allowed_template')." AS SIGNED)<>p.template_id) ELSE 1 END)"];
}
function lock(int $user,int $note): string { global $wpdb;$k='hf_'.substr(hash('sha256',$wpdb->prefix.'|'.$user.'|'.$note),0,60);if((int)$wpdb->get_var($wpdb->prepare('SELECT GET_LOCK(%s,10)',$k))!==1)throw new \RuntimeException('Note is busy');return $k; }
function unlock(?string $k): void {global $wpdb;if($k!==null)$wpdb->get_var($wpdb->prepare('SELECT RELEASE_LOCK(%s)',$k));}
function version($p,?array $meta=null): string {
 $fields=[];foreach(['id','user_id','note_id','template_id','deck_id','stability','difficulty','state','reps','lapses','last_reviewed','next_review','suspended'] as $k)$fields[$k]=(string)($p->$k??'');
 return hash('sha256',\wp_json_encode([$fields,$meta??\HebleoStudy\read_meta($p)],JSON_PRESERVE_ZERO_FRACTION));
}
function request_from_post(): ?array {
 if(empty($_POST['request_id']))return null;
 $id=(string)$_POST['request_id'];$v=(string)($_POST['expected_version']??'');
 if(!preg_match('/\A[A-Za-z0-9-]{16,80}\z/D',$id)||!preg_match('/\A[a-f0-9]{64}\z/D',$v))throw new \RuntimeException('Invalid review request');
 return ['id'=>$id,'version'=>$v];
}
function duplicate(array $state,?array $request,int $template,int $grade): ?array {
 if($request===null)return null;$old=$state['receipts'][$request['id']]??null;if(!is_array($old))return null;
 if(($old['template_id']??null)!==$template||($old['rating']??null)!==$grade||($old['expected_version']??null)!==$request['version'])throw new \RuntimeException('Request identity reused');
 $result=$old['result'];$result['duplicate']=true;return $result;
}
function record(int $user,$p,array $result,int $grade,int $now,?array $request,array $prior): array {
 $note=(int)$p->note_id;$template=(int)$p->template_id;$until=next_day($now);
 $result['review_receipt']=['request_id'=>$request['id']??null,'note_id'=>$note,'template_id'=>$template,'rating'=>$grade,'reviewed_utc'=>$now,'siblings_until_utc'=>$until];
 $receipts=is_array($prior['receipts']??null)?$prior['receipts']:[];
 if($request!==null){$receipts[$request['id']]=['template_id'=>$template,'rating'=>$grade,'expected_version'=>$request['version'],'result'=>$result];$receipts=array_slice($receipts,-32,null,true);}
 $state=['schema'=>1,'note_id'=>$note,'allowed_template'=>$template,'expires_utc'=>$until,'reviewed_utc'=>$now,'receipts'=>$receipts];$json=\wp_json_encode($state,JSON_PRESERVE_ZERO_FRACTION|JSON_THROW_ON_ERROR);
 $ok=\update_user_meta($user,key($note),\wp_slash($json));if($ok===false&&\get_user_meta($user,key($note),true)!==$json)throw new \RuntimeException('Unable to save sibling state');
 return $result;
}
function status(): void {
 if(!\wp_verify_nonce($_POST['nonce']??'','study_nonce')||!($user=\get_current_user_id())){\wp_send_json_error('Security check failed');return;}
 $note=(int)($_POST['note_id']??0);$id=(string)($_POST['request_id']??'');if($note<=0||!preg_match('/\A[A-Za-z0-9-]{16,80}\z/D',$id)){\wp_send_json_error('Invalid request');return;}
 $s=load($user,$note);$receipt=$s['receipts'][$id]['result']['review_receipt']??null;
 \wp_send_json_success(['state'=>is_array($receipt)?'committed':'unknown','receipt'=>$receipt]);
}
\add_action('wp_ajax_hebleo_review_status',__NAMESPACE__.'\\status');

require_once __DIR__.'/frontend.php';
