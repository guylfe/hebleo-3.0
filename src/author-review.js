// Private author review. Never attach this namespace to authored/public content.
import {createHash, randomUUID} from 'node:crypto';
import {JSDOM} from 'jsdom';
import createDOMPurify from 'dompurify';
import {marked} from 'marked';
import {createLessonRenderer} from '../public/rich.js';
import {DomainError} from './errors.js';
import {compactContext,reconstructContext,validateContextChunks} from './immutable-context.js';

const dom = new JSDOM('');
const render = createLessonRenderer(marked, createDOMPurify(dom.window), dom.window.document);
const copy = value => structuredClone(value);
const canonical = value => Array.isArray(value) ? '[' + value.map(canonical).join(',') + ']' : value && typeof value === 'object' ? '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}' : JSON.stringify(value);
const equal = (a,b) => canonical(a) === canonical(b);
const fail = message => {throw new DomainError(message,400,'AUTHOR_REVIEW_INVALID');};
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const str = (value,max=200) => typeof value === 'string' && value.length > 0 && value.length <= max;
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
const at = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const hash = value => createHash('sha256').update(value).digest('hex');
const keys = (value,allowed) => {if(!object(value)||Object.keys(value).some(k=>!allowed.includes(k)))fail('Unexpected author review fields.');};
export const emptyAuthorReview = () => ({schemaVersion:2, comments:[], drafts:{}, chunks:{}});
export function authorReviewContents(state,snapshotFor,draftTokenFor) {
  return Object.entries(state.drafts).map(([token,draft])=>{
    const content=reconstructContext(draft,snapshotFor(draft.baseRevisionId),state.chunks);
    if(draftTokenFor(draft.baseRevisionId,content)!==token)fail('Author draft snapshot token differs.');
    return content;
  });
}

