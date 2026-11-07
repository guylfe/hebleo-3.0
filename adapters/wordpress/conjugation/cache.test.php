<?php
namespace HebleoConjugation { function header($value,$replace=true){$GLOBALS['cacheHeaders'][]=$value;} }
namespace {
define('ABSPATH',__DIR__);class WP_Post {public $post_content='';}
$singular=false;$post=new WP_Post;$actions=[];$cacheHeaders=[];$noCacheCalls=0;
function add_action($name,$callback,$priority=10){$GLOBALS['actions'][$name]=[$callback,$priority];}
function add_shortcode(...$args){}
function is_singular(){return $GLOBALS['singular'];}
function get_queried_object(){return $GLOBALS['post'];}
function has_shortcode($content,$tag){return str_contains($content,'['.$tag.']');}
function nocache_headers(){$GLOBALS['noCacheCalls']++;}
function do_action(...$args){$GLOBALS['fired']=$args;}
require __DIR__.'/conjugation.php';
function check($v){if(!$v)throw new \Exception('Cache assertion failed');}
check($actions['template_redirect'][1]===0);
\HebleoConjugation\protect_page_cache();check($noCacheCalls===0);
$singular=true;\HebleoConjugation\protect_page_cache();check($noCacheCalls===0);
$post->post_content='[hebleo_conjugation]';\HebleoConjugation\protect_page_cache();
check(DONOTCACHEPAGE===true&&$noCacheCalls===1);
check(in_array('EC-CDN-Cache-Control: private, no-store, no-cache, max-age=0',$cacheHeaders,true));
check(str_contains($cacheHeaders[0],'private, no-store'));
check($fired[0]==='litespeed_control_set_nocache');echo "PASS scoped page cache and hosting CDN protection\n";
}
