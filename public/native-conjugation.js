// Owns native I/O/lifecycle only. The shared practice view never writes learner state.
export function mountNativeConjugation(root, {api, userId, loadView=()=>import('./conjugation/view.js')}) {
  let disposed=false, generation=0, mounted=null;
  const doc=root.ownerDocument, ctl=new doc.defaultView.AbortController();
  function notice(text, retry=false) {
    root.replaceChildren();
    const heading=doc.createElement('h1');heading.textContent='Conjugation practice';heading.tabIndex=-1;root.append(heading);
    const p=doc.createElement('p');p.setAttribute('role','status');p.textContent=text;root.append(p);
    if(retry){const b=doc.createElement('button');b.type='button';b.textContent='Try again';b.dataset.conjugationRetry='';root.append(b);}
  }
  async function open() {
    const own=++generation;mounted?.destroy();mounted=null;notice('Loading conjugation practice…');
    try {
      const data=await api('conjugation',undefined,userId);
      if(disposed||generation!==own)return;
      const {mountConjugation}=await loadView();
      if(disposed||generation!==own)return;
      root.replaceChildren();
      if(data.allowFixtures){const p=doc.createElement('p');p.textContent='SYNTHETIC TEST FIXTURE — not approved teaching content.';root.append(p);}
      const host=doc.createElement('div');root.append(host);
      mounted=mountConjugation(host,{catalog:data.catalog,learnedIds:data.learnedIds,platform:'native',ownerKey:'native:'+userId,storageKey:'hebleo-conjugation-v1-'+userId,allowFixtures:data.allowFixtures===true});
      await mounted.ready;
    } catch(error) { if(!disposed&&generation===own)notice('Conjugation practice could not load. '+error.message,true); }
  }
  root.addEventListener('click',event=>{if(event.target.closest('[data-conjugation-retry]'))void open();},{signal:ctl.signal});
  const ready=open();
  return {ready,destroy(){disposed=true;generation++;ctl.abort();mounted?.destroy();mounted=null;root.replaceChildren();}};
}
