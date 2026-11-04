<?php
require $argv[1].'/shared-cards/shared-cards.php';
$p=json_decode(file_get_contents($argv[2]),true,512,JSON_THROW_ON_ERROR);
$out=[];$types=[];$long=null;
foreach($p['notes'] as $n){
 preg_match('/class="hc-type">([^<]+)/',$n['documents']['he-en']['back'],$m);$type=$m[1]??'Other';
 $size=strlen($n['fields']['Forms'])+strlen($n['fields']['Notes']);
 if(!isset($types[$type])||$size>$types[$type]['size'])$types[$type]=['size'=>$size,'note'=>$n];
}
$picked=[$p['notes'][0]];foreach($types as $t)$picked[]=$t['note'];
foreach($p['notes'] as $n)if($n['id']==='mf-000300')$picked[]=$n; // Actual inflected preposition.
foreach($picked as $n){$out[$n['id']]=$n;foreach(['he-en','en-he'] as $d)foreach(['front','back'] as $f)$out[$n['id']]['documents'][$d][$f]=HebleoShared\bridge_document($n['documents'][$d][$f]);}
file_put_contents($argv[3],json_encode($out,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR));
echo count($out)." actual representative notes transformed\n";
