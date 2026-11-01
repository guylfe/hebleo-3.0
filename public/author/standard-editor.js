import {createClassicAdapter} from './classic-source.js';
import {sanitizeProse,localImage} from '../safe-format.js';
import {chooseLocalImage} from './image-chooser.js';
// Legacy source APIs remain available to source-range consumers, never to Jodit.
export {proseSchema,createProseState} from './legacy-editor.js';
let componentLoad;
function load(doc){
 if(!doc.querySelector('[data-jodit-css]')){const css=doc.createElement('link');css.rel='stylesheet';css.href='/author/vendor/jodit.min.css';css.dataset.joditCss='';doc.head.append(css);}
 componentLoad??=new Promise((resolve,reject)=>{if(doc.defaultView.Jodit)return resolve(doc.defaultView.Jodit);const script=doc.createElement('script');script.src='/author/vendor/jodit.min.js';script.onload=()=>resolve(doc.defaultView.Jodit);script.onerror=()=>reject(Error('Local classic editor could not load. Exact source is retained.'));doc.head.append(script);});
 return Promise.all([componentLoad,import('/vendor/marked.js'),import('/vendor/purify.js')]).then(([Jodit,m,p])=>({Jodit,marked:m.marked,purifier:p.default}));
}
export const classicButtons=['bold','italic','underline','strikethrough','|','brush','fontsize','paragraph','|','left','center','right','justify','direction','|','ul','ol','outdent','indent','\n','link','image','table','hr','|','undo','redo','|','selectall','eraser','|','fullsize'];
export function mountStandardEditor(host,{source,onChange=()=>{},onError=()=>{},dependencies,api,label='Edit teaching text',session}={}){
 if(session?.value===source&&session.resume)return session.resume(host,{onChange,onError});
 session?.release?.();
 const doc=host.ownerDocument,win=doc.defaultView,ctl=new win.AbortController();
 let view,adapter,savedModel,disposed=false,locked=false,composing=false,settling=false,waiters=[],picker,initializing=true,lastModel,retained=false;
 host.innerHTML='<section class="author-standard"><textarea data-classic-source></textarea><div data-prose-insert hidden></div><p data-prose-status role="status">Loading classic editor…</p></section>';
 const section=host.firstElementChild,status=host.querySelector('[data-prose-status]'),panel=host.querySelector('[data-prose-insert]');
 const say=e=>{status.textContent=e.message||e;onError(e?.stack?e:Error(e));};
 // Jodit adds FEFF caret scaffolding. Authored FEFF regions are retained boundaries.
 const model=()=>view?.editor.innerHTML.replace(/<span\b[^>]*\bid="jodit-selection_marker_[^"]*"[^>]*>[\s\S]*?<\/span>/g,'').replace(/\uFEFF/g,'');
 const changed=()=>{if(initializing||disposed)return;const next=model();if(next===lastModel)return;lastModel=next;if(!composing&&!settling)onChange();};
 const handle={
  get view(){return view;},get model(){return model();},get composing(){return composing||settling;},
  isClean:()=>!view||model()===savedModel,
  acceptSaved(submitted){savedModel=submitted;},
  getValue(){if(handle.composing)throw Error('Finish composing text before saving.');return adapter?adapter.compile(model()):source;},
  whenSettled(){return handle.composing?new Promise(r=>waiters.push(r)):Promise.resolve();},
  setLocked(value){locked=value;if(view)view.setReadOnly(value);},
  focus(){view?.s.focus();},
  snapshot(){if(!view||disposed)return null;retained=true;return {owner:handle,value:adapter.compile(model()),resume(nextHost,hooks){host=nextHost;onChange=hooks.onChange;onError=hooks.onError;host.append(section);retained=false;return handle;},release(){retained=false;handle.dispose();}};},
  dispose(){if(disposed)return;if(retained){section.remove();return;}disposed=true;ctl.abort();picker?.();view?.destruct();waiters.splice(0).forEach(r=>r());section.remove();}
 };
 handle.ready=Promise.resolve(dependencies).then(deps=>deps?.Jodit||deps&&win.Jodit?{...deps,Jodit:deps.Jodit||win.Jodit}:load(doc)).then(deps=>{
  if(disposed)return null;
  const Jodit=deps.Jodit||win.Jodit,{marked,purifier}=deps;
  if(!Jodit||!marked?.lexer||!purifier?.sanitize)throw Error('Classic editor dependencies unavailable. Exact source is retained.');
  const sanitize=html=>sanitizeProse(html,purifier,doc,{editor:true});
  adapter=createClassicAdapter({source,marked,doc,sanitize});
  const textarea=host.querySelector('textarea');textarea.value=adapter.initial;
  const safeImage=editor=>{
   if(locked||handle.composing||crossesBoundary()){say(Error('Select editable prose on one side of retained source.'));return;}
   editor.s.save();picker?.();
   picker=chooseLocalImage(panel,{api,onSelected:image=>{if(locked||!localImage(image.url))return;editor.s.restore();const img=doc.createElement('img');img.src=image.url;img.alt=image.alt;editor.s.insertNode(img);editor.synchronizeValues();},onClose:()=>editor.s.focus()});
  };
  view=Jodit.make(textarea,{
   ownerWindow:win,ownerDocument:doc,theme:'default',language:'en',toolbar:true,toolbarAdaptive:false,toolbarSticky:false,toolbarButtonSize:'small',
   buttons:classicButtons,buttonsMD:classicButtons,buttonsSM:classicButtons,buttonsXS:classicButtons,
   height:'auto',minHeight:240,statusbar:false,showCharsCounter:false,showWordsCounter:false,showXPathInStatusbar:false,
   enter:'p',spellcheck:true,defaultMode:1,useSearch:false,askBeforePasteHTML:false,askBeforePasteFromWord:false,
   defaultActionOnPaste:'insert_as_html',processPasteHTML:false,
   disablePlugins:['file','filebrowser','video','iframe','source','preview','print','about','powered-by-jodit','drag-and-drop','drag-and-drop-element','paste-from-word','paste-storage','image-properties','image-processor','image','add-new-line'],
   uploader:{url:'',insertImageAsBase64URI:false},filebrowser:{ajax:{url:''}},link:{followOnDblClick:false,processVideoLink:false,processPastedLink:false,modeClassName:false},
   cleanHTML:{fillEmptyParagraph:false,removeEmptyElements:false,replaceNBSP:false},
   controls:{direction:{icon:'paragraph',tooltip:'Paragraph direction',list:{rtl:'Right to left',ltr:'Left to right',auto:'Automatic'},exec:(editor,_current,button)=>{if(locked||handle.composing||crossesBoundary()){say(Error('Select editable prose on one side of retained source.'));return;}const direction=button.control.args?.[0]||'rtl';editor.s.eachSelection(node=>{let el=node.nodeType===1?node:node.parentElement;while(el&&el.parentElement!==editor.editor&&!/^(P|H[1-6]|LI|TD|TH|BLOCKQUOTE)$/.test(el.tagName))el=el.parentElement;if(el&&el!==editor.editor)el.setAttribute('dir',direction);});editor.synchronizeValues();}},image:{icon:'image',tooltip:'Insert approved local image',popup:null,list:null,exec:safeImage},fontsize:{list:[8,10,12,14,16,18,24,32,48,72,96]}},
   events:{
    beforeCommand(command,_ui,value){
     if(locked||handle.composing)return false;
     if(['insertimage'].includes(command.toLowerCase())&&!localImage(String(value)))return false;
     if(crossesBoundary()){say(Error('This selection crosses retained source. Select prose on one side.'));return false;}
    },
    afterCommand(){changed();},
    beforePasteInsert(html){if(/\uFEFF/.test(typeof html==='string'?html:html.textContent||'')){say(Error('This paste contains an invisible source character. Use Advanced source to preserve it exactly.'));return false;}if(locked||crossesBoundary())return false;return sanitize(typeof html==='string'?html:html.outerHTML||'');}
   }
  });
  view.editor.setAttribute('aria-label',label);view.editor.setAttribute('aria-multiline','true');view.editor.setAttribute('role','textbox');view.editor.dir='auto';
  // Jodit owns UI/selection/history. The baseline adopts only mount normalization.
  adapter.adoptInitial(model());
  savedModel=model();lastModel=model();
  view.e.on('change',changed);
  function crossesBoundary(event){
   const selection=win.getSelection();if(!selection?.rangeCount)return false;const range=selection.getRangeAt(0);
   if([...view.editor.querySelectorAll('[data-retained]')].some(n=>range.intersectsNode(n)))return true;
   if(range.collapsed&&/^delete/.test(event?.inputType||'')){
    let top=range.startContainer.nodeType===1?range.startContainer:range.startContainer.parentElement;
    while(top&&top.parentElement!==view.editor)top=top.parentElement;
    if(top){const backward=/Backward$/.test(event.inputType),probe=range.cloneRange();probe.selectNodeContents(top);if(backward)probe.setEnd(range.startContainer,range.startOffset);else probe.setStart(range.startContainer,range.startOffset);const adjacent=backward?top.previousElementSibling:top.nextElementSibling;if(!probe.toString().replace(/\uFEFF/g,'')&&adjacent?.hasAttribute('data-retained'))return true;}
   }
   return false;
  }
  view.editor.addEventListener('beforeinput',event=>{if(event.data?.includes('\uFEFF')){event.preventDefault();say(Error('Use Advanced source for this invisible source character.'));return;}if(crossesBoundary(event)){event.preventDefault();say(Error('This selection crosses retained source. Your prose is retained; select one side.'));}},{signal:ctl.signal});
  view.editor.addEventListener('drop',event=>{event.preventDefault();say(Error('Use the approved local image chooser or paste safe prose.'));},{signal:ctl.signal});
  view.editor.addEventListener('input',changed,{signal:ctl.signal});
  view.editor.addEventListener('compositionstart',()=>{composing=true;},{signal:ctl.signal});
  view.editor.addEventListener('compositionend',()=>{composing=false;settling=true;win.setTimeout(()=>{if(disposed)return;settling=false;lastModel=model();onChange();waiters.splice(0).forEach(r=>r());},0);},{signal:ctl.signal});
  initializing=false;status.textContent='';handle.setLocked(locked);return view;
 }).catch(error=>{if(!disposed)say(error);return null;});
 return handle;
}