// v1 projection is the textContent of the SAME sanitized Markdown/HTML renderer
// used by the learner. No whitespace folding or Unicode normalization. Offsets are
// JavaScript UTF-16 code units; Nikkud and surrogate pairs retain their identity.
export function authorProjection(source) {
  const box = dom.window.document.createElement('div');box.innerHTML=render(source);return box.textContent;
}
export function authorField(content, target) {
  const lesson=content.lessons.find(l=>l.id===target.lessonId);
  if(!lesson)fail('Author anchor lesson is missing.');
  let owner=lesson, retired=false;
  if(target.componentId!==null){owner=lesson.blocks?.find(b=>b.id===target.componentId);if(!owner)fail('Author anchor component is missing.');}
  if(target.pageId!==null){owner=owner.textPages?.pages.find(p=>p.id===target.pageId);if(!owner)fail('Author anchor page is missing.');const block=lesson.blocks.find(b=>b.id===target.componentId);retired=!block.textPages.order.includes(target.pageId);}
  if(target.activityId!==null){if(!owner.activity||owner.activity.id!==target.activityId)fail('Author anchor activity is missing.');}
  if(target.fieldPath==='activity'&&target.activityId!==null){const settings=Object.fromEntries(['prompt','options','answer','explanation','durationMs','value','media','gate'].filter(k=>Object.hasOwn(owner,k)).map(k=>[k,owner[k]]));return {text:canonical({...settings,activity:owner.activity}),retired};}
  let value;
  const allowed=target.pageId!==null?['html','title','prompt','explanation','answer','extraInformation']:target.componentId!==null?['text','extraInformation']:['title','explanation','extraInformation'];
  if(target.fieldPath==='options.extraInformation'&&target.componentId!==null&&target.pageId===null)value=owner.options?.extraInformation??'';
  else if(allowed.includes(target.fieldPath))value=owner[target.fieldPath]??'';
  else if(target.activityId!==null&&['activity.prompt','activity.instruction','activity.title'].includes(target.fieldPath))value=owner.activity[target.fieldPath.split('.')[1]]??'';
  else fail('This source field does not support author anchors.');
  if(typeof value!=='string')fail('Author anchor must name an authored text field.');
  return {text:authorProjection(value),retired};
}
function validateTarget(t) {
  if(!str(t.lessonId)||!str(t.fieldPath,80)||!['componentId','pageId','activityId'].every(k=>t[k]===null||str(t[k])))fail('Invalid stable author anchor identity.');
  if(t.pageId!==null&&t.componentId===null||t.activityId!==null&&t.pageId===null)fail('Author anchor hierarchy is incomplete.');
}
function safeBoundary(text,index){return index===0||index===text.length||!(text.charCodeAt(index)>=0xdc00&&text.charCodeAt(index)<=0xdfff&&text.charCodeAt(index-1)>=0xd800&&text.charCodeAt(index-1)<=0xdbff);}
function selectionFor(text,selection) {
  if(selection===null)return null;
  keys(selection,['start','end','exact','prefix','suffix']);
  const {start,end,exact,prefix,suffix}=selection;
  if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<=start||end>text.length||end-start>8000||!safeBoundary(text,start)||!safeBoundary(text,end)||typeof exact!=='string'||exact!==text.slice(start,end)||typeof prefix!=='string'||prefix.length>80||typeof suffix!=='string'||suffix.length>80||text.slice(Math.max(0,start-prefix.length),start)!==prefix||text.slice(end,end+suffix.length)!==suffix)fail('Selected quote does not match the saved source (UTF-16 offsets).');
  return {start,end,exact,prefix:text.slice(Math.max(0,start-80),start),suffix:text.slice(end,end+80)};
}
function anchorFor(content,input) {
  validateTarget(input);const source=authorField(content,input);
  return {projectionVersion:1,lessonId:input.lessonId,componentId:input.componentId,pageId:input.pageId,activityId:input.activityId,fieldPath:input.fieldPath,revisionId:input.baseRevisionId,draftToken:input.draftToken,selection:selectionFor(source.text,input.selection),sourceText:source.text,contentHash:hash(source.text)};
}
function bodyOK(body){return str(body,8000)&&body.trim().length>0;}
export class AuthorReview {
  constructor(store,draftTokenFor){this.store=store;this.draftTokenFor=draftTokenFor;}
  state(){return this.store.get('author-review')||emptyAuthorReview();}
  contexts(){return authorReviewContents(this.state(),id=>this.store.snapshot(id),this.draftTokenFor);}
  context(input){
    if(!Number.isInteger(input.baseRevisionId)||input.baseRevisionId<1)fail('An exact saved base revision is required.');
    if(input.draftToken===null)return this.store.snapshot(input.baseRevisionId);
    if(!str(input.draftToken,80))fail('Name an exact saved draft token, or null for a revision.');
    const draft=this.store.previewDraft(input.draftToken);
    if(draft.baseRevisionId!==input.baseRevisionId)throw this.store.draftConflict('The author comment draft base changed.');
    return draft.content;
  }
  projection(query){
    const input={...query,baseRevisionId:Number(query.baseRevisionId),draftToken:query.draftToken||null,componentId:query.componentId||null,pageId:query.pageId||null,activityId:query.activityId||null};
    validateTarget(input);const {text}=authorField(this.context(input),input);
    return {projectionVersion:1,text,contentHash:hash(text),offsets:'UTF-16'};
  }
  create(userId,input){
    this.store.requireAuthor(userId);
    keys(input,['requestId','lessonId','baseRevisionId','draftToken','componentId','pageId','activityId','fieldPath','selection','body']);
    if(!uuid(input.requestId)||!bodyOK(input.body))fail('Enter a review comment and a UUID request ID.');
    return this.store.transaction(()=>{
      const state=this.state(),previous=state.comments.find(c=>c.createdBy===userId&&c.requestId===input.requestId);
      if(previous){if(!equal(previous.request,input))throw new DomainError('Conflicting author comment request ID.',409,'AUTHOR_REVIEW_CONFLICT');return copy(previous);}
      if(state.comments.length>=20000)fail('Private review contains 20000 comments. Export and review this workspace before adding more.');
      const content=this.context(input),anchor=anchorFor(content,input),now=new Date().toISOString();
      const comment={id:randomUUID(),requestId:input.requestId,request:copy(input),visibility:'author',body:input.body,createdBy:userId,createdAt:now,updatedBy:userId,updatedAt:now,status:'open',version:1,anchor,audit:[{requestId:input.requestId,action:'create',status:'open',version:1,by:userId,at:now}]};
      if(input.draftToken!==null)state.drafts[input.draftToken]=compactContext(input.baseRevisionId,this.store.snapshot(input.baseRevisionId),content,state.chunks);
      state.comments.push(comment);this.store.set('author-review',state);return copy(comment);
    });
  }
  status(userId,id,input){
    this.store.requireAuthor(userId);keys(input,['requestId','expectedVersion','status']);
    if(!uuid(input.requestId)||!Number.isInteger(input.expectedVersion)||input.expectedVersion<1||!['open','resolved'].includes(input.status))fail('Invalid author comment status request.');
    return this.store.transaction(()=>{
      const state=this.state(),c=state.comments.find(c=>c.id===id);if(!c)throw new DomainError('Author comment not found.',404);
      const previous=c.audit.find(a=>a.requestId===input.requestId);
      if(previous){if(previous.by!==userId||previous.expectedVersion!==input.expectedVersion||previous.status!==input.status||previous.action!=='status')throw new DomainError('Conflicting author status request ID.',409,'AUTHOR_REVIEW_CONFLICT');return copy(c);}
      if(c.version!==input.expectedVersion)throw new DomainError('Author comment changed. Reload before changing status.',409,'AUTHOR_REVIEW_CONFLICT',{current:copy(c)});
      const now=new Date().toISOString();c.status=input.status;c.version++;c.updatedBy=userId;c.updatedAt=now;c.audit.push({requestId:input.requestId,expectedVersion:input.expectedVersion,action:'status',status:input.status,version:c.version,by:userId,at:now});this.store.set('author-review',state);return copy(c);
    });
  }
  list(userId,query={}){
    this.store.requireAuthor(userId);
    if(!str(query.lessonId)||!['open','resolved','all',undefined].includes(query.status))fail('Choose a lesson and an author comment status.');
    const limit=query.limit===undefined?50:Number(query.limit),offset=query.cursor===undefined?0:Number(query.cursor);
    if(!Number.isInteger(limit)||limit<1||limit>100||!Number.isInteger(offset)||offset<0)fail('Invalid author comment pagination.');
    const all=this.state().comments.filter(c=>c.anchor.lessonId===query.lessonId&&(!query.status||query.status==='all'||c.status===query.status));
    let content=this.store.currentDraft()?.content||this.store.snapshot(),historical=false;
    if(query.revisionId!==undefined){const rev=Number(query.revisionId);if(!Number.isInteger(rev))fail('Invalid historical revision.');content=this.store.snapshot(rev);historical=rev!==this.store.get('active');}
    return {comments:all.slice(offset,offset+limit).map(c=>({...copy(c),...anchorState(c.anchor,content,historical)})),total:all.length,nextCursor:offset+limit<all.length?String(offset+limit):null};
  }
}
export function anchorState(anchor,content,historical=false) {
  if(content.first2FeedbackTransition?.retiredActivityIds?.includes(anchor.activityId)||content.first2FeedbackTransition?.retiredTopLevelPageIds?.includes(anchor.pageId))return {anchorState:'historical',currentSelection:null};
  let current;try{current=authorField(content,anchor);}catch{return {anchorState:'missing',currentSelection:null};}
  if(historical||current.retired)return {anchorState:'historical',currentSelection:null};
  if(hash(current.text)===anchor.contentHash)return {anchorState:'current',currentSelection:copy(anchor.selection)};
  if(anchor.selection){
    const {exact}=anchor.selection,start=current.text.indexOf(exact);
    if(start>=0&&current.text.indexOf(exact,start+1)<0)return {anchorState:'current',relocated:true,currentSelection:{...anchor.selection,start,end:start+exact.length}};
  }
  return {anchorState:'changed',currentSelection:null};
}

