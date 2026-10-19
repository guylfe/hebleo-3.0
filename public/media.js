import { audioURL } from './ux.js';
let player = null;
let playerURL = null;
let referenceAttempt = null;
let playbackState = {url:null, status:'idle', error:null};
let voicePlayer = null;
let voiceGeneration = 0;
let recorder = null;
let stream = null;
let recordingURL = null;
let recordingTimer = null;
let generation = 0;
let feedbackContext = null;
const playbackError = 'Could not play this recording. Check the media link or try Play again.';

export function getPlaybackState() { return {...playbackState}; }
function referenceState(url, status, error = null) {
  if (playbackState.url === url && playbackState.status === status && playbackState.error === error) return;
  playbackState = {url, status, error};
  if (typeof window !== 'undefined') window.dispatchEvent(new window.CustomEvent('hebleo-reference-state', {detail:getPlaybackState()}));
}
function finishReference(status, error = null) {
  const attempt = referenceAttempt;
  referenceAttempt = null;
  if (attempt) {
    attempt.detach();
    attempt.finish({status, error});
  }
  if (status !== 'ended') player?.pause();
  referenceState(status === 'idle' ? null : playerURL, status, error);
}
function stopVoicePlayback() { voiceGeneration++; voicePlayer?.pause(); voicePlayer = null; }

