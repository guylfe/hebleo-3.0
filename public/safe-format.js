// Shared persisted prose formatting grammar. No arbitrary CSS reaches a canvas.
const color=v=>/^#[\da-f]{3,8}$/i.test(v)&&[4,5,7,9].includes(v.length)||/^(?:black|white|red|green|blue|navy|yellow|gray|grey|transparent|purple|orange|teal|maroon|lime|aqua|silver|fuchsia|olive)$/i.test(v)||/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i.test(v)&&v.match(/[\d.]+/g).slice(0,3).every(n=>+n<=255);
export function safeStyle(input=''){
 const out=[];
 for(const part of String(input).split(';')){
  const at=part.indexOf(':');if(at<0)continue;
  const key=part.slice(0,at).trim().toLowerCase(),v=part.slice(at+1).trim().toLowerCase();
  if(/[\\{}<>@]|url\s*\(|expression|var\s*\(|!important/.test(v))continue;
  let ok=false;
  if(['color','background-color','border-color'].includes(key))ok=color(v);
  if(key==='font-size'){const m=v.match(/^(\d+(?:\.\d+)?)(px|pt|em|rem|%)$/);if(m){const n=+m[1];ok=m[2]==='px'?n>=8&&n<=96:m[2]==='pt'?n>=6&&n<=72:m[2]==='%'?n>=50&&n<=300:n>=.5&&n<=3;}}
  if(key==='text-align')ok=/^(left|right|center|justify|start|end)$/.test(v);
  if(key==='direction')ok=/^(rtl|ltr)$/.test(v);
  if(key==='font-weight')ok=/^(normal|bold|[4-9]00)$/.test(v);
  if(key==='font-style')ok=/^(normal|italic)$/.test(v);
  if(key==='text-decoration'||key==='text-decoration-line')ok=/^(none|underline|line-through|underline line-through|line-through underline)$/.test(v);
  if(key==='margin-left'||key==='margin-right')ok=/^(0|(?:[1-9]|[1-9]\d|[12]\d\d|300)px)$/.test(v);
  if(key==='list-style-type')ok=/^(disc|circle|square|decimal|lower-alpha|upper-alpha|lower-greek|lower-roman|upper-roman)$/.test(v);
  if(key==='width'||key==='height'){const m=v.match(/^(\d+(?:\.\d+)?)(px|%)$/);ok=Boolean(m&&+m[1]>=0&&+m[1]<=(m[2]==='%'?100:1600));}
  if(key==='vertical-align')ok=/^(top|middle|bottom|baseline)$/.test(v);
  if(key==='border-width')ok=/^[0-6]px$/.test(v);
  if(key==='border-style')ok=/^(solid|dashed|dotted|double|none)$/.test(v);
  if(ok)out.push(key+':'+v);
 }
 return out.join(';');
}
export const localImage=v=>/^\/media\/[a-z0-9_./-]+$/i.test(v||'')&&!v.includes('..')&&!v.includes('//');
export function sanitizeProse(html,purifier,doc,{editor=false}={}){
 const template=doc.createElement('template'),box=template.content;
 template.innerHTML=purifier.sanitize(html,{USE_PROFILES:{html:true},FORBID_TAGS:['style','form','input','button','iframe','audio','video','object','embed','link','meta','svg','math'],FORBID_ATTR:['id','name','srcset','background',...(editor?['class']:[])],ADD_ATTR:['dir'],ALLOW_DATA_ATTR:false});
 box.querySelectorAll('[style]').forEach(el=>{const style=safeStyle(el.getAttribute('style'));if(style)el.setAttribute('style',style);else el.removeAttribute('style');});
 box.querySelectorAll('[contenteditable]').forEach(el=>el.removeAttribute('contenteditable'));
 box.querySelectorAll('[dir]').forEach(el=>{if(!/^(auto|rtl|ltr)$/.test(el.dir))el.removeAttribute('dir');});
 box.querySelectorAll('a').forEach(el=>{if(!/^(https?:\/\/|mailto:|\/(?!\/)|#)/i.test(el.getAttribute('href')||''))el.removeAttribute('href');el.setAttribute('rel','noopener noreferrer');});
 box.querySelectorAll('img').forEach(el=>{if(!localImage(el.getAttribute('src')))el.remove();else if(!editor)el.setAttribute('loading','lazy');});
 return template.innerHTML;
}