// Validate the entire namespace BEFORE restore starts a transaction or writes media.
export function validateAuthorReview(value,{carried,validateContent,draftTokenFor,authorIds}) {
  if(value==null)return emptyAuthorReview();
  keys(value,value.schemaVersion===1?['schemaVersion','comments','drafts']:['schemaVersion','comments','drafts','chunks']);
  if(![1,2].includes(value.schemaVersion)||!Array.isArray(value.comments)||value.comments.length>20000||!object(value.drafts))fail('Invalid author review backup.');
  const state=copy(value),ids=new Set(),requests=new Set(),contents=new Map();
  if(value.schemaVersion===1)state.chunks={};else validateContextChunks(state.chunks);
  for(const [token,draft] of Object.entries(state.drafts)){
    keys(draft,value.schemaVersion===1?['baseRevisionId','content']:['baseRevisionId','baseHash','delta']);
    if(!Number.isInteger(draft.baseRevisionId)||draft.baseRevisionId<1||!carried.has(draft.baseRevisionId))fail('Missing author draft base revision.');
    const base=carried.get(draft.baseRevisionId),content=value.schemaVersion===1?draft.content:reconstructContext(draft,base,state.chunks);
    validateContent(content);
    if(draftTokenFor(draft.baseRevisionId,content)!==token)fail('Author draft snapshot token differs.');
    contents.set(token,content);
    if(value.schemaVersion===1)state.drafts[token]=compactContext(draft.baseRevisionId,base,content,state.chunks);
  }
  state.schemaVersion=2;
  for(const c of state.comments){
    keys(c,['id','requestId','request','visibility','body','createdBy','createdAt','updatedBy','updatedAt','status','version','anchor','audit']);
    if(!uuid(c.id)||ids.has(c.id)||!uuid(c.requestId)||requests.has(c.createdBy+'|'+c.requestId)||!bodyOK(c.body)||c.visibility!=='author'||!authorIds.includes(c.createdBy)||!authorIds.includes(c.updatedBy)||!at(c.createdAt)||!at(c.updatedAt)||!['open','resolved'].includes(c.status)||!Number.isInteger(c.version)||c.version<1)fail('Invalid private author comment.');
    ids.add(c.id);requests.add(c.createdBy+'|'+c.requestId);
    keys(c.request,['requestId','lessonId','baseRevisionId','draftToken','componentId','pageId','activityId','fieldPath','selection','body']);
    keys(c.anchor,['projectionVersion','lessonId','componentId','pageId','activityId','fieldPath','revisionId','draftToken','selection','sourceText','contentHash']);
    if(c.request.requestId!==c.requestId||c.request.body!==c.body)fail('Author comment receipt differs.');
    if(!Number.isInteger(c.request.baseRevisionId)||c.request.baseRevisionId<1||!(c.request.draftToken===null||str(c.request.draftToken,80)))fail('Invalid original author receipt pins.');
    const source=c.anchor.draftToken===null?carried.get(c.anchor.revisionId):contents.get(c.anchor.draftToken);
    const linkedRequest={...c.request,baseRevisionId:c.anchor.revisionId,draftToken:c.anchor.draftToken};
    if(!source||c.anchor.draftToken!==null&&state.drafts[c.anchor.draftToken].baseRevisionId!==c.anchor.revisionId||!equal(anchorFor(source,linkedRequest),c.anchor))fail('Author anchor snapshot differs.');
    if(!Array.isArray(c.audit)||c.audit.length!==c.version)fail('Invalid author comment audit length.');
    const receiptIds=new Set();let time=-Infinity;
    c.audit.forEach((a,i)=>{
      keys(a,i===0?['requestId','action','status','version','by','at']:['requestId','expectedVersion','action','status','version','by','at']);
      if(!uuid(a.requestId)||receiptIds.has(a.requestId)||!authorIds.includes(a.by)||!at(a.at)||Date.parse(a.at)<time||a.version!==i+1||!['open','resolved'].includes(a.status)||a.action!==(i?'status':'create')||i&&a.expectedVersion!==i||!i&&(a.requestId!==c.requestId||a.by!==c.createdBy||a.at!==c.createdAt||a.status!=='open'))fail('Invalid author comment audit.');
      receiptIds.add(a.requestId);time=Date.parse(a.at);
    });
    const last=c.audit.at(-1);if(last.status!==c.status||last.by!==c.updatedBy||last.at!==c.updatedAt)fail('Author comment status differs from its audit.');
  }
  return state;
}
export function relinkAuthorReview(state,ids,draftTokenFor,snapshotFor) {
  const result=copy(state),tokens=new Map();
  result.drafts=Object.fromEntries(Object.entries(result.drafts).map(([old,d])=>{const content=reconstructContext(d,snapshotFor(d.baseRevisionId),result.chunks);d.baseRevisionId=ids.get(d.baseRevisionId);const token=draftTokenFor(d.baseRevisionId,content);tokens.set(old,token);return [token,d];}));
  // Client receipts are immutable, so an interrupted create can retry after restore.
  // Only navigable anchor pins and retained draft contexts are relinked.
  for(const c of result.comments){c.anchor.revisionId=ids.get(c.anchor.revisionId);if(c.anchor.draftToken!==null)c.anchor.draftToken=tokens.get(c.anchor.draftToken);}
  return result;
}

