<?php
// Isolated WordPress API doubles: exercise real shortcode, no WordPress writes.
define('ABSPATH',__DIR__);$logged=false;$userId=0;$override=false;$access=null;$hooks=[];$filterCalls=0;
function is_user_logged_in(){global $logged;return $logged;}function get_current_user_id(){global $userId;return $userId;}
function apply_filters($name,$default,$id){global $override,$access,$filterCalls;if($name!=='hebleo_conjugation_access'||$id!==7||$default!==true)throw new Exception('wrong gate');$filterCalls++;return $override?$access:$default;}
function sfwd_lms_has_access(...$a){throw new Exception('course audience must not be consulted');}
function add_action(...$args){}function add_shortcode($name,$fn){global $hooks;$hooks[$name]=$fn;}
function wp_unique_id($p){static $n=0;return $p.(++$n);}function wp_enqueue_style(...$x){}function plugins_url($p,$f){return 'https://fixture.invalid/'.$p;}function esc_attr($s){return htmlspecialchars($s,ENT_QUOTES);}function esc_url($s){return esc_attr($s);}function wp_json_encode($v,$flags){return json_encode($v,$flags);}
require $argv[1];
function ok($v,$m){if(!$v)throw new Exception($m);echo "PASS $m\n";}
ok(isset($hooks['hebleo_conjugation']),'shortcode registered');
ok(str_contains(HebleoConjugation\shortcode(),'unavailable for this account'),'anonymous blocked');
$override=true;$access=true;
ok(!HebleoConjugation\allowed()&&$filterCalls===0,'filter cannot authorize anonymous account');
$logged=true;
ok(!HebleoConjugation\allowed(),'zero user id blocked even with inconsistent login double');
$userId=7;$override=false;
$html=HebleoConjugation\shortcode();ok(str_contains($html,'data-conjugation-catalog'),'signed-in account needs no entitlement mapping');ok(!str_contains($html,'allowFixtures'),'production has no fixture enable flag');ok(str_contains($html,'type="module"'),'native module bootstrap');
$override=true;
ok(str_contains($html,'data-conjugation-owner="7"'),'stable signed-in owner metadata');
foreach([false,null,0,1,'yes'] as $value){$access=$value;ok(!HebleoConjugation\allowed(),'restriction requires strict true: '.json_encode($value));}
$access=false;
ok(!str_contains(HebleoConjugation\shortcode(),'data-conjugation-catalog'),'denied signed-in account receives no catalog');
$access=true;
ok(HebleoConjugation\allowed(),'strict true restriction retains authenticated access');
