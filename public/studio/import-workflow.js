import {escapeHTML as e,draftSaveError} from './editor-fields.js';
import {parseVocabularyCSV,suggestColumnMapping,defaultColumnMapping,mapVocabularyRows,vocabularyMappingTargets,vocabularyTextFields} from '../vocabulary-import.js';
import {validateCurriculum,validateLessonComposition,deriveLessonIndices} from '../course.js';
import {inspectImport,renderImportReview} from './import-review.js';
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const styleProperties=['bold','italic','foregroundColor','backgroundColor','horizontalAlignment','textDirection'];
const decoder=(target,property)=>['tags','fieldFormatting','sourceTheme'].includes(target)?'json':['bold','noVocab','noCard'].includes(target)||target==='fieldStyle'&&['bold','italic'].includes(property)?'boolean':'string';
// Review keeps raw source, mapping and the frozen candidate only in client memory.
export function prepareImport(raw,{csv=false,mapping,content,baseRevisionId,expectedDraftToken}){
 const mapped=csv?mapVocabularyRows(parseVocabularyCSV(raw),mapping,content):{content:JSON.parse(raw),warnings:[]};
 const candidate=mapped.content;validateCurriculum(candidate);
 for(const lesson of candidate.lessons||[]){deriveLessonIndices(candidate,lesson);validateLessonComposition(candidate,lesson);}
 inspectImport(content,candidate);
 return freeze({content:structuredClone(candidate),baseContent:structuredClone(content),baseRevisionId,expectedDraftToken,warnings:mapped.warnings||[],mappingSummary:mapped.mappingSummary});
}
export function mountImportWorkflow(host,{session={},getSnapshot,saveDraft,onStaged=()=>{},renderWord}){
 const ctl=new host.ownerDocument.defaultView.AbortController();let disposed=false,saving=false,epoch=0;
 session.columnPage??=0;session.diffPage??=0;
 function invalidate(){epoch++;session.prepared=null;session.diffPage=0;}
 function current(){const s=getSnapshot(),p=session.prepared;return p&&p.baseRevisionId===s.baseRevisionId&&p.expectedDraftToken===s.expectedDraftToken;}
 function status(message){const el=host.querySelector('[data-import-status]');if(el)el.textContent=message;}
 function draw(){if(disposed)return;
 const parsed=session.parsed,suggestions=parsed?suggestColumnMapping(parsed.headers):[],start=session.columnPage*25;
 host.innerHTML='<section class="card studio-import-top" aria-label="Import source"><h2>Import a source</h2><p>JSON preserves the complete pack. CSV updates stable IDs and keeps absent words. CSV has no intrinsic styles; map typed JSON or explicit style columns. Live Sheets and sidecars are unavailable.</p><input type="file" data-import-file accept=".json,.csv,application/json,text/csv" aria-label="Choose a content JSON or vocabulary CSV file"><p>'+e(session.name||'No file selected')+'</p>'+(parsed?'<p>'+parsed.rows.length+' rows · '+parsed.headers.length+' columns. Raw cells and unmapped columns are preserved.</p><div class="table-scroll"><table class="table"><thead><tr><th>Raw header / recognition</th><th>Destination</th><th>Decoder</th><th>Sample raw cells</th></tr></thead><tbody>'+suggestions.slice(start,start+25).map(s=>{const m=session.mapping.columns.find(c=>c.columnIndex===s.columnIndex),target=m?.target||'';return '<tr data-mapping-row="'+s.columnIndex+'"><th>'+e(s.header)+'<br><small>'+e(s.status)+'</small></th><td><select aria-label="Map column '+e(s.header)+'" data-map-target="'+s.columnIndex+'"><option value="">Unmapped (preserve source)</option>'+vocabularyMappingTargets.map(t=>'<option value="'+t+'"'+(target===t?' selected':'')+'>'+t+'</option>').join('')+'</select>'+(target==='fieldStyle'?'<label>Text field<select data-map-field="'+s.columnIndex+'">'+vocabularyTextFields.filter(f=>f!=='id').map(f=>'<option value="'+f+'"'+(m.field===f?' selected':'')+'>'+f+'</option>').join('')+'</select></label><label>Style property<select data-map-property="'+s.columnIndex+'">'+styleProperties.map(f=>'<option value="'+f+'"'+(m.property===f?' selected':'')+'>'+f+'</option>').join('')+'</select></label>':'')+'</td><td>'+e(m?.decode||'raw string')+'</td><td><pre dir="auto">'+e(parsed.rows.slice(0,3).map(r=>r[s.columnIndex]).join('\n'))+'</pre></td></tr>';}).join('')+'</tbody></table></div><nav aria-label="Mapping columns"><button type="button" data-column-page="-1"'+(start===0?' disabled':'')+'>Previous columns</button> Page '+(session.columnPage+1)+' of '+Math.ceil(parsed.headers.length/25)+' <button type="button" data-column-page="1"'+(start+25>=parsed.headers.length?' disabled':'')+'>Next columns</button></nav>':'')+'<div class="button-row"><button type="button" data-prepare-import'+(!session.raw?' disabled':'')+'>Review mapping and build frozen diff</button><button type="button" data-discard-import>Discard import (no writes)</button></div><p data-import-status role="status"></p><div data-import-review></div></section>';
 if(session.prepared){const p=session.prepared,review=host.querySelector('[data-import-review]');review.innerHTML=(current()?'':'<p role="alert">Draft or base changed. Review the retained file and mapping again before Stage.</p>')+renderImportReview(p.baseContent,p.content,{renderWord,validationMessages:p.warnings,page:session.diffPage,pageSize:10})+'<nav aria-label="Import diff pages"><button type="button" data-diff-page="-1">Previous changes</button><button type="button" data-diff-page="1">Next changes</button></nav><button type="button" data-stage-import'+(!current()?' disabled':'')+'>Stage reviewed import as draft</button><p>Publish is a separate action. Stage uses this frozen candidate and captured CAS token.</p>';const pages=Math.max(1,Math.ceil(inspectImport(p.baseContent,p.content).changes.length/10));host.querySelector('[data-diff-page="-1"]').disabled=session.diffPage===0;host.querySelector('[data-diff-page="1"]').disabled=session.diffPage>=pages-1;}
 }
 host.addEventListener('change',async ev=>{try{
 if(ev.target.matches('[data-import-file]')){const file=ev.target.files?.[0];invalidate();session.raw=null;session.parsed=null;session.mapping=null;session.name=file?.name||'';session.columnPage=0;if(!file){draw();return;}if(file.size>700000)throw new Error('File exceeds the 700 KB local limit.');const ticket=epoch,raw=await file.text();if(disposed||ticket!==epoch)return;session.raw=raw;session.csv=file.name.toLowerCase().endsWith('.csv');if(session.csv){session.parsed=parseVocabularyCSV(raw);session.mapping=defaultColumnMapping(session.parsed.headers);}draw();}
 else if(ev.target.matches('[data-map-target],[data-map-field],[data-map-property]')){const row=ev.target.closest('[data-mapping-row]'),i=Number(row.dataset.mappingRow),target=row.querySelector('[data-map-target]').value;invalidate();session.mapping.columns=session.mapping.columns.filter(c=>c.columnIndex!==i);if(target){const field=row.querySelector('[data-map-field]')?.value||'pointed',property=row.querySelector('[data-map-property]')?.value||'bold';session.mapping.columns.push({columnIndex:i,target,decode:decoder(target,property),...(target==='fieldStyle'?{field,property}:{})});session.mapping.columns.sort((a,b)=>a.columnIndex-b.columnIndex);}draw();}
 }catch(error){draw();status(error.message);}},{signal:ctl.signal});
 host.addEventListener('click',async ev=>{const b=ev.target.closest('button');if(!b||b.disabled||saving)return;
 try{
 if(b.matches('[data-prepare-import]')){invalidate();const snapshot=getSnapshot();session.prepared=prepareImport(session.raw,{...snapshot,csv:session.csv,mapping:session.mapping});draw();status('Review complete. No persistent writes. Inspect typed values and the rendered table before Stage.');}
 else if(b.matches('[data-discard-import]')){invalidate();for(const key of ['raw','parsed','mapping','name','csv'])delete session[key];draw();status('Discarded. No persistent writes.');}
 else if(b.matches('[data-column-page]')){session.columnPage+=Number(b.dataset.columnPage);draw();}
 else if(b.matches('[data-diff-page]')){session.diffPage+=Number(b.dataset.diffPage);draw();}
 else if(b.matches('[data-stage-import]')){
 if(!current())throw new Error('Draft or base changed. Review again before Stage.');
 const p=session.prepared;const input={baseRevisionId:p.baseRevisionId,expectedDraftToken:p.expectedDraftToken,content:structuredClone(p.content)};
 saving=true;host.querySelectorAll('input,select,button').forEach(el=>el.disabled=true);const result=await saveDraft(input);
 if(disposed)return;invalidate();for(const key of ['raw','parsed','mapping','name','csv'])delete session[key];await onStaged(result);draw();status('Reviewed import staged. Publish separately.');
 }
 }catch(error){if(!disposed){draw();status(draftSaveError(error)+' · Source and mapping retained.');}}
 finally{saving=false;if(!disposed&&host.querySelector('[data-stage-import]'))host.querySelector('[data-stage-import]').disabled=!current();}
 },{signal:ctl.signal});draw();return {invalidate(){invalidate();draw();},refresh:draw,dispose(){disposed=true;ctl.abort();host.replaceChildren();}};
}