// Restoring an older/legacy backup cannot silently erase newer private review.
// Identical or prefix audit histories merge; diverging history rejects atomically.
export function mergeAuthorReview(existing,incoming){
 const result=copy(existing),notes=new Map(result.comments.map(c=>[c.id,c]));
 for(const c of incoming.comments){
  const old=notes.get(c.id);
  if(!old){if(result.comments.some(n=>n.createdBy===c.createdBy&&n.requestId===c.requestId))fail('Restored author request collides with an existing note.');result.comments.push(copy(c));notes.set(c.id,c);continue;}
  const identity=n=>({...n.anchor,revisionId:0,draftToken:null});
  if(!equal(identity(old),identity(c))||!equal(old.request,c.request)||old.body!==c.body||old.createdBy!==c.createdBy||old.createdAt!==c.createdAt||!equal(old.audit.slice(0,Math.min(old.version,c.version)),c.audit.slice(0,Math.min(old.version,c.version))))fail('Restored author review diverges from retained history.');
  if(c.version>old.version){result.comments[result.comments.findIndex(n=>n.id===c.id)]=copy(c);notes.set(c.id,c);}
 }
 for(const [token,draft] of Object.entries(incoming.drafts)){if(result.drafts[token]&&!equal(result.drafts[token],draft))fail('Restored author draft context conflicts.');result.drafts[token]=copy(draft);}
 for(const [key,node] of Object.entries(incoming.chunks)){if(Object.hasOwn(result.chunks,key)&&!equal(result.chunks[key],node))fail('Restored immutable author chunk conflicts.');Object.defineProperty(result.chunks,key,{value:copy(node),enumerable:true,writable:true,configurable:true});}
 return result;
}
