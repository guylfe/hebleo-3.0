// Compatibility state/schema for range-adapter consumers and regression tests only.
// The classic canvas never parses its edits through this schema.
import {Schema,EditorState,Plugin,EditorView,basicSchema,addListNodes,baseKeymap,keymap,history,undo,redo,toggleMark,setBlockType,wrapIn,chainCommands,exitCode,splitListItem,liftListItem,sinkListItem,wrapInList,inputRules,wrappingInputRule,textblockTypeInputRule,tableNodes,tableEditing,goToNextCell,addRowAfter,addColumnAfter,deleteTable} from './vendor/prosemirror.js';

let nodes=addListNodes(basicSchema.spec.nodes,'paragraph block*','block');
nodes=nodes.update('list_item',{...nodes.get('list_item'),attrs:{checked:{default:null}},parseDOM:[{tag:'li',getAttrs:el=>{const box=el.querySelector(':scope > input[type=checkbox],:scope > span > input[type=checkbox]');return {checked:box?box.hasAttribute('checked'):null};}}],toDOM:node=>node.attrs.checked===null?['li',0]:['li',{'data-task-item':'true'},['span',{contenteditable:'false'},['input',{type:'checkbox','data-task-checkbox':'true','aria-label':'Checklist item',...(node.attrs.checked?{checked:''}:{})}]],['div',0]]});
for(const name of ['paragraph','heading','blockquote']){
 const spec=nodes.get(name),toDOM=spec.toDOM;
 nodes=nodes.update(name,{...spec,attrs:{...spec.attrs,dir:{default:'auto'}},parseDOM:spec.parseDOM.map(rule=>({...rule,getAttrs:el=>({...((rule.getAttrs?rule.getAttrs(el):rule.attrs)||{}),dir:el.getAttribute('dir')||'auto'})})),toDOM:node=>{const result=toDOM(node);return [result[0],{dir:node.attrs.dir},...result.slice(1)];}});
}
nodes=nodes.append(tableNodes({tableGroup:'block',cellContent:'block+'})).append({opaque:{group:'block',atom:true,isolating:true,selectable:false,attrs:{raw:{}},toDOM:()=>['div',{'class':'author-opaque',contenteditable:'false'},'Retained source · edit prose on either side. Exact source is available below.']}});
export const proseSchema=new Schema({nodes,marks:basicSchema.spec.marks.append({strike:{parseDOM:[{tag:'s'},{tag:'del'},{tag:'strike'}],toDOM:()=>['s',0]},span:{attrs:{attributes:{default:{}}},parseDOM:[{tag:'span',getAttrs:el=>({attributes:Object.fromEntries([...el.attributes].map(a=>[a.name,a.value]))})}],toDOM:mark=>['span',mark.attrs.attributes,0]}})});
const opaque=doc=>{const out=[];doc.descendants((n,_pos,parent)=>{if(n.type.name==='opaque'){out.push([n.attrs.raw,parent.type.name]);return false;}});return out;};
export function createProseState(doc,{onBoundary=()=>{}}={}){
 const s=proseSchema;
 return EditorState.create({doc,plugins:[
  new Plugin({filterTransaction:tr=>{if(!tr.docChanged)return true;const valid=JSON.stringify(opaque(tr.before))===JSON.stringify(opaque(tr.doc));if(!valid)onBoundary(Error('This edit crosses retained source. Edit the prose on either side separately.'));return valid;}}),
  inputRules({rules:[wrappingInputRule(/^\s*>\s$/,s.nodes.blockquote),wrappingInputRule(/^\s*([-+*])\s$/,s.nodes.bullet_list),wrappingInputRule(/^(\d+)\.\s$/,s.nodes.ordered_list,m=>({order:+m[1]})),textblockTypeInputRule(/^(#{1,6})\s$/,s.nodes.heading,m=>({level:m[1].length})),textblockTypeInputRule(/^```$/,s.nodes.code_block)]}),
  history(),keymap({'Mod-z':undo,'Mod-y':redo,'Shift-Mod-z':redo,'Mod-b':toggleMark(s.marks.strong),'Mod-i':toggleMark(s.marks.em),'Enter':splitListItem(s.nodes.list_item),'Tab':chainCommands(goToNextCell(1),sinkListItem(s.nodes.list_item)),'Shift-Tab':chainCommands(goToNextCell(-1),liftListItem(s.nodes.list_item)),'Shift-Enter':chainCommands(exitCode,(state,dispatch)=>{dispatch?.(state.tr.replaceSelectionWith(s.nodes.hard_break.create()).scrollIntoView());return true;})}),keymap(baseKeymap),tableEditing()
 ]});
}
