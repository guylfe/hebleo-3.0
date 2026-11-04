// Isolated fixture instrumentation only. Never installed in the plugin.
(function(){
 const root=document.querySelector('.hc-card');
 for(const button of root.querySelectorAll('.section-toggle'))if(button.getAttribute('aria-expanded')!=='true')button.click();
 const theme=root.querySelector('.hc-theme-input');theme.checked=true;theme.dispatchEvent(new Event('change'));
 const play=root.querySelector('.hc-play[data-audio]');if(play)play.click();setTimeout(()=>{theme.checked=true;theme.dispatchEvent(new Event('change'));parent.postMessage({type:'hebleo-card-settings',mode:'dark',nikkud:false},'*');},100);const status=document.createElement('button');status.disabled=true;status.type='button';root.append(status);
 function measure(){const p=root.querySelector('.hc-study-primary'),s=root.querySelector('.hc-study-support');status.textContent='Fixture check: expanded '+root.querySelectorAll('.section-toggle[aria-expanded=true]').length+' panels; dark '+document.documentElement.dataset.hebleoMode+'; frame width '+innerWidth+'px; horizontal overflow '+(document.documentElement.scrollWidth-innerWidth)+'px; primary/support '+(p&&s&&p.getBoundingClientRect().right<=s.getBoundingClientRect().left?'side by side':'stacked')+'; body '+Math.ceil(document.body.getBoundingClientRect().height)+'px; frame height '+innerHeight+'px; observed MP3 resource requests '+performance.getEntriesByType('resource').filter(e=>e.name.includes('.mp3')).length;}
 new ResizeObserver(measure).observe(document.body);new PerformanceObserver(measure).observe({type:"resource",buffered:true});setTimeout(measure,200);measure();
}());