export async function playAudio(value, speed = 1, replay = false) {
  const url = audioURL(value);
  if (!url) {
    stopMedia();
    const message = 'A native recording has not been linked for this item.';
    referenceState(null, 'error', message);
    throw new Error(message);
  }
  // Buffering counts as active: a second Play/Pause cancels even an unresolved play().
  if (playerURL === url && referenceAttempt && !replay) {
    finishReference('paused');
    return 'paused';
  }
  const resumeAt = playerURL === url && playbackState.status === 'paused' && !replay ? player?.currentTime || 0 : 0;
  finishReference('idle');
  stopVoicePlayback();
  player = null;
  playerURL = url;
  let media;
  try {
    // A new element per attempt isolates events from canceled attempts, including same-URL retries.
    media = new Audio(url);
    player = media;
    media.currentTime = resumeAt;
    media.playbackRate = speed;
    media.preservesPitch = true;
  } catch {
    finishReference('error', playbackError);
    throw new Error(playbackError);
  }
  let finish;
  const finished = new Promise(resolve => { finish = resolve; });
  const attempt = {media, finish, detach:null};
  const handlers = {
    waiting:() => { if (referenceAttempt === attempt) referenceState(url, 'buffering'); },
    playing:() => { if (referenceAttempt === attempt) referenceState(url, 'playing'); },
    pause:() => { if (referenceAttempt === attempt) finishReference('paused'); },
    ended:() => { if (referenceAttempt === attempt) finishReference('ended'); },
    error:() => { if (referenceAttempt === attempt) finishReference('error', playbackError); }
  };
  attempt.detach = () => {
    for (const [name, handler] of Object.entries(handlers)) media.removeEventListener(name, handler);
    // Retired elements must stay silent even if their browser queues a late playing event.
    media.addEventListener('playing', () => media.pause());
  };
  referenceAttempt = attempt;
  for (const [name, handler] of Object.entries(handlers)) media.addEventListener(name, handler);
  referenceState(url, 'buffering');
  if (referenceAttempt !== attempt) return 'paused';
  let playing;
  try { playing = media.play(); }
  catch { finishReference('error', playbackError); throw new Error(playbackError); }
  const started = Promise.resolve(playing).then(() => {
    if (referenceAttempt !== attempt) { media.pause(); return {status:'paused'}; }
    return {status:'playing'};
  }, () => {
    if (referenceAttempt !== attempt) { media.pause(); return {status:'paused'}; }
    finishReference('error', playbackError);
    return {status:'error', error:playbackError};
  });
  const outcome = await Promise.race([started, finished]);
  // Even an already-settled attempt cannot overwrite a newer URL/retry/cleanup.
  if (player !== media) return 'paused';
  if (outcome.error) throw new Error(outcome.error);
  if (outcome.status === 'playing') {
    if (referenceAttempt !== attempt) return 'paused';
    referenceState(url, 'playing');
  }
  return outcome.status;
}
export function setPlaybackSpeed(speed) {
  if(![0.75,1].includes(speed))throw new Error('Unsupported playback speed.');
  if(player){player.playbackRate=speed;player.preservesPitch=true;}
}
export function stopMedia() {
  finishReference('idle');
  player = null;
  playerURL = null;
  stopVoicePlayback();
}
export async function recordVoice(onChange) {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('Voice recording is unavailable in this browser.');
  clearRecording(); const current = generation;
  let captured;
  try { captured = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch {
    if (current !== generation) return;
    throw new Error('Microphone access was not granted. Allow it in this browser to record yourself.');
  }
  if (current !== generation) { captured.getTracks().forEach(t=>t.stop()); return; }
  stream = captured; const chunks = [];
  let localRecorder;
  try {
    localRecorder = new MediaRecorder(captured);
    recorder = localRecorder;
    localRecorder.ondataavailable = e => { if(current === generation && e.data.size) chunks.push(e.data); };
    localRecorder.onstop = () => {
      captured.getTracks().forEach(t=>t.stop());
      if (current !== generation) return;
      recordingURL = URL.createObjectURL(new Blob(chunks,{type:localRecorder.mimeType}));
      stream = null; recorder = null;
      clearTimeout(recordingTimer); recordingTimer = null; onChange('ready');
    };
    localRecorder.onerror = () => {
      captured.getTracks().forEach(t=>t.stop());
      if (current !== generation) return;
      clearRecording(); onChange('empty');
    };
    localRecorder.start();
  } catch {
    captured.getTracks().forEach(t=>t.stop());
    clearRecording();
    throw new Error('Could not start voice recording. Try again in this browser.');
  }
  if (current !== generation || recorder !== localRecorder) return;
  onChange('recording');
  if (current === generation && recorder === localRecorder) recordingTimer = setTimeout(stopRecording,60000);
}
export function stopRecording() { if (recorder?.state === 'recording') recorder.stop(); }
export async function replayVoice() {
  if (!recordingURL) throw new Error('Record yourself first.');
  stopMedia();
  const current = voiceGeneration;
  let media;
  try {
    media = new Audio(recordingURL);
    voicePlayer = media;
    media.addEventListener('playing', () => { if (current !== voiceGeneration) media.pause(); });
    await media.play();
  } catch {
    if (current === voiceGeneration) {
      media?.pause();
      throw new Error('Could not play your local recording. Try recording again.');
    }
  }
  if (current !== voiceGeneration) media?.pause();
}
export function clearRecording() {
  generation++; clearTimeout(recordingTimer); recordingTimer = null;
  const previous = recorder; recorder = null;
  if(previous?.state === 'recording') previous.stop();
  stream?.getTracks().forEach(t=>t.stop()); stream = null;
  stopMedia();
  if(recordingURL)URL.revokeObjectURL(recordingURL);
  recordingURL = null;
}
export function feedbackSound(enabled, success = true) {
  if (!enabled) return;
  try { feedbackContext ||= new (window.AudioContext || window.webkitAudioContext)(); const oscillator=feedbackContext.createOscillator();const gain=feedbackContext.createGain();oscillator.frequency.value=success?660:330;gain.gain.setValueAtTime(.04,feedbackContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,feedbackContext.currentTime+.15);oscillator.connect(gain);gain.connect(feedbackContext.destination);oscillator.start();oscillator.stop(feedbackContext.currentTime+.15); } catch { /* Optional feedback is nonessential. */ }
}
if(typeof window!=='undefined')window.addEventListener('pagehide',clearRecording);
