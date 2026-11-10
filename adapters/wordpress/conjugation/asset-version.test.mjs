import test from 'node:test';import assert from 'node:assert/strict';import {assetVersion,versionPracticeGraph} from './asset-version.mjs';
test('engine changes invalidate the view and bootstrap imports; unchanged bytes keep stable URLs',()=>{
 const input={engine:'reviewed-engine-A',view:"import {Drill} from './engine.js';",bootstrap:"import {mountConjugation} from './view.js';"};
 const a=versionPracticeGraph(input),b=versionPracticeGraph({...input,engine:'reviewed-engine-B'});
 assert.notEqual(a.view,b.view);assert.notEqual(a.bootstrap,b.bootstrap);assert.deepEqual(a,versionPracticeGraph(input));
 assert(a.view.includes('engine.js?ver='+assetVersion(input.engine)));assert(a.bootstrap.includes('view.js?ver='+assetVersion(a.view)));
});

test('new persistence modules invalidate the complete WordPress cache graph',()=>{
 const input={engine:'engine-a',runStore:'store-a',runState:"import {Drill} from './engine.js';",view:"import {Drill} from './engine.js';import {createRunStore} from './run-store.js';import {hydrateRun} from './run-state.js';",bootstrap:"import {mountConjugation} from './view.js';"};
 const a=versionPracticeGraph(input);
 for(const delta of [{engine:'engine-b'},{runStore:'store-b'},{runState:input.runState+'//changed'}]){
  const b=versionPracticeGraph({...input,...delta});assert.notEqual(a.view,b.view);assert.notEqual(a.bootstrap,b.bootstrap);
 }
 assert(a.view.includes('run-state.js?ver='+assetVersion(a['run-state'])));assert(a.view.includes('run-store.js?ver='+assetVersion(input.runStore)));
});
