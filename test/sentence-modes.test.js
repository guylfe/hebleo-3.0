import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Store} from '../src/store.js';
import {wireAnswer,exerciseInput} from '../public/learner-view.js';

test('sentence mode keeps prefix composition, legacy default and independent empty-answer validation',()=>{
 const e={type:'ordering',tokens:['אני','ב','בית'],prefixTokenIndices:[1]};
 const draft={text:'היא בבית',selectedTokens:[0,1,2],matching:{}};
 assert.deepEqual(wireAnswer(e,draft),{answer:'אני בבית'});
 assert.deepEqual(wireAnswer(e,{...draft,sentenceMode:'complex'}),{answer:'היא בבית'});
 assert.ok(wireAnswer(e,{...draft,sentenceMode:'complex',text:''}).error);
 assert.ok(wireAnswer(e,{...draft,sentenceMode:'simple',selectedTokens:[]}).error);
 const html=exerciseInput(e,{draft:{...draft,sentenceMode:'complex',text:'<script>x</script>'}});
 assert.ok(html.includes('&lt;script&gt;x&lt;/script&gt;'));assert.ok(!html.includes('data-action="token"'));
});
test('sentence mode progress validates, persists both drafts and accepts old positions without a mode',t=>{
 const store=new Store();t.after(()=>store.close());
 const position={lessonId:'lesson-2',revisionId:store.get('active'),step:'apply',question:0,answer:'אני בבית',selectedTokens:[0,1],matching:{}};
 store.saveProgress('learner-demo',position);
 assert.equal(store.session('learner-demo','lesson-2').progress.sentenceMode,undefined);
 for(const sentenceMode of ['simple','complex']){
  store.saveProgress('learner-demo',{...position,sentenceMode});
  const saved=store.session('learner-demo','lesson-2').progress;
  assert.equal(saved.sentenceMode,sentenceMode);assert.equal(saved.answer,position.answer);assert.deepEqual(saved.selectedTokens,position.selectedTokens);
 }
 const before=store.learner('learner-demo');
 assert.throws(()=>store.saveProgress('learner-demo',{...position,sentenceMode:'invalid'}),/Invalid sentence answer mode/);
 assert.deepEqual(store.learner('learner-demo'),before);
});
