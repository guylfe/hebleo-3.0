(function(){
// A shared, read-only view of committed daily review counts.
function heatmapHTML(activity){
 if(!activity||!/^\d{4}-\d{2}-\d{2}$/.test(activity.today))return '';
 const end=new Date(activity.today+'T12:00:00Z'),start=new Date(end);start.setUTCDate(start.getUTCDate()-364);
 const counts=activity.counts||{},cells=[];let total=0,days=0;
 for(let i=0;i<start.getUTCDay();i++)cells.push('<span aria-hidden="true"></span>');
 for(let i=0;i<365;i++){const d=new Date(start);d.setUTCDate(d.getUTCDate()+i);const date=d.toISOString().slice(0,10),n=Math.max(0,Math.floor(Number(counts[date])||0));total+=n;if(n)days++;
 const color=n===0?'#e9eef1':n<10?'#bae2cc':n<30?'#71bb94':n<60?'#32865c':'#145a3a',label=date+': '+n+' review'+(n===1?'':'s');
 cells.push('<button type="button" data-review-day aria-label="'+label+'" title="'+label+'" style="background:'+color+';border:1px solid #78908755;border-radius:3px;width:12px;height:12px;min-width:0;min-height:0;padding:0;box-shadow:none"></button>');}
 return '<section class="review-heatmap" aria-label="Review activity" style="margin:24px 0;padding:20px;border:1px solid #ccd4da;border-radius:12px"><h2>Review activity</h2><p>'+total+' review'+(total===1?'':'s')+' · '+days+' active day'+(days===1?'':'s')+' in the past year</p><div style="overflow-x:auto;padding:4px 0"><div style="display:grid;grid-template-rows:repeat(7,12px);grid-auto-flow:column;grid-auto-columns:12px;gap:3px;width:max-content">'+cells.join('')+'</div></div><p style="font-size:14px">'+start.toISOString().slice(0,10)+' — '+activity.today+' · Darker squares mean more reviews.</p><p data-review-day-detail aria-live="polite" style="min-height:1.5em;margin-bottom:0">Select a day to see its review count.</p></section>';
}
function heatmapClick(event){const b=event.target.closest?.('[data-review-day]');if(b)b.closest('.review-heatmap').querySelector('[data-review-day-detail]').textContent=b.getAttribute('aria-label');}
if(typeof document!=='undefined')document.addEventListener('click',heatmapClick);

window.HebleoHeatmap=heatmapHTML;
}());
