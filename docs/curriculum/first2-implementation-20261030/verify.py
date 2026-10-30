"""Verify the bounded live-document revision and export its first two lessons."""
from pathlib import Path
import json, hashlib, re

BASE = Path(__file__).parent
def text(p):
    return ''.join(e.get('textRun', {}).get('content', '') for e in p['paragraph']['elements'])
def no_indexes(v):
    if isinstance(v, dict): return {k:no_indexes(x) for k,x in v.items() if k not in ('startIndex','endIndex')}
    if isinstance(v, list): return [no_indexes(x) for x in v]
    return v
def digest(v):
    return hashlib.sha256(json.dumps(v, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
def compact(name):
    p=BASE/(name+'.json'); d=json.loads(p.read_text(encoding='utf-8'))
    if 'section' in d: return d
    doc=d['document']; ps=[x for x in doc['tabs'][0]['body']['content'] if 'paragraph' in x]
    s=next(i for i,p in enumerate(ps) if text(p).startswith('001 · How memory works —') and p['paragraph']['paragraphStyle']['namedStyleType']=='HEADING_1')
    e=next(i for i,p in enumerate(ps) if i>s and text(p).startswith('003 ·') and p['paragraph']['paragraphStyle']['namedStyleType']=='HEADING_1')
    out={'documentId':doc['documentId'],'revisionId':doc['revisionId'],'section':ps[s:e],
      'prefixHash':digest(no_indexes(ps[:s])),'suffixHash':digest(no_indexes(ps[e:])),
      'lessonHeadings':[[p['paragraph']['paragraphStyle'].get('headingId'),text(p)] for p in ps if p['paragraph']['paragraphStyle']['namedStyleType']=='HEADING_1'],
      'comments':d['comments']['comments'],'suggestions':sorted(set(re.findall(r'suggest\.[a-z0-9]+',json.dumps(doc))))}
    p.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    return out
before,after=compact('before'),compact('after-final')
edits=json.loads((BASE/'edits-final.json').read_text(encoding='utf-8'))
expected=''.join(map(text,before['section'])); offset=before['section'][0]['startIndex']
assert all(ord(c)<=0xffff for c in expected)
for edit in sorted(edits,key=lambda x:x['start'],reverse=True):
    lo,hi=edit['start']-offset,edit['end']-offset
    assert expected[lo:hi]==edit['oldText'], edit['start']
    expected=expected[:lo]+edit['newText']+expected[hi:]
actual=''.join(map(text,after['section']))
ps=after['section']; split=next(i for i,p in enumerate(ps) if text(p).startswith('002 ·'))
one,two=ps[:split],ps[split:]
t1,t2=''.join(map(text,one)),''.join(map(text,two))
bold={}
for label in ['Chunking:','Logical constraints:','Memory hooks:']:
    p=next(p for p in one if text(p).startswith(label))
    runs=p['paragraph']['elements']; bold[label]=all(e.get('textRun',{}).get('textStyle',{}).get('bold') for e in runs if e.get('startIndex',0)<p['startIndex']+len(label))
comments_before={c['id']:c for c in before['comments']}
comments_after={c['id']:c for c in after['comments']}
checks={
 'exact_39_scoped_text_edits':expected==actual and len(edits)==39,
 'outside_two_lessons_content_and_styles_preserved':all(before[k]==after[k] for k in ['prefixHash','suffixHash']),
 'all_lesson_headings_and_index_links_preserved':before['lessonHeadings']==after['lessonHeadings'],
 'all_11_comments_preserved':len(comments_before)==11 and comments_before==comments_after,
 'no_pending_suggestions':not after['suggestions'],
 'three_bold_click_revealed_principles':all(bold.values()) and 'REVEAL MEMORY-PRINCIPLES' in t1,
 'one_application_question_no_name_matching':t1.count('MEMORY-A2.embedded.what-changed — multiple choice')==1 and 'Match each observation' not in t1 and 'FEEDBACK after C:' in t1,
 'redundant_optional_theory_removed':'OPTIONAL LEARNER TEXT:' not in t1,
 'second_recall_and_comparison_optional':'Continue without it' in t1 and 'no response, reveal or comparison is required' in t1,
 'original_number_demo_retained':all(x in t1 for x in ['0704177609112001','07/04/1776','09/11/2001']),
 'human_intro_and_adam_preserved':all(text(p) in t1 for p in before['section'] if text(p).startswith(('Welcome to Hebleo,','This led to a case study','Learning languages independently','Teaching Hebrew as a tutor','Getting an M.Sc.'))),
 'no_reintroduced_cefr_reference':not re.search(r'\bB[12]\b',t1),
 'all_four_letters_taught_before_first_question':all(t2.index(x)<t2.index('MNTL-A2.embedded.nun') for x in ['מ represents','נ represents','ת represents','ל represents']),
 'three_letter_screens':len([p for p in two if text(p).startswith('Screen ')])==3,
 'all_seven_letter_exercises_retained':len([p for p in two if re.match(r'MNTL-A2\.(embedded|check|apply)\.',text(p))])==7,
 'no_vocabulary_added':t2.count('No new vocabulary entries')==1,
}
report={'status':'PASS' if all(checks.values()) else 'FAIL','checks':checks,'sourceDocument':after['documentId'],'sourceRevision':after['revisionId'],'scope':'Live authoring content verified. Software implementation and installation are separate pending work.'}
(BASE/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
for name,section in [('MEMORY-A2',one),('MNTL-A2',two)]:
    content=''.join(map(text,section))
    (BASE/(name+'.md')).write_text('# '+name+' — current implementation source\n\nSource: https://docs.google.com/document/d/'+after['documentId']+'/edit\n\n'+'\n'.join(line.rstrip() for line in content.splitlines())+'\n',encoding='utf-8')
    (BASE/(name+'.json')).write_text(json.dumps({'lessonId':name,'sourceRevision':after['revisionId'],'paragraphs':section},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
assert all(checks.values())
