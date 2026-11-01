import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {marked} from 'marked';
import purify from 'dompurify';
export function classicDOM(t){
 const d=new JSDOM('<main class="inline-author"></main>',{pretendToBeVisual:true,runScripts:'outside-only',url:'http://localhost/'}),w=d.window,doc=w.document;
 w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
 w.ResizeObserver=class {observe(){} unobserve(){} disconnect(){}};
 w.document.execCommand=()=>false;
 w.Range.prototype.getBoundingClientRect=()=>({left:0,right:0,top:0,bottom:0,width:0,height:0});w.Range.prototype.getClientRects=()=>[];
 w.focus=()=>{};w.scrollTo=()=>{};w.scrollBy=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.eval(readFileSync(new URL('../public/author/vendor/jodit.min.js',import.meta.url),'utf8'));
 const realm=value=>Array.isArray(value)?w.Array.from(value,realm):value&&Object.getPrototypeOf(value)===Object.prototype?Object.assign(new w.Object(),Object.fromEntries(Object.entries(value).map(([k,v])=>[k,realm(v)]))):value;
 const Jodit={make:(el,options)=>w.Jodit.make(el,realm(options))};
 t.after(()=>w.close());return {w,doc,host:doc.querySelector('main'),deps:{marked,purifier:purify(w),Jodit}};
}
