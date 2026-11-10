import test from 'node:test';import assert from 'node:assert/strict';import {assetVersion,versionPracticeGraph} from './asset-version.mjs';
test('engine changes invalidate the view and bootstrap imports; unchanged bytes keep stable URLs',()=>{
 const input={engine:'reviewed-engine-A',view:"import {Drill} from './engine.js';",bootstrap:"import {mountConjugation} from './view.js';"};
 const a=versionPracticeGraph(input),b=versionPracticeGraph({...input,engine:'reviewed-engine-B'});
 assert.notEqual(a.view,b.view);assert.notEqual(a.bootstrap,b.bootstrap);assert.deepEqual(a,versionPracticeGraph(input));
 assert(a.view.includes('engine.js?ver='+assetVersion(input.engine)));assert(a.bootstrap.includes('view.js?ver='+assetVersion(a.view)));
});
