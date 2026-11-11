const day=ms=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).format(ms);
export function reviewActivity(receipts,now=Date.now()){
 const today=day(now),counts={};let undated=0;
 for(const r of receipts){
  if(r.undone||r.outcome==='rejected'||r.outcome==='undone'||![1,2,3,4].includes(r.rating))continue;
  let at=r.acceptedAnswerAt;
  // Older receipts store the resulting due date and deterministic interval.
  if(!Number.isFinite(at)&&r.card){const due=Date.parse(r.card.due),delay=r.rating===1?600000:Number(r.card.intervalDays)*86400000;if(Number.isFinite(due)&&delay>0)at=due-delay;}
  if(!Number.isFinite(at)){undated++;continue;}
  const date=day(at);if(date<=today)counts[date]=(counts[date]||0)+1;
 }
 return {today,counts,undated};
}
