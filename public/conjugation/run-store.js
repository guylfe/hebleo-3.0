/** Account scoped, atomic browser-local slot. Tombstones fence every older writer. */
export function validOwner(owner) {
  return typeof owner==='string' && (/^wordpress:[1-9][0-9]*$/.test(owner)||(/^native:[A-Za-z0-9][A-Za-z0-9_.:@-]{0,199}$/.test(owner)&&!['native:undefined','native:null'].includes(owner)));
}
export function createRunStore(owner,{indexedDB=globalThis.indexedDB}={}) {
  if(!validOwner(owner))throw Error('A stable practice account is required');
  let opening;
  function open(){
    if(!opening)opening=new Promise((resolve,reject)=>{
      if(!indexedDB){reject(Error('Browser storage is unavailable'));return;}
      const r=indexedDB.open('hebleo-conjugation-runs',1);
      r.onupgradeneeded=()=>r.result.createObjectStore('slots');
      r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Browser storage is blocked'));
      r.onsuccess=()=>{r.result.onversionchange=()=>r.result.close();resolve(r.result);};
    }).catch(e=>{opening=null;throw e;});
    return opening;
  }
  async function transact(expected,run,write){
    const db=await open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('slots',write?'readwrite':'readonly'),slots=tx.objectStore('slots');let result,conflict=false,cause;
      tx.onabort=()=>reject(conflict?Object.assign(Error('This drill changed in another tab. Reload to use the latest saved drill.'),{code:'CONFLICT'}):cause||tx.error||Error('Practice save was aborted'));
      tx.onerror=()=>{};
      tx.oncomplete=()=>resolve(result);
      const read=slots.get(owner);
      read.onsuccess=()=>{try{
        const slot=read.result||{revision:0,run:null};
        if(!Number.isSafeInteger(slot.revision)||slot.revision<0){tx.abort();return;}
        if(write){
          if(slot.revision!==expected){conflict=true;tx.abort();return;}
          result={revision:slot.revision+1,run};slots.put(result,owner);
        }else result=slot;
      }catch(error){cause=error;tx.abort();}};
    });
  }
  return {read:()=>transact(null,null,false),write:(revision,run)=>transact(revision,structuredClone(run),true)};
}
