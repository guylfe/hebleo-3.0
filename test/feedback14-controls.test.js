import {test} from 'node:test';
import assert from 'node:assert/strict';

const reference = 'https://fixture.invalid/reference.ogg';
const otherReference = '/media/synthetic-control.ogg';
const deferred = () => { let resolve, reject; const promise = new Promise((yes,no) => {resolve=yes;reject=no;}); return {promise,resolve,reject}; };
let instance = 0;
async function harness(t) {
  const audios=[], requests=[], recorders=[], blobs=[], revoked=[], states=[];
  class MockAudio extends EventTarget {
    constructor(url) { super(); this.url=url;this.paused=true;this.ended=false;this.currentTime=0;this.pauseCalls=0;this.pending=deferred();audios.push(this); }
    play() { return this.pending.promise; }
    pause() { this.paused=true;this.pauseCalls++;this.dispatchEvent(new Event('pause')); }
    emit(name) { if(name==='playing')this.paused=false;if(name==='ended'){this.ended=true;this.paused=true;}this.dispatchEvent(new Event(name)); }
  }
  class MockRecorder {
    constructor(stream) { this.stream=stream;this.state='inactive';this.mimeType='audio/mock';recorders.push(this); }
    start() { this.state='recording'; }
    stop() { this.state='inactive'; }
    finish() { this.ondataavailable?.({data:new Blob(['synthetic local recording'])});this.onstop?.(); }
  }
  const win=new EventTarget();win.CustomEvent=CustomEvent;
  win.addEventListener('hebleo-reference-state',event=>states.push(event.detail));
  const replacement={window:win,Audio:MockAudio,MediaRecorder:MockRecorder,navigator:{mediaDevices:{getUserMedia:options=>{const pending=deferred();requests.push({options,...pending});return pending.promise;}}}};
  const descriptors=Object.fromEntries(Object.keys(replacement).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  for(const [key,value] of Object.entries(replacement))Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
  t.mock.method(URL,'createObjectURL',blob=>{blobs.push(blob);return 'blob:local-'+blobs.length;});
  t.mock.method(URL,'revokeObjectURL',url=>revoked.push(url));
  const media=await import('../public/media.js?feedback14='+ ++instance);
  t.after(()=>{media.clearRecording();for(const [key,descriptor] of Object.entries(descriptors)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
  const capture=()=>{const track={stops:0,stop(){this.stops++;}};return {track,getTracks:()=>[track]};};
  return {media,win,audios,requests,recorders,blobs,revoked,states,capture};
}

test('feedback14 reference Play/Pause emits honest buffering, playing, paused and ended state; ordinary Play restarts',async t=>{
  const {media,audios,states}=await harness(t);
  assert.deepEqual(media.getPlaybackState(),{url:null,status:'idle',error:null});
  const first=media.playAudio({url:reference});
  assert.deepEqual(states.at(-1),{url:reference,status:'buffering',error:null});
  audios[0].emit('playing');audios[0].pending.resolve();assert.equal(await first,'playing');
  audios[0].emit('waiting');assert.equal(media.getPlaybackState().status,'buffering');
  audios[0].emit('playing');audios[0].currentTime=4;
  assert.equal(await media.playAudio(reference),'paused');assert.equal(audios[0].paused,true);
  const resume=media.playAudio(reference);assert.equal(audios[1].currentTime,4);
  audios[1].pending.resolve();assert.equal(await resume,'playing');
  audios[1].emit('ended');assert.equal(media.getPlaybackState().status,'ended');
  const restart=media.playAudio(reference);assert.equal(audios[2].currentTime,0);
  audios[2].pending.resolve();assert.equal(await restart,'playing');
  assert.ok(states.every(state=>Object.keys(state).sort().join(',')==='error,status,url'));
  const copy=media.getPlaybackState();copy.status='error';assert.equal(media.getPlaybackState().status,'playing');
  states.at(-1).status='error';assert.equal(media.getPlaybackState().status,'playing','event detail cannot mutate module state');
});

test('feedback14 reference Pause cancels pending Play; late promise and events cannot resume it',async t=>{
  const {media,audios}=await harness(t);
  const pending=media.playAudio(reference);
  assert.equal(await media.playAudio(reference),'paused');assert.equal(await pending,'paused');
  audios[0].emit('playing');audios[0].emit('waiting');assert.equal(audios[0].paused,true);
  audios[0].pending.resolve();await Promise.resolve();
  assert.deepEqual(media.getPlaybackState(),{url:reference,status:'paused',error:null});
  const resume=media.playAudio(reference);audios[0].emit('error');
  audios[1].pending.resolve();assert.equal(await resume,'playing');
});

test('feedback14 reference URL switch and stopMedia reject stale events and pending promises',async t=>{
  const {media,audios}=await harness(t);
  const old=media.playAudio(reference),next=media.playAudio(otherReference);
  assert.equal(await old,'paused');
  for(const event of ['waiting','playing','pause','ended','error'])audios[0].emit(event);
  assert.equal(media.getPlaybackState().url,otherReference);assert.equal(media.getPlaybackState().status,'buffering');
  audios[0].pending.reject(new Error('obsolete failure'));audios[1].pending.resolve();assert.equal(await next,'playing');
  media.stopMedia();assert.deepEqual(media.getPlaybackState(),{url:null,status:'idle',error:null});
  audios[1].emit('playing');audios[1].emit('ended');assert.equal(audios[1].paused,true);assert.equal(media.getPlaybackState().status,'idle');
  const canceled=media.playAudio(reference);media.stopMedia();assert.equal(await canceled,'paused');
  audios[2].pending.resolve();await Promise.resolve();assert.equal(audios[2].paused,true);assert.equal(media.getPlaybackState().url,null);
});

test('feedback14 reference external pause invalidates a pending Play',async t=>{
  const {media,audios}=await harness(t);const pending=media.playAudio(reference);
  audios[0].emit('pause');assert.equal(await pending,'paused');
  audios[0].pending.resolve();await Promise.resolve();assert.equal(media.getPlaybackState().status,'paused');assert.equal(audios[0].paused,true);
});

test('feedback14 reference errors are useful and ordinary Play retries without a Replay control',async t=>{
  const {media,audios}=await harness(t);
  const failed=media.playAudio(reference);audios[0].pending.reject(new Error('private backend detail'));
  await assert.rejects(failed,/Check the media link or try Play again/);
  assert.deepEqual(media.getPlaybackState(),{url:reference,status:'error',error:'Could not play this recording. Check the media link or try Play again.'});
  const retry=media.playAudio(reference);assert.equal(media.getPlaybackState().error,null);audios[1].pending.resolve();await retry;
  audios[1].emit('error');assert.equal(media.getPlaybackState().status,'error');
  const next=media.playAudio(reference);audios[2].pending.resolve();assert.equal(await next,'playing');
  await assert.rejects(media.playAudio('not a media URL'),/has not been linked/);assert.equal(media.getPlaybackState().status,'error');assert.equal(media.getPlaybackState().url,null);
});

test('feedback14 reference media-error event settles pending Play; immediate retry survives the old completion',async t=>{
  const {media,audios}=await harness(t);
  const failed=media.playAudio(reference);const rejected=assert.rejects(failed,/try Play again/);
  audios[0].emit('error');await rejected;
  const old=media.playAudio(reference);audios[1].emit('error');
  const next=media.playAudio(reference);assert.equal(await old,'paused');
  audios[1].pending.resolve();audios[2].pending.resolve();assert.equal(await next,'playing');
});

test('feedback14 reference synchronous playback failure leaves useful retryable error',async t=>{
  const h=await harness(t);t.mock.method(Audio.prototype,'play',()=>{throw new Error('private failure');});
  await assert.rejects(h.media.playAudio(reference),/try Play again/);assert.equal(h.media.getPlaybackState().status,'error');
});

test('feedback14 microphone requires explicit request, handles consent denial, and cleans late permission on departure',async t=>{
  const {media,requests,capture,recorders}=await harness(t);const changes=[];
  assert.equal(requests.length,0);assert.equal(recorders.length,0);
  const denied=media.recordVoice(status=>changes.push(status));assert.deepEqual(requests[0].options,{audio:true});
  requests[0].reject(new Error('denied'));await assert.rejects(denied,/Microphone access was not granted/);
  const late=media.recordVoice(status=>changes.push(status));media.clearRecording();const captured=capture();requests[1].resolve(captured);await late;
  assert.ok(captured.track.stops>0);assert.equal(recorders.length,0);assert.deepEqual(changes,[]);
  const obsoleteDenial=media.recordVoice(()=>assert.fail('obsolete callback'));media.clearRecording();requests[2].reject(new Error('denied'));await obsoleteDenial;
});

test('feedback14 recording Stop/replay remains local, separate from reference, and cleanup revokes the blob',async t=>{
  const {media,requests,capture,recorders,blobs,revoked,audios,states}=await harness(t);const changes=[];
  const request=media.recordVoice(status=>changes.push(status));const captured=capture();requests[0].resolve(captured);await request;
  assert.deepEqual(changes,['recording']);assert.equal(blobs.length,0);
  media.stopRecording();recorders[0].finish();assert.deepEqual(changes,['recording','ready']);assert.ok(captured.track.stops>0);assert.equal(blobs[0].type,'audio/mock');
  const replay=media.replayVoice();assert.equal(audios[0].url,'blob:local-1');audios[0].emit('playing');audios[0].pending.resolve();await replay;
  assert.deepEqual(media.getPlaybackState(),{url:null,status:'idle',error:null});assert.equal(states.length,0,'local recording emits no reference playing state');
  media.clearRecording();assert.deepEqual(revoked,['blob:local-1']);assert.equal(audios[0].paused,true);await assert.rejects(media.replayVoice(),/Record yourself first/);
});

test('feedback14 recording departure discards late recorder events and stops pending local replay',async t=>{
  const {media,requests,capture,recorders,blobs,revoked,audios,win}=await harness(t);const changes=[];
  const start=media.recordVoice(status=>changes.push(status));const captured=capture();requests[0].resolve(captured);await start;
  win.dispatchEvent(new Event('pagehide'));recorders[0].finish();assert.equal(blobs.length,0);assert.deepEqual(changes,['recording']);assert.ok(captured.track.stops>0);
  const next=media.recordVoice(status=>changes.push(status));requests[1].resolve(capture());await next;media.stopRecording();recorders[1].finish();
  const replay=media.replayVoice();media.clearRecording();audios[0].pending.resolve();await replay;
  assert.equal(audios[0].paused,true);assert.deepEqual(revoked,['blob:local-1']);assert.equal(media.getPlaybackState().status,'idle');
  const referencePlay=media.playAudio(reference);media.clearRecording();assert.equal(await referencePlay,'paused');audios[1].pending.resolve();await Promise.resolve();assert.equal(media.getPlaybackState().status,'idle');
});

test('feedback14 microphone startup failure stops captured tracks and leaves no local recording',async t=>{
  const {media,requests,capture,recorders}=await harness(t);t.mock.method(MediaRecorder.prototype,'start',()=>{throw new Error('unavailable codec');});
  const pending=media.recordVoice(()=>assert.fail('not recording'));const captured=capture();requests[0].resolve(captured);
  await assert.rejects(pending,/Could not start voice recording/);assert.ok(captured.track.stops>0);assert.equal(recorders[0].state,'inactive');
  await assert.rejects(media.replayVoice(),/Record yourself first/);
});


test('feedback14 microphone superseded consent cannot replace the current local recorder',async t=>{
  const {media,requests,capture,recorders,blobs}=await harness(t);const changes=[];
  const old=media.recordVoice(()=>assert.fail('obsolete recording status'));
  const current=media.recordVoice(status=>changes.push(status));
  const obsolete=capture(),active=capture();requests[1].resolve(active);await current;
  requests[0].resolve(obsolete);await old;assert.ok(obsolete.track.stops>0);assert.equal(recorders.length,1);
  media.stopRecording();recorders[0].finish();assert.deepEqual(changes,['recording','ready']);assert.equal(blobs.length,1);
});

test('feedback14 microphone runtime failure releases tracks and discards the failed recording',async t=>{
  const {media,requests,capture,recorders,blobs}=await harness(t);const changes=[];
  const pending=media.recordVoice(status=>changes.push(status));const captured=capture();requests[0].resolve(captured);await pending;
  recorders[0].onerror();recorders[0].finish();assert.ok(captured.track.stops>0);assert.equal(blobs.length,0);assert.deepEqual(changes,['recording','empty']);
  await assert.rejects(media.replayVoice(),/Record yourself first/);
});

test('feedback14 local replay late events and rejected promise stay silent after reference playback begins',async t=>{
  const {media,requests,capture,recorders,audios}=await harness(t);
  const start=media.recordVoice(()=>{});requests[0].resolve(capture());await start;media.stopRecording();recorders[0].finish();
  const localPlay=media.replayVoice();const referencePlay=media.playAudio(reference);
  audios[0].emit('playing');assert.equal(audios[0].paused,true);audios[0].pending.reject(new Error('obsolete local failure'));await localPlay;
  audios[1].pending.resolve();assert.equal(await referencePlay,'playing');assert.equal(media.getPlaybackState().url,reference);
});

test('feedback14 reference legacy replay flag restarts and invalidates the earlier pending Play',async t=>{
  const {media,audios}=await harness(t);const pending=media.playAudio(reference);audios[0].currentTime=5;
  const restart=media.playAudio(reference,1,true);assert.equal(await pending,'paused');assert.equal(audios[1].currentTime,0);
  audios[0].pending.resolve();audios[1].pending.resolve();assert.equal(await restart,'playing');
});
