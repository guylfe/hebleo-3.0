"""Audit saved native readbacks for the bounded MEMORY-A2 comment revision."""
from pathlib import Path
import json, re, hashlib

BASE = Path(__file__).parent
def text(p):
    return ''.join(e.get('textRun',{}).get('content','') for e in p['paragraph']['elements'])
def strip_indexes(v):
    if isinstance(v,dict): return {k:strip_indexes(x) for k,x in v.items() if k not in ('startIndex','endIndex')}
    if isinstance(v,list): return [strip_indexes(x) for x in v]
    return v
def sha(v):
    return hashlib.sha256(json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def compact(name):
    path=BASE/(name+'.json')
    obj=json.loads(path.read_text(encoding='utf-8'))
    if 'section' in obj: return obj
    d=obj['document']; ps=[p for p in d['tabs'][0]['body']['content'] if 'paragraph' in p]
    s=next(i for i,p in enumerate(ps) if text(p).startswith('001 · How memory works —'))
    e=next(i for i,p in enumerate(ps) if i>s and p['paragraph']['paragraphStyle']['namedStyleType']=='HEADING_1')
    out=dict(documentId=d['documentId'],revisionId=d['revisionId'],section=ps[s:e],comments=obj['comments']['comments'],
             prefixHash=sha(strip_indexes(ps[:s])),suffixHash=sha(strip_indexes(ps[e:])),fullTextHash=sha(''.join(map(text,ps))),
             suggestions=sorted(set(re.findall(r'suggest\.[a-z0-9]+',json.dumps(d)))),
             lessonHeadings=[(p['paragraph']['paragraphStyle'].get('headingId'),text(p)) for p in ps if p['paragraph']['paragraphStyle']['namedStyleType']=='HEADING_1'])
    path.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    return out
initial,before,accepted,after=[compact(n) for n in ('before','reconciled-before','accepted','after')]
edits=json.loads((BASE/'edits.json').read_text(encoding='utf-8'))
expected=''.join(map(text,accepted['section'])); offset=accepted['section'][0]['startIndex']
assert all(ord(c)<=0xffff for c in expected)
for edit in sorted(edits,key=lambda x:x['start'],reverse=True):
    lo,hi=edit['start']-offset,edit['end']-offset
    assert expected[lo:hi]==edit['oldText'],edit['start']
    expected=expected[:lo]+edit['newText']+expected[hi:]
actual=''.join(map(text,after['section']))
screens=[text(p).strip() for p in after['section'] if text(p).startswith('Screen ')]
exercises=[text(p).strip() for p in after['section'] if text(p).startswith('MEMORY-A2.')]
deleted_ranges=[(e['start'],e['end']) for e in edits if e['kind']=='delete-section']
retained_heads=[p['paragraph']['paragraphStyle']['headingId'] for p in accepted['section'] if p['paragraph']['paragraphStyle'].get('headingId') and not any(lo<=p['startIndex']<hi for lo,hi in deleted_ranges)]
after_heads=[p['paragraph']['paragraphStyle']['headingId'] for p in after['section'] if p['paragraph']['paragraphStyle'].get('headingId')]
opening=[text(p) for p in accepted['section'] if text(p).startswith(('Welcome to Hebleo,','Learning languages independently','Teaching Hebrew as a tutor','Getting an M.Sc.','This led to a case study','Let’s briefly demonstrate'))]
focus=next(text(p) for p in accepted['section'] if text(p).startswith('While we’ll use all 3 principles')).replace('one::','one:')
checks={
 'exact_requested_replacements':expected==actual,
 'all_nine_latest_suggestions_accepted':len(before['suggestions'])==9 and not accepted['suggestions'] and not after['suggestions'],
 'outside_lesson_content_and_styles_unchanged':all(before[k]==after[k] for k in ('prefixHash','suffixHash')),
 '119_lesson_headings_and_index_links_preserved':before['lessonHeadings']==after['lessonHeadings'] and sum(bool(re.match(r'^\d{3} · ',h[1])) for h in after['lessonHeadings'])==119,
 'retained_section_heading_identities_preserved':retained_heads==after_heads,
 'six_opening_paragraphs_preserved':len(opening)==6 and all(t in actual for t in opening),
 'guy_focus_paragraph_preserved_apart_from_duplicate_colon':focus in actual,
 'six_threads_and_reply_preserved':len(before['comments'])==6 and before['comments']==after['comments'],
 'six_screens_in_order':[int(re.match(r'Screen (\d+)',s)[1]) for s in screens]==list(range(1,7)),
 'exactly_two_demonstration_attempts_and_one_matching_check':len(exercises)==3 and sum('typed recall' in e for e in exercises)==2 and sum('matching' in e for e in exercises)==1,
 'redundant_questions_removed':not any(s in actual for s in ('MEMORY-A2.check.useful-anchor','MEMORY-A2.apply.personal-connection','Apply — complete exercise set','Check — understanding')),
 'three_principles_explained':all(s in actual for s in ('Chunking:','Logical constraints:','Connecting new information to established old information:')),
 'matching_answers_and_all_three_feedbacks':all(s in actual for s in ('1 → C','2 → A','3 → B','FEEDBACK for observation 1','FEEDBACK for observation 2','FEEDBACK for observation 3')),
 'animation_preserves_original_digits':all(re.sub(r'\D','',s)=='0704177609112001' for s in ('0704177609112001','07041776 · 09112001','07/04/1776 · 09/11/2001')) and 'ANIMATION MEMORY-NUMBER-TO-DATES' in actual,
 'optional_explanation_is_not_required':all(s in actual for s in ('OPTIONAL SLIDE-DOWN','collapsed by default','opening it is not required for progress and adds no quiz')),
 'no_mastery_or_retry_requirement':all(s in actual for s in ('Do not offer replay, hints or repeated attempts','No feedback asks for correction or another attempt','no second timed display','Continue for every outcome')),
 'specific_response_feedback_defined':all(s in actual for s in ('dates in reverse order','omitted month/day zeroes','day/month order','combined reversed-date/omitted-zero cases','highlight the differing groups')),
 'proficiency_reference_removed':not re.search(r'\bB[12]\b',actual),
 'roots_patterns_connection_present':'All three principles will come back when we explore Hebrew roots and patterns.' in actual,
}
report=dict(status='PASS' if all(checks.values()) else 'FAIL',checks=checks,documentId=after['documentId'],revisionId=after['revisionId'],edits=len(edits),screens=screens,exercises=exercises,scope='Authoring document only; interaction specifications are not installed features.')
(BASE/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(BASE/'MEMORY-A2_REVISED.md').write_text('# MEMORY-A2 — revision 3 readback\n\nEditable master: https://docs.google.com/document/d/'+after['documentId']+'/edit\n\n'+'\n'.join(line.rstrip() for line in actual.splitlines())+'\n',encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
assert all(checks.values())
