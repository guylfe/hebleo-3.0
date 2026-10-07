import {escapeHTML as e} from './editor-fields.js';
import {createLessonRenderer} from '../rich.js';

const loaders = new WeakMap();
function loadLocalDependencies(doc) {
  if (loaders.has(doc)) return loaders.get(doc);
  const pending = (async () => {
    if (!doc.querySelector('[data-studio-markdown-css]')) {
      const link = doc.createElement('link'); link.rel = 'stylesheet';
      link.href = '/studio/vendor/easymde.min.css'; link.dataset.studioMarkdownCss = '';
      doc.head.append(link);
    }
    if (!doc.defaultView.EasyMDE) await new Promise((resolve, reject) => {
      const script = doc.createElement('script'); script.src = '/studio/vendor/easymde.min.js';
      script.onload = resolve; script.onerror = () => {script.remove(); reject(new Error('Local Markdown editor could not load.'));};
      doc.head.append(script);
    });
    const [{marked}, {default:DOMPurify}] = await Promise.all([import('/vendor/marked.js'), import('/vendor/purify.js')]);
    return {EasyMDE:doc.defaultView.EasyMDE, marked, purifier:DOMPurify};
  })();
  loaders.set(doc, pending); pending.catch(() => loaders.delete(doc));
  return pending;
}

