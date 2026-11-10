import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
export const assetVersion=bytes=>createHash('sha256').update(bytes).digest('hex').slice(0,16);
export function versionImport(source,name,bytes){
  const token="'./"+name+"'";assert.equal(source.split(token).length,2,'Expected one dependency import');
  return source.replace(token,"'./"+name+'?ver='+assetVersion(bytes)+"'");
}
export function versionPracticeGraph({engine,view,bootstrap,runStore,runState}){
  if(view.includes("'./run-state.js'"))assert.notEqual(runState,undefined,'Run serializer bytes required for complete cache graph');
  if(view.includes("'./run-store.js'"))assert.notEqual(runStore,undefined,'Run store bytes required for complete cache graph');
  let nextView=versionImport(view,'engine.js',engine);
  const result={};
  if(runState!==undefined){result['run-state']=versionImport(runState,'engine.js',engine);nextView=versionImport(nextView,'run-state.js',result['run-state']);}
  if(runStore!==undefined)nextView=versionImport(nextView,'run-store.js',runStore);
  return {...result,view:nextView,bootstrap:versionImport(bootstrap,'view.js',nextView)};
}
