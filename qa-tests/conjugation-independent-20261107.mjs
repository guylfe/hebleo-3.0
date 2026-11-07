import assert from 'node:assert/strict';
import {fixture} from '../adapters/wordpress/conjugation/rehearsal/fixture.js';
import {Drill} from '../public/conjugation/engine.js';
let rounds=0;
for (const direction of ['he','en']) for(let seed=1;seed<=100;seed++) {
  let n=seed;const random=()=>((n=(n*1664525+1013904223)>>>0)/4294967296);
  const d=new Drill(fixture,fixture.forms,{direction,allowFixtures:true,random});
  const first=new Set(),missed=new Set();
  for(let i=0;i<7;i++) {
    assert.equal(d.pass,1);assert(!first.has(d.current.id));first.add(d.current.id);
    d.grade('deliberate mismatch','write');
    if(i===2)assert(d.override());else missed.add(d.current.id);
    d.next();
  }
  assert.equal(d.pass,2);assert.deepEqual(new Set(d.queue.map(f=>f.id)),missed);
  const repeat=d.queue.map(f=>f.id);
  for(const id of repeat) {assert.equal(d.current.id,id);d.grade('deliberate mismatch','write');d.next();}
  assert.equal(d.pass,3);assert.deepEqual(new Set(d.queue.map(f=>f.id)),missed);
  while(d.current){d.grade(direction==='he'?d.current.unpointed:d.current.english,'write');d.next();}
  assert.equal(d.missed.size,0);rounds++;
}
console.log(JSON.stringify({candidate:'d57125620f98f0b18630975d1e970d1e11ebaa95',randomizedRounds:rounds,formsPerRound:7,directions:['he','en'],result:'PASS'}));
