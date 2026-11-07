<?php
// Isolated WordPress API doubles: exercise real shortcode, no WordPress writes.
define('ABSPATH',__DIR__);$logged=false;$access=false;$hooks=[];
function is_user_logged_in(){global $logged;return $logged;}function get_current_user_id(){return 7;}
function apply_filters($name,$default,$id){global $access;if($name!=='hebleo_conjugation_access'||$id!==7)throw new Exception('wrong gate');return $access;}
function add_shortcode($name,$fn){global $hooks;$hooks[$name]=$fn;}
function wp_unique_id($p){static $n=0;return $p.(++$n);}function wp_enqueue_style(...$x){}function plugins_url($p,$f){return 'https://fixture.invalid/'.$p;}function esc_attr($s){return htmlspecialchars($s,ENT_QUOTES);}function esc_url($s){return esc_attr($s);}function wp_json_encode($v,$flags){return json_encode($v,$flags);}
require $argv[1];
function ok($v,$m){if(!$v)throw new Exception($m);echo "PASS $m\n";}
ok(isset($hooks['hebleo_conjugation']),'shortcode registered');
ok(str_contains(HebleoConjugation\shortcode(),'unavailable for this account'),'anonymous blocked');$logged=true;
ok(str_contains(HebleoConjugation\shortcode(),'unavailable for this account'),'unmapped access blocked');$access='yes';ok(!HebleoConjugation\allowed(),'truthy value does not grant access');$access=true;
$html=HebleoConjugation\shortcode();ok(str_contains($html,'data-conjugation-catalog'),'explicit existing access decision enables read-only mount');ok(!str_contains($html,'allowFixtures'),'production has no fixture enable flag');ok(str_contains($html,'type="module"'),'native module bootstrap');
