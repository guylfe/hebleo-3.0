<?php
namespace HebleoShared;
/** Adds only this reviewed bridge script hash; never permits arbitrary inline script. */
function bridge_document(string $doc):string {
 $script=str_replace(["\r\n","\r"],"\n",file_get_contents(__DIR__.'/frame-child.js'));$hash=base64_encode(hash('sha256',$script,true));
 $doc=preg_replace_callback('/(<meta http-equiv="Content-Security-Policy" content=")([^"]*)(")/',function($m)use($hash){$policy=html_entity_decode($m[2],ENT_QUOTES,'UTF-8');demand(str_contains($policy,'script-src '),'Missing script policy');$policy=str_replace('script-src ',"script-src 'sha256-".$hash."' ",$policy);return $m[1].htmlspecialchars($policy,ENT_QUOTES,'UTF-8').$m[3];},$doc,1,$count);
 demand($count===1,'Missing card document CSP');return str_replace('</body>','<script>'.$script.'</script></body>',$doc);
}
