import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
// Bundled synthetic nonlinguistic tone; never a Hebrew pronunciation or imported source.
export const demoSignalBytes=readFileSync(new URL('./fixtures/demo-signal.wav',import.meta.url));
export const demoSignalSHA256=createHash('sha256').update(demoSignalBytes).digest('hex');
export const demoSignalBlob={sha256:demoSignalSHA256,mimeType:'audio/wav',byteLength:demoSignalBytes.length,bytes:demoSignalBytes};
export const demoSignalReference={url:'/media/blobs/'+demoSignalSHA256+'.wav',kind:'synthetic-demo',label:'Demo sound · not Hebrew pronunciation'};
