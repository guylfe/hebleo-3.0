<?php
// Derived from Architect protocol-probe.php reviewed6Nov, local source owner Leo3.0.
// Original nine probes retained; only pinned include and clock injection adapted.

// Executes pinned production validation code. WordPress storage/auth surroundings
// are in-memory stubs; this is not a native WordPress/MariaDB integration test.
class ProbeDB {
 public string $usermeta='probe_usermeta';
 public string $prefix='probe_';
 public array $values=[];
 function prepare($sql,...$args){return [$sql,$args];}
 function get_var($prepared){[$sql,$args]=$prepared;return $this->values[$args[0].'|'.$args[1]]??null;}
}
$wpdb=new ProbeDB();$clock=1793926200;
function add_action(...$args){}
function apply_filters($name,$value){return $name==='hebleo_background_now_ms'?$GLOBALS['clock']*1000:($name==='hebleo_study_scheduler_now'?$GLOBALS['clock']:$value);}
function home_url($path='/'){return 'https://fixture.invalid'.$path;}
function wp_timezone(){return new DateTimeZone('UTC');}
function wp_json_encode($value,$flags=0){return json_encode($value,$flags);}
function wp_slash($v){return $v;}
function update_user_meta($u,$key,$v){$GLOBALS['wpdb']->values[$u.'|'.$key]=$v;return true;}
function get_user_meta($u,$key,$single){return $GLOBALS['wpdb']->values[$u.'|'.$key]??null;}
function wp_get_current_user(){return (object)['ID'=>1];}
function wp_get_session_token(){return 'synthetic-session-only';}
function wp_nonce_tick($action=-1){return $GLOBALS['nonceTick'];}
function wp_hash($data,$scheme='auth',$algo='md5'){return hash_hmac('sha256',$data,'synthetic-fixture-only');}
function do_action(...$args){}
require $argv[1]; // Real WordPress wp_create_nonce/wp_verify_nonce; no wp-config/database bootstrap.
$nonceTick=100;$nonceA=wp_create_nonce('study_nonce');$nonceTick=101;$nonceB=wp_create_nonce('study_nonce');
require ($argv[2]??throw new RuntimeException('Pinned plugin root required')).'/study-scheduler/wordpress.php';
$p=(object)['id'=>1,'user_id'=>1,'note_id'=>10,'template_id'=>20,'deck_id'=>30,'stability'=>'0.0000','difficulty'=>'0.0000','state'=>'new','reps'=>0,'lapses'=>0,'last_reviewed'=>null,'next_review'=>'2020-01-01 00:00:00','suspended'=>0];
$version=\HebleoFollowup\version($p,[]);
$ticket=['id'=>'clock-ticket-00000001','siteId'=>'https://fixture.invalid','ownerId'=>'1','cardId'=>'10:20','expectedVersion'=>$version,'issuedAt'=>$clock*1000,'expiresAt'=>($clock+86400)*1000,'nonceHash'=>hash('sha256',$nonceA)];
\HebleoBackground\put(1,'ticket',$ticket['id'],$ticket);
$intent=['protocolVersion'=>1,'siteId'=>'https://fixture.invalid','ownerId'=>'1','requestId'=>'request-000000000001','cardId'=>'10:20','siblingGroupId'=>'10','expectedVersion'=>$version,'rating'=>3,'clockTicketId'=>$ticket['id'],'elapsedMs'=>1000];
$results=[];
function probe($name,$pass,$actual){global $results;$results[]=['name'=>$name,'pass'=>$pass,'actual'=>$actual];}
probe('old and refreshed WordPress nonces are both valid for same user/session',wp_verify_nonce($nonceA,'study_nonce')===2&&wp_verify_nonce($nonceB,'study_nonce')===1,['old'=>wp_verify_nonce($nonceA,'study_nonce'),'fresh'=>wp_verify_nonce($nonceB,'study_nonce')]);
$_POST=['nonce'=>$nonceA];$clock+=120;
$r=\HebleoBackground\validate(1,$p,[],[],$intent);
probe('delayed delivery preserves answer time',($r['accepted']??null)===$ticket['issuedAt']+1000,$r);
// A reload can supply a newly minted, valid nonce for this SAME user/session.
$_POST=['nonce'=>$nonceB];
$r=\HebleoBackground\validate(1,$p,[],[],$intent);
probe('same account reload with refreshed CSRF nonce preserves queued answer',isset($r['accepted']),$r);
$_POST=['nonce'=>$nonceA];$clock=intdiv($ticket['issuedAt'],1000)+10;
$future=array_replace($intent,['elapsedMs'=>60000]);
$r=\HebleoBackground\validate(1,$p,[],[],$future);
probe('future answer is rejected rather than silently rebased',($r['reject']??null)==='future-answer',$r);
foreach(['wrong owner'=>['ownerId'=>'2'],'wrong site'=>['siteId'=>'https://other.invalid'],'noninteger elapsed'=>['elapsedMs'=>0.5]] as $name=>$change){try{\HebleoBackground\intent(array_replace($intent,$change),1);probe($name,false,'accepted');}catch(RuntimeException $e){probe($name,true,$e->getMessage());}}
$committed=['protocolVersion'=>1,'requestId'=>$intent['requestId'],'intentHash'=>\HebleoBackground\hash_intent($intent),'outcome'=>'committed','committedAt'=>$clock*1000];
\HebleoBackground\put(1,'receipt',$intent['requestId'],$committed);
probe('immutable receipt survives changed current nonce',\HebleoBackground\receipt(1,$intent)===$committed,\HebleoBackground\receipt(1,$intent));
try{\HebleoBackground\receipt(1,array_replace($intent,['rating'=>4]));probe('changed immutable payload rejected',false,'accepted');}catch(RuntimeException $e){probe('changed immutable payload rejected',true,$e->getMessage());}
echo json_encode(['source'=>'pinned generated candidate protocol','environment'=>'unit harness, production PHP functions with stubbed WordPress storage','results'=>$results],JSON_PRETTY_PRINT).PHP_EOL;
exit(count(array_filter($results,fn($r)=>!$r['pass']))?1:0);
