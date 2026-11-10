import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
export const assetVersion=bytes=>createHash('sha256').update(bytes).digest('hex').slice(0,16);
export function versionImport(source,name,bytes){
  const token="'./"+name+"'";assert.equal(source.split(token).length,2,'Expected one dependency import');
  return source.replace(token,"'./"+name+'?ver='+assetVersion(bytes)+"'");
}
export function versionPracticeGraph({engine,view,bootstrap}){
  const nextView=versionImport(view,'engine.js',engine);
  return {view:nextView,bootstrap:versionImport(bootstrap,'view.js',nextView)};
}
