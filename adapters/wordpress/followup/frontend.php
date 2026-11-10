<?php
namespace HebleoFollowup;
// Normal frontend only: all plugins/theme/init and earlier wp_loaded callbacks run.
function frontend_dispatch(): void {
 if (($_SERVER['REQUEST_METHOD']??'')!=='POST' || ($_GET['hebleo_review']??null)!=='1' || \is_admin()) return;
 $action=$_POST['action']??null;
 if(!is_string($action)||!in_array($action,['rate_card','hebleo_review_status','get_deck_settings'],true)) return;
 \nocache_headers();
 $allowed=$action==='get_deck_settings'?['action'=>32,'nonce'=>64,'deck_id'=>20]:['action'=>32,'nonce'=>64,'note_id'=>20,'template_id'=>20,'rating'=>1,'request_id'=>80,'expected_version'=>64];
 if((int)($_SERVER['CONTENT_LENGTH']??0)>8192||count($_POST)>count($allowed)||!empty($_FILES)){\wp_send_json_error('Invalid request');return;}
 foreach($_POST as $key=>$value) if(!isset($allowed[$key])||!is_string($value)||strlen($value)>$allowed[$key]){\wp_send_json_error('Invalid request');return;}
 // Nonce and current-user checks remain in the exact native handlers. Reject
 // explicit cross-origin requests as an additional restriction, never use CORS.
 if(isset($_SERVER['HTTP_ORIGIN'])) {
  $origin=\wp_parse_url($_SERVER['HTTP_ORIGIN']);$home=\wp_parse_url(\home_url('/'));
  if(!is_array($origin)||!is_array($home)||strtolower($origin['scheme']??'')!==strtolower($home['scheme']??'')||strtolower($origin['host']??'')!==strtolower($home['host']??'')||($origin['port']??(($origin['scheme']??'')==='https'?443:80))!==($home['port']??(($home['scheme']??'')==='https'?443:80))){\wp_send_json_error('Security check failed');return;}
 }
 if($action==='rate_card') \ajax_rate_card(); elseif($action==='get_deck_settings') \ajax_get_deck_settings(); else status();
}
\add_action('wp_loaded',__NAMESPACE__.'\\frontend_dispatch',PHP_INT_MAX);
