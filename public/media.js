import { audioURL } from './ux.js';
let player = null;
let playerURL = null;
let recorder = null;
let stream = null;
let recordingURL = null;
let recordingTimer = null;
let generation = 0;
let feedbackContext = null;
export async function playAudio(value, speed = 1, replay = false) {
  const url = audioURL(value);
  if (!url) throw new Error('A native recording has not been linked for this item.');
  if (!player || playerURL !== url) { player?.pause(); player = new Audio(url); playerURL = url; }
  else if (!player.paused && !replay) { player.pause(); return 'paused'; }
  else if (replay) player.currentTime = 0;
  player.playbackRate = speed; player.preservesPitch = true;
  try { await player.play(); return 'playing'; } catch { throw new Error('Could not play this recording. Check the media link or try again.'); }
}
export function setPlaybackSpeed(speed) {
  if(![0.75,1].includes(speed))throw new Error('Unsupported playback speed.');
  if(player){player.playbackRate=speed;player.preservesPitch=true;}
}
export function stopMedia() { player?.pause(); }
export async function recordVoice(onChange) {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('Voice recording is unavailable in this browser.');
  clearRecording(); const current = generation;
  let captured;
  try { captured = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { throw new Error('Microphone access was not granted. Allow it in this browser to record yourself.'); }
  if (current !== generation) { captured.getTracks().forEach(t=>t.stop()); return; }
  stream = captured; const chunks = []; recorder = new MediaRecorder(stream);
  recorder.ondataavailable = e => { if(e.data.size) chunks.push(e.data); };
  recorder.onstop = () => {
    captured.getTracks().forEach(t=>t.stop());
    if (current !== generation) return;
    recordingURL = URL.createObjectURL(new Blob(chunks,{type:recorder.mimeType})); stream = null; recorder = null;
    clearTimeout(recordingTimer); onChange('ready');
  };
  recorder.start(); onChange('recording'); recordingTimer = setTimeout(stopRecording,60000);
}
export function stopRecording() { if (recorder?.state === 'recording') recorder.stop(); }
export async function replayVoice() { if (!recordingURL) throw new Error('Record yourself first.'); player?.pause(); player = new Audio(recordingURL); playerURL = recordingURL; await player.play(); }
export function clearRecording() { generation++; clearTimeout(recordingTimer); if(recorder?.state === 'recording') recorder.stop(); stream?.getTracks().forEach(t=>t.stop()); stream = null; recorder = null; if(recordingURL)URL.revokeObjectURL(recordingURL); recordingURL = null; stopMedia(); }
export function feedbackSound(enabled, success = true) {
  if (!enabled) return;
  try { feedbackContext ||= new (window.AudioContext || window.webkitAudioContext)(); const oscillator=feedbackContext.createOscillator();const gain=feedbackContext.createGain();oscillator.frequency.value=success?660:330;gain.gain.setValueAtTime(.04,feedbackContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,feedbackContext.currentTime+.15);oscillator.connect(gain);gain.connect(feedbackContext.destination);oscillator.start();oscillator.stop(feedbackContext.currentTime+.15); } catch { /* Optional feedback is nonessential. */ }
}
if(typeof window!=='undefined')window.addEventListener('pagehide',clearRecording);
