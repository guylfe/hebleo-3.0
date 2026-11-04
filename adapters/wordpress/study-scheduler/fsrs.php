<?php
/** Faithful scalar PHP port of py-fsrs 6.3.2 (FSRS-6), MIT. See upstream/LICENSE.
 * Fixed upstream default weights/steps; fuzz disabled for deterministic preview.
 * UTC Unix seconds throughout. No database or wall-clock reads here.
 */
namespace HebleoStudy;
final class FSRS {
    public const VERSION = 'py-fsrs-6.3.2/php-port-1';
    public const W = [.212,1.2931,2.3065,8.2956,6.4133,.8334,3.0194,.001,1.8722,.1666,.796,1.4835,.0614,.2629,1.6483,.6014,1.8729,.5425,.0912,.0658,.1542];
    private static function difficulty(float $d): float { return min(10.,max(1.,$d)); }
    private static function initialDifficulty(int $g, bool $clamp=true): float {
        $d=self::W[4]-exp(self::W[5]*($g-1))+1;
        return $clamp?self::difficulty($d):$d;
    }
    private static function nextDifficulty(float $d,int $g): float {
        $w=self::W;
        return self::difficulty($w[7]*self::initialDifficulty(4,false)+(1-$w[7])*($d+(10-$d)*(-$w[6]*($g-3))/9));
    }
    private static function interval(float $s): int {
        $decay=-self::W[20];$factor=pow(.9,1/$decay)-1;
        return (int)max(1,min(36500,round(($s/$factor)*(pow(.9,1/$decay)-1),0,PHP_ROUND_HALF_EVEN)));
    }
    /** Card: state learning/review/relearning, step int|null, S/D null for new. */
    public static function review(array $c,int $g,int $now): array {
        if($g<1||$g>4)throw new \InvalidArgumentException('Rating must be 1..4');
        $state=$c['state'];$step=$c['step'];$s=$c['stability'];$d=$c['difficulty'];
        if(!in_array($state,['learning','review','relearning'],true))throw new \InvalidArgumentException('Invalid FSRS state');
        if($state!=='review'&&(!is_int($step)||$step<0))throw new \InvalidArgumentException('Missing learning step');
        if($state!=='learning'&&($s===null||$d===null))throw new \InvalidArgumentException('Missing memory state');
        if(($s!==null&&(!is_finite((float)$s)||$s<=0))||($d!==null&&(!is_finite((float)$d)||$d<1||$d>10)))throw new \InvalidArgumentException('Invalid memory state');
        $last=$c['last_review'];
        if($last!==null&&$last>$now)throw new \InvalidArgumentException('Future last review');
        $elapsed=$last===null?null:(int)floor(($now-$last)/86400);
        $w=self::W;
        if($state==='learning'&&($s===null||$d===null)) {
            $s=max(.001,$w[$g-1]);$d=self::initialDifficulty($g);
        } else {
            if($elapsed!==null&&$elapsed<1) {
                $inc=exp($w[17]*($g-3+$w[18]))*pow($s,-$w[19]);
                if($g>=2)$inc=max(1.,$inc);
                $ns=$s*$inc;
            } else {
                $decay=-$w[20];$factor=pow(.9,1/$decay)-1;
                $ret=$last===null?0.:pow(1+$factor*max(0,$elapsed)/$s,$decay);
                if($g===1) {
                    $ns=min($w[11]*pow($d,-$w[12])*(pow($s+1,$w[13])-1)*exp((1-$ret)*$w[14]),$s/exp($w[17]*$w[18]));
                } else {
                    $ns=$s*(1+exp($w[8])*(11-$d)*pow($s,-$w[9])*(exp((1-$ret)*$w[10])-1)*($g===2?$w[15]:1)*($g===4?$w[16]:1));
                }
            }
            $s=max(.001,$ns);$d=self::nextDifficulty($d,$g);
        }
        if($state==='review') {
            if($g===1){$state='relearning';$step=0;$seconds=600;}else{$seconds=self::interval($s)*86400;$step=null;}
        } else {
            $steps=$state==='learning'?[60,600]:[600];
            if($step>=count($steps)&&$g>=2){$state='review';$step=null;$seconds=self::interval($s)*86400;}
            elseif($g===1){$step=0;$seconds=$steps[0];}
            elseif($g===2){$seconds=$step===0?(count($steps)===1?$steps[0]*1.5:($steps[0]+$steps[1])/2):$steps[$step];}
            elseif($g===4||$step+1===count($steps)){$state='review';$step=null;$seconds=self::interval($s)*86400;}
            else{$step++;$seconds=$steps[$step];}
        }
        if(!is_finite($s)||$s<=0||!is_finite($d))throw new \RuntimeException('Non-finite FSRS result');
        return ['state'=>$state,'step'=>$step,'stability'=>$s,'difficulty'=>$d,'last_review'=>$now,'due'=>$now+(int)$seconds,'interval_seconds'=>(int)$seconds,'elapsed_days'=>$elapsed??0];
    }
}
