import {processSaveTask} from './save-task.js';
self.onmessage=({data})=>{try{
 const result=processSaveTask(data);
 // Blob has immutable shared bytes. Fetch can consume it without copying a
 // 26MB typed array on the UI thread; the worker remains a one-shot task.
 if(result.body){const start=performance.now();result.body=new Blob([result.body],{type:'application/json'});result.timing.blobMs=performance.now()-start;}
 self.postMessage({result});
}catch(error){self.postMessage({error:{message:error.message,authorField:error.authorField,exerciseId:error.exerciseId}});}};
