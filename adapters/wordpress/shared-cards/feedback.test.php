<?php
namespace HebleoShared;
require __DIR__.'/feedback.php';
function check($v,$why){if(!$v)throw new \RuntimeException($why);}
$doc='<div>אַתְ You (singular female)</div><div class="hc-audio"></div>';
check(str_contains(feedback_document($doc,'mf-000014'),'/at.mp3'),'missing verified recording');
check(feedback_document($doc,'mf-000716')===$doc,'unrelated source changed');
check(feedback_document(str_replace('אַתְ','OTHER',$doc),'mf-000014')===str_replace('אַתְ','OTHER',$doc),'changed source overwritten');
$garden='<div>Garden גן</div><p>This is the word for a single male fish.</p>';
check(str_contains(feedback_document($garden,'mf-000035'),'word for a garden.'),'garden not corrected');
check(feedback_document($garden,'mf-000036')===$garden,'unrelated note changed');
echo "PASS five PHP content isolation checks\n";
