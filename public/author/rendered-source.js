import {mountStandardEditor} from './standard-editor.js';
import {mountMarkdownEditor} from '../studio/markdown-editor.js';
import {chooseLocalImage} from './image-chooser.js';

// Genuine Markdown reuses Studio's mature EasyMDE. HTML/mixed prose uses the
// rich editor at the same lesson location. Source compilation is boundary-only.
export function mountRenderedSource(host,options){
 if(!/<\/?[a-z!][^>]*>/i.test(options.source)&&!options.session?.state){
  let locked=false,composing=false,settlingComposition=false,waiters=[],saved=options.session?.value===options.source?options.session.saved:options.source,picker;const doc=host.ownerDocument;
  const wrapper=doc.createElement('div'),panel=doc.createElement('div');panel.hidden=true;host.replaceChildren(wrapper,panel);
  const ui=mountMarkdownEditor(wrapper,{value:options.source,label:'Edit teaching Markdown',dependencies:options.dependencies?.EasyMDE?options.dependencies:undefined,onImage:insert=>{picker?.();picker=chooseLocalImage(panel,{api:options.api,onSelected:insert,onClose:()=>ui.focus()});},onChange:()=>{if(!composing&&!settlingComposition)options.onChange();}});
  const start=()=>composing=true,end=()=>{composing=false;settlingComposition=true;doc.defaultView.setTimeout(()=>{settlingComposition=false;options.onChange();waiters.splice(0).forEach(r=>r());},0);};host.addEventListener('compositionstart',start);host.addEventListener('compositionend',end);
  const ready=ui.ready.then(editor=>{if(editor&&options.session?.value===options.source&&options.session.cmHistory)editor.codemirror.setHistory(options.session.cmHistory);if(locked)editor?.codemirror.setOption('readOnly',true);return editor;});
  return {ready,getValue:()=>ui.getValue(),get model(){return ui.getValue();},isClean:()=>ui.getValue()===saved,acceptSaved:value=>saved=value,get composing(){return composing||settlingComposition;},whenSettled:()=>composing||settlingComposition?new Promise(r=>waiters.push(r)):Promise.resolve(),setLocked(value){locked=value;ui.editor?.codemirror.setOption('readOnly',value);host.querySelectorAll('button,select,textarea').forEach(n=>n.disabled=locked);},snapshot:()=>({value:ui.getValue(),saved,cmHistory:ui.editor?.codemirror.getHistory()}),dispose(){host.removeEventListener('compositionstart',start);host.removeEventListener('compositionend',end);picker?.();ui.dispose();waiters.splice(0).forEach(r=>r());}};
 }
 return mountStandardEditor(host,options);
}
