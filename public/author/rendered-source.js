import {mountStandardEditor} from './standard-editor.js';
// All ordinary lesson prose, including Markdown, opens in the classic canvas.
export const mountRenderedSource=(host,options)=>mountStandardEditor(host,options);
