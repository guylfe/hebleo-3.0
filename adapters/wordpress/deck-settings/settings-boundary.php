<?php
// Execute the unchanged installed handler behind the updated frontend dispatcher.
$source=file_get_contents($argv[1]);
if(!preg_match('/function ajax_get_deck_settings\(\) \{[\s\S]*?^\}/m',$source,$match))throw new RuntimeException('Installed handler missing');
$owner=1;$checks=0;$writes=0;
function add_action($h,$c,$p){}
function is_admin(){return false;}
function nocache_headers(){}
function home_url($p){return 'https://fixture.invalid/';}
function wp_parse_url($s){return parse_url($s);}
function wp_verify_nonce($n,$a){return $n==='fixture'&&$a==='study_nonce';}
function get_current_user_id(){return $GLOBALS['owner'];}
function wp_send_json_error($s){throw new RuntimeException(json_encode(['success'=>false,'data'=>$s]));}
function wp_send_json_success($s){throw new RuntimeException(json_encode(['success'=>true,'data'=>$s]));}
function ajax_rate_card(){throw new RuntimeException('rate-preserved');}
class SettingsFixtureDB {
 public $prefix='fixture_';public $reads=0;public $rows=[];
 function prepare($q,...$args){return $args;}
 function get_row($args){$this->reads++;return isset($this->rows[$args[0].':'.$args[1]])?(object)$this->rows[$args[0].':'.$args[1]]:null;}
 function __call($name,$args){$GLOBALS['writes']++;throw new RuntimeException('Unexpected database operation');}
}
$wpdb=new SettingsFixtureDB();
eval($match[0]);require __DIR__.'/../followup/frontend.php';
function request($post,$origin='https://fixture.invalid',$method='POST',$marker='1'){
 $_SERVER=['REQUEST_METHOD'=>$method,'HTTP_ORIGIN'=>$origin];$_GET=['hebleo_review'=>$marker];$_POST=$post;$_FILES=[];
 try{\HebleoFollowup\frontend_dispatch();return null;}catch(RuntimeException $e){return json_decode($e->getMessage(),true);}
}
function check($v,$why){if(!$v)throw new RuntimeException($why);$GLOBALS['checks']++;}
$p=['action'=>'get_deck_settings','nonce'=>'fixture','deck_id'=>'7'];
$wpdb->rows['1:7']=['new_cards_per_day'=>20,'max_reviews_per_day'=>200,'card_order'=>'new_first','autoplay_audio'=>1];
$a=request($p);check($a['success']&&$a['data']===$wpdb->rows['1:7'],'Current account/deck values');
$wpdb->rows['1:7']['new_cards_per_day']=35;$b=request($p);check($b['data']['new_cards_per_day']===35&&$wpdb->reads===2,'Each open reads fresh values');
$owner=2;$wpdb->rows['2:7']=['new_cards_per_day'=>8,'max_reviews_per_day'=>100,'card_order'=>'mixed','autoplay_audio'=>0];
check(request($p)['data']===$wpdb->rows['2:7'],'Account isolation');
$p2=$p;$p2['deck_id']='8';check(request($p2)['data']['new_cards_per_day']===20,'Missing deck row returns existing defaults');
$owner=0;check(request($p)['data']==='Please log in','Anonymous rejected');$owner=1;
$bad=$p;$bad['nonce']='bad';check(request($bad)['data']==='Security check failed','Invalid nonce');
$bad=$p;$bad['deck_id']='0';check(request($bad)['data']==='Invalid deck','Invalid deck');
check(request($p,'https://evil.invalid')['data']==='Security check failed','Origin boundary');
check(request($p,'http://fixture.invalid')['data']==='Security check failed','Scheme boundary');
check(request($p,'https://fixture.invalid:444')['data']==='Security check failed','Port boundary');
$bad=$p;$bad['user_id']='2';check(request($bad)['data']==='Invalid request','Cannot supply another account');
$bad=$p;$bad['deck_id']=['7'];check(request($bad)['data']==='Invalid request','Array payload rejected');
$bad=$p;$bad['nonce']=str_repeat('x',65);check(request($bad)['data']==='Invalid request','Bounded nonce');
check(request($p,'https://fixture.invalid','GET')===null,'POST only');
check(request($p,'https://fixture.invalid','POST','2')===null,'Exact endpoint marker');
check($writes===0,'Lookup never writes preferences or learner state');
echo json_encode(['passed'=>true,'checks'=>$checks,'databaseWrites'=>$writes]);
