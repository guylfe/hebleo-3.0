<?php
require __DIR__.'/fsrs.php';
$cases=json_decode(stream_get_contents(STDIN),true,512,JSON_THROW_ON_ERROR);$out=[];
foreach($cases as $case)$out[]=\HebleoStudy\FSRS::review($case['card'],$case['rating'],$case['now']);
echo json_encode($out,JSON_THROW_ON_ERROR);
