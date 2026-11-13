<?php
require __DIR__.'/order.php';
use function HebleoNewCardOrder\lesson;
use function HebleoNewCardOrder\select;
$checks = 0;
function check($v, $why) {global $checks; ++$checks; if (!$v) throw new RuntimeException($why);}
function card($n, $t=1) {return (object)['note_id'=>$n,'template_id'=>$t,'state'=>'new'];}
$raw = ['SourceId'=>'mf-000053','Source'=>'<div class="hc-source">Lessons: 2.1.5\\nSource IDs: mf-000053</div>'];
check(lesson($raw,'mf-000053')==='2.1.5','existing escaped provenance');
$raw['Source']="Lessons: 2.3.5, 2.2.5\nSource IDs: mf-000053";
check(lesson($raw,'mf-000053')==='2.2.5','earliest explicit repeat lesson');
check(lesson($raw,'other')===null,'ownership must agree');
$raw['Source']='Lessons: 2.10, 2.2<';
check(lesson($raw,'mf-000053')==='2.2','numeric course codes');
check(lesson(['SourceId'=>'x','Source'=>'Lessons: 2..1'],'x')===null,'invalid code is not guessed');
check(lesson(['SourceId'=>'x','Hebrew'=>'למד'],'x')===null,'Hebrew never supplies a lesson');
$lessons = [46=>'2.1.5',47=>'2.1.5',51=>'2.2.5',52=>'2.4',53=>'2.1.5',60=>'2.1.5',74=>'2.2',87=>'2.3',101=>'2.3.5'];
$input = array_map('card',[46,47,51,52,53,60,74,87,101]);
$read=fn($id)=>$lessons[$id]??null;
$ids=fn($cards)=>array_map(fn($p)=>(int)$p->note_id,$cards);
$before=serialize($input);
check($ids(select($input,[],4,$read))===[46,47,53,60],'early verbs win before limit');
check($ids(select($input,[],20,$read))===[46,47,53,60,74,51,87,101,52],'reported transition follows course');
check(serialize($input)===$before,'input state and IDs unchanged');
check($ids(select($input,['52_1','53_1'],3,$read))===[52,53,46],'saved explicit custom order wins before limit');
check($ids(select($input,['52_1','52_1','bad',1],3,$read))===[52,46,47],'duplicate and invalid saved keys cannot duplicate cards');
check(select($input,[],0,$read)===[],'zero limit');
check(select($input,[],-1,$read)===[],'negative limit');
check(select([],[],10,$read)===[],'empty pool');
check($ids(select([card(99),card(100),card(51)],[],10,$read))===[51,99,100],'unmapped legacy fallback is stable');
check($ids(select([card(51),card(53,2),card(53,1)],[],10,$read))===[53,53,51],'both directions kept');
$calls=0;select([card(46),card(46,2)],[],10,function()use(&$calls){++$calls;return '2.1';});
check($calls===1,'one metadata read per note');
$eligible=array_values(array_filter($input,fn($p)=>!in_array($p->note_id,[46,47,53])));
check($ids(select($eligible,[],1,$read))===[60],'excluded cards do not consume limit');
echo json_encode(['checks'=>$checks,'passed'=>true])."\n";
