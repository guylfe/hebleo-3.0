// Source browsing is provenance-based. It grants no curriculum or review eligibility.
export function projectSourceVocabulary(content,{offset=0,limit=50,search='',category='',sourceLesson=''}={}) {
 const source=content.lexical?.sourceBrowse;
 if(!source)return null;
 const query=search.trim().toLocaleLowerCase();
 const searchable=w=>w.sourceEntries.map(e=>[e.sourceId,e.lesson,e.part,e.type,...Object.values(e.fields).map(f=>f.text)].join(' ')).join(' ').toLocaleLowerCase();
 const filtered=source.rows.filter(w=>(!category||w.category===category)&&(!sourceLesson||w.sourceEntries.some(e=>String(e.lesson)===sourceLesson))&&(!query||searchable(w).includes(query)));
 const size=Math.min(50,Math.max(1,Number(limit)||50)),total=filtered.length;
 offset=Math.min(Math.max(0,Number(offset)||0),Math.max(0,Math.ceil(total/size)-1)*size);
 return {version:1,mode:'source-browse',digest:source.digest,total,offset,limit:size,counts:source.counts,sourceLessons:source.sourceLessons,rows:filtered.slice(offset,offset+size)};
}
