// Source formatting uses Sheets' UTF-16 run offsets, including Hebrew vowel marks.
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function sheetColor(value, theme = [], seen = new Set()) {
  if(!Array.isArray(theme))theme=[];
  if (typeof value === 'string') return /^#[0-9a-f]{6}$/i.test(value) ? value : null;
  if (!value || typeof value !== 'object') return null;
  if (value.themeColor) {if(seen.has(value.themeColor)||seen.size>100)return null;const next=new Set(seen);next.add(value.themeColor);return sheetColor(theme.find(c => c.colorType === value.themeColor)?.color, theme,next);}
  const color = value.rgbColor || value;
  if (['red','green','blue','alpha'].some(k => color[k] !== undefined && (!Number.isFinite(color[k]) || color[k] < 0 || color[k] > 1))) return null;
  return '#' + ['red','green','blue'].map(k => Math.round((color[k] || 0) * 255).toString(16).padStart(2,'0')).join('');
}
function fontCSS(format = {}, theme) {
  const out = [], color = sheetColor(format.foregroundColorStyle || format.foregroundColor || format.color, theme);
  if (color) out.push('color:'+color);
  if (typeof format.bold === 'boolean') out.push('font-weight:'+(format.bold?'700':'400'));
  if (typeof format.italic === 'boolean') out.push('font-style:'+(format.italic?'italic':'normal'));
  if (typeof format.underline==='boolean' || typeof format.strikethrough==='boolean') out.push('text-decoration:'+([format.underline?'underline':'',format.strikethrough?'line-through':''].filter(Boolean).join(' ')||'none'));
  if(Number.isFinite(format.fontSize)&&format.fontSize>=6&&format.fontSize<=72)out.push('font-size:'+format.fontSize+'pt');
  if(typeof format.fontFamily==='string'&&/^[A-Za-z0-9 -]{1,80}$/.test(format.fontFamily))out.push('font-family:'+format.fontFamily+',Arial,sans-serif');
  return out.join(';');
}
export function cellCSS(cell = {}, theme) {
  const f = cell.effectiveFormat || cell.userEnteredFormat || {}, out = [], color = sheetColor(f.backgroundColorStyle || f.backgroundColor, theme);
  if (color) out.push('background-color:'+color);
  if (['LEFT','CENTER','RIGHT'].includes(f.horizontalAlignment)) out.push('text-align:'+f.horizontalAlignment.toLowerCase());
  if(f.textDirection==='RIGHT_TO_LEFT')out.push('direction:rtl;unicode-bidi:isolate');
  if(f.textDirection==='LEFT_TO_RIGHT')out.push('direction:ltr;unicode-bidi:isolate');
  return out.join(';');
}
export function richCell(value, cell, theme = []) {
  const source = String(value ?? '');
  // Runs are applicable only to their exact source text; never apply stale character offsets.
  const format = cell?.effectiveFormat?.textFormat || cell?.userEnteredFormat?.textFormat || {};
  if (!cell || (cell.formattedValue !== undefined && cell.formattedValue !== source)) return escape(source);
  const runs = [...(cell.textFormatRuns || [])].sort((a,b)=>(a.startIndex||0)-(b.startIndex||0));
  let cursor = 0, html = '', current = {...format};
  for (const run of runs) {
    const start = Math.min(source.length, Math.max(cursor, run.startIndex || 0));
    if (start > cursor) html += '<span style="'+fontCSS(current,theme)+'">'+escape(source.slice(cursor,start))+'</span>';
    current = {...format,...run.format}; cursor = start;
  }
  html += '<span style="'+fontCSS(current,theme)+'">'+escape(source.slice(cursor))+'</span>';
  return html;
}
export function createLessonRenderer(marked, purifier, document) {
  // Rich course content is authored Markdown/HTML, with declarative interactions only.
  return function renderLesson(source) {
    const clean = purifier.sanitize(marked.parse(String(source || ''), {gfm:true,breaks:false}), {
      USE_PROFILES:{html:true}, FORBID_TAGS:['style','form','input','button','iframe','audio','video'],
      FORBID_ATTR:['style'], ADD_ATTR:['dir'], ALLOW_DATA_ATTR:false
    });
    const box=document.createElement('div');box.innerHTML=clean;
    box.querySelectorAll('a').forEach(a=>{const href=a.getAttribute('href')||'';if(!/^(https?:\/\/|\/[^/]|#)/i.test(href))a.removeAttribute('href');a.setAttribute('rel','noopener noreferrer');});
    box.querySelectorAll('img').forEach(img=>{const src=img.getAttribute('src')||'';if(!/^(https:\/\/|\/media\/[A-Za-z0-9_./-]+$)/i.test(src)||src.includes('..')){img.remove();return;}img.setAttribute('loading','lazy');});
    // One isolate spans the whole Hebrew phrase, even when Markdown makes parts bold/italic.
    const blocks=Array.from(box.querySelectorAll('p,li,h1,h2,h3,h4,h5,h6,td,th,summary,div')).filter(el=>!el.querySelector('p,li,h1,h2,h3,h4,h5,h6,td,th,div'));
    if(!blocks.length)blocks.push(box);
    for(const block of blocks){if(block.closest('pre,code,bdi,[dir="rtl"]'))continue;
      const walker=document.createTreeWalker(block,4),nodes=[];let combined='';
      while(walker.nextNode()){const node=walker.currentNode,start=combined.length;nodes.push({node,start,end:start+node.textContent.length});combined+=node.parentElement.closest('code,pre,bdi')?'\ufffc'.repeat(node.textContent.length):node.textContent;}
      const matches=[...combined.matchAll(/[\u0590-\u05ff]+(?:[ \t]+[\u0590-\u05ff]+)*/g)].reverse();
      for(const match of matches){const start=match.index,end=start+match[0].length,a=nodes.find(n=>n.start<=start&&n.end>start),b=nodes.find(n=>n.start<end&&n.end>=end);if(!a||!b)continue;
        const range=document.createRange();range.setStart(a.node,start-a.start);range.setEnd(b.node,end-b.start);
        const isolate=document.createElement('bdi');isolate.dir='rtl';isolate.append(range.extractContents());range.insertNode(isolate);
      }
    }
    box.querySelectorAll('p,li,h1,h2,h3,h4,h5,h6,blockquote,td,th').forEach(el=>{if(!el.hasAttribute('dir'))el.setAttribute('dir','auto');});
    return box.innerHTML;
  };
}