// The existing renderer sanitizes Markdown and isolates Hebrew. Preview omits
// external images so editing source never initiates a request to an authored URL.
export function createMarkdownPreview(doc, marked, purifier) {
  const safePurifier = {sanitize(markup, options) {
    const template = doc.createElement('template'); template.innerHTML = purifier.sanitize(markup, options);
    // Template contents are inert: remove remote sources before active-document insertion.
    template.content.querySelectorAll('img').forEach(img => {if (!/^\/media\//.test(img.getAttribute('src') || '')) img.replaceWith(doc.createTextNode(img.alt || 'External image'));});
    return template.innerHTML;
  }};
  return createLessonRenderer(marked, safePurifier, doc);
}

const actions = [
  ['bold','Bold','toggleBold'], ['italic','Italic','toggleItalic'], ['strikethrough','Strikethrough','toggleStrikethrough'],
  ['heading','Heading','toggleHeadingSmaller'], ['quote','Quote','toggleBlockquote'], ['unordered-list','Bullet list','toggleUnorderedList'],
  ['ordered-list','Numbered list','toggleOrderedList'], ['check-list','Checklist','toggleCheckList'], ['code','Code','toggleCodeBlock'],
  ['link','Link','drawLink'], ['image','Image','drawImage'], ['table','Table','drawTable'], ['horizontal-rule','Rule','drawHorizontalRule'],
  ['undo','Undo','undo'], ['redo','Redo','redo'], ['preview','Preview','togglePreview'], ['side-by-side','Split preview','toggleSideBySide'], ['fullscreen','Full screen','toggleFullScreen']
];

// Returns immediately. Await handle.ready before accessing handle.editor.
// dependencies is a trusted test/embedding seam, never content-pack data.
export function mountMarkdownEditor(host, {value = '', onChange = () => {}, direction = 'auto', onDirectionChange = () => {}, label = 'Authored Markdown', name = 'explanation', dependencies} = {}) {
  if (!['auto','rtl','ltr'].includes(direction)) throw new Error('Invalid Markdown direction.');
  const doc = host.ownerDocument, controller = new doc.defaultView.AbortController();
  let editor, disposed = false, muted = false, currentDirection = direction, current = String(value);
  host.innerHTML = `<section class="studio-markdown"><label class="studio-field"><span>${e(label)}</span><textarea rows="8" name="${e(name)}" dir="${direction}" aria-label="${e(label)}"></textarea></label><label class="studio-markdown-direction">Text direction<select aria-label="Markdown text direction"><option value="auto">Automatic</option><option value="rtl">Right to left</option><option value="ltr">Left to right</option></select></label><p data-markdown-status role="status"></p></section>`;
  const textarea = host.querySelector('textarea'), select = host.querySelector('select'), status = host.querySelector('[data-markdown-status]');
  textarea.value = current; select.value = direction;
  const notify = () => {if (!disposed && !muted) {current = editor ? editor.value() : textarea.value; onChange(current);}};
  textarea.addEventListener('input', notify, {signal:controller.signal});
  function setDirection(next) {
    if (!['auto','rtl','ltr'].includes(next)) throw new Error('Invalid Markdown direction.');
    currentDirection = next; textarea.dir = next; select.value = next;
    // CodeMirror 5 supports a whole-document base direction; auto follows first strong character.
    if (editor) editor.codemirror.setOption('direction', next === 'auto' ? (/^[^A-Za-z\u0590-\u05ff]*[\u0590-\u05ff]/.test(editor.value()) ? 'rtl' : 'ltr') : next);
    host.querySelectorAll('.editor-preview,.editor-preview-side').forEach(el => {el.dir = next;});
  }
  select.addEventListener('change', () => {setDirection(select.value); onDirectionChange(currentDirection);}, {signal:controller.signal});
  const handle = {
    get editor() {return editor;}, getValue: () => editor ? editor.value() : textarea.value,
    setValue(next) {if (disposed) return; muted = true; current = String(next); textarea.value = current; editor?.value(current); muted = false; setDirection(currentDirection);},
    setDirection, focus() {if (!disposed) editor ? editor.codemirror.focus() : textarea.focus();},
    dispose() {if (disposed) return; disposed = true; controller.abort(); if (editor) {
      editor.codemirror.off('change', changed);
      if (editor.codemirror.sideBySideRenderingFunction) editor.codemirror.off('update',editor.codemirror.sideBySideRenderingFunction);
      if (editor.codemirror.getOption('fullScreen')) editor.toggleFullScreen();
      editor.toTextArea(); editor.cleanup();
    } host.replaceChildren();}
  };
  function changed() {setDirection(currentDirection); notify();}
  handle.ready = (async () => {
    try {
      const deps = await (dependencies || loadLocalDependencies(doc));
      if (disposed) return null;
      const {EasyMDE, marked, purifier} = deps, preview = createMarkdownPreview(doc, marked, purifier);
      editor = new EasyMDE({element:textarea, initialValue:textarea.value, autoDownloadFontAwesome:false, spellChecker:false,
        autosave:{enabled:false}, autoRefresh:false, autofocus:false, forceSync:true, nativeSpellcheck:false, sideBySideFullscreen:false,
        previewImagesInEditor:false, uploadImage:false, status:false, minHeight:'220px', maxHeight:'520px',
        previewRender:preview, renderingConfig:{sanitizerFunction:html => purifier.sanitize(html)},
        toolbar:actions.map(([name,title,method]) => ({name,title,className:'studio-md-icon',text:title,action:instance => {if (!disposed) EasyMDE[method](instance);}})),
        shortcuts:{togglePreview:'Ctrl-P',toggleSideBySide:'F9',toggleFullScreen:'F11'}
      });
      editor.codemirror.getInputField().setAttribute('aria-label', label);
      host.querySelector('.editor-toolbar')?.setAttribute('aria-label','Markdown formatting');
      host.querySelectorAll('.editor-toolbar button').forEach(button => {button.tabIndex = 0; button.setAttribute('aria-label',button.title); button.querySelector('i')?.setAttribute('aria-hidden','true');});
      // EasyMDE uses icon classes; visible text avoids Font Awesome or font downloads.
      host.querySelectorAll('.editor-toolbar button').forEach((button,i) => {button.textContent = actions[i][1];});
      editor.codemirror.on('change', changed); setDirection(currentDirection);
      status.textContent = 'Markdown editor ready. Preview shows unpublished text.';
      return editor;
    } catch (error) {
      if (!disposed) status.textContent = `${error.message} You can still edit the Markdown text below its label.`;
      return null;
    }
  })();
  return handle;
}
