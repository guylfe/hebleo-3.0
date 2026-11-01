import {processSaveTask} from './save-task.js';
// One-shot computation, no persistent cache/store, no fetch or write authority.
export function runSaveTask(task){
 if(typeof Worker==='undefined')return Promise.resolve().then(()=>processSaveTask(structuredClone(task)));
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./save-worker.js',import.meta.url),{type:'module'});
  const finish=()=>worker.terminate();
  worker.onmessage=({data})=>{finish();if(data.error)reject(Object.assign(new Error(data.error.message),data.error));else resolve(data.result);};
  worker.onerror=()=>{finish();reject(new Error('Draft preparation failed. Your edits are retained; retry Save.'));};
  worker.onmessageerror=()=>{finish();reject(new Error('Draft preparation could not be read. Your edits are retained.'));};
  try{worker.postMessage(task);}catch(error){finish();reject(error);}
 });
}
// Yield through a paint opportunity before dispatching even the snapshot copy.
export const savePaintOpportunity=()=>typeof requestAnimationFrame==='function'?new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0))):Promise.resolve();
