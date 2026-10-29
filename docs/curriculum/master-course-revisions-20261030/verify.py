"""Verify this bounded document revision; does not read or write the live document."""
from pathlib import Path
import hashlib, json, re

BASE = Path(__file__).parent
def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode('utf-8')).hexdigest()
def text(p):
    return ''.join(e.get('textRun', {}).get('content', '') for e in p['paragraph']['elements'])
def without_indexes(value):
    if isinstance(value, dict):
        return {k:without_indexes(v) for k,v in value.items() if k not in ('startIndex','endIndex')}
    if isinstance(value, list):
        return [without_indexes(v) for v in value]
    return value
def compact(name):
    path = BASE / (name + '.json')
    raw = json.loads(path.read_text(encoding='utf-8'))
    if 'section' in raw:
        return raw
    d = raw.get('document', raw)
    ps = [p for p in d['tabs'][0]['body']['content'] if 'paragraph' in p]
    start = next(i for i,p in enumerate(ps) if text(p).startswith('001 · How memory works —'))
    end = next(i for i,p in enumerate(ps) if i > start and p['paragraph']['paragraphStyle']['namedStyleType'] == 'HEADING_1')
    comments = raw.get('comments', {}).get('comments', [])
    out = {
        'documentId':d['documentId'], 'revisionId':d['revisionId'], 'tabId':'t.0',
        'fullTextSha256':digest(''.join(map(text, ps))), 'fullCharacterCount':len(''.join(map(text, ps))),
        'prefixSha256':digest(without_indexes(ps[:start])), 'suffixSha256':digest(without_indexes(ps[end:])),
        'lessonHeadings':[(p['paragraph']['paragraphStyle'].get('headingId'),text(p)) for p in ps if p['paragraph']['paragraphStyle']['namedStyleType']=='HEADING_1'],
        'suggestions':sorted(set(re.findall(r'suggest\.[a-z0-9]+',json.dumps(d)))),
        'section':ps[start:end], 'comments':comments,
    }
    path.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    return out

before, accepted, after = [compact(n) for n in ('before','accepted','after')]
before_text = ''.join(map(text,accepted['section']))
expected = before_text
offset = accepted['section'][0]['startIndex']
edits = json.loads((BASE/'edits.json').read_text(encoding='utf-8'))
# Native indexes count UTF-16 code units. This section uses BMP characters only.
assert all(ord(c) <= 0xffff for c in before_text)
for e in sorted(edits,key=lambda e:e['start'],reverse=True):
    lo,hi = e['start']-offset,e['end']-offset
    assert expected[lo:hi] == e['oldText'], e['start']
    expected = expected[:lo] + e['newText'] + expected[hi:]
actual = ''.join(map(text,after['section']))
author_starts = ('Welcome to Hebleo,','Learning languages independently','Teaching Hebrew as a tutor','Getting an M.Sc.','This led to a case study','Let’s briefly demonstrate')
author_text = [text(p) for p in accepted['section'] if text(p).startswith(author_starts)]
screens = [text(p).strip() for p in after['section'] if text(p).startswith('Screen ')]
headings = lambda d: [p['paragraph']['paragraphStyle']['headingId'] for p in d['section'] if p['paragraph']['paragraphStyle'].get('headingId')]
checks = {
    'exact_reviewed_replacements':actual == expected,
    'three_suggestions_accepted':len(before['suggestions'])==3 and not accepted['suggestions'] and not after['suggestions'],
    'outside_lesson_text_and_styles_unchanged':all(before[k]==after[k] for k in ('prefixSha256','suffixSha256')),
    'all_119_lesson_ids_and_heading_links_preserved':sum(bool(re.match(r'^\d{3} · ',h[1])) for h in after['lessonHeadings'])==119 and before['lessonHeadings']==after['lessonHeadings'],
    'in_lesson_heading_identities_preserved':headings(accepted)==headings(after),
    'six_guy_paragraphs_verbatim':len(author_text)==6 and all(t in actual for t in author_text),
    'both_comment_threads_preserved':len(before['comments'])==2 and before['comments']==after['comments'],
    'six_screens_numbered_in_order':[int(re.match(r'Screen (\d+)',s)[1]) for s in screens]==list(range(1,7)),
    'both_number_answers_preserve_leading_zero':actual.count('ANSWER / ACCEPTED MODEL: 0704177609112001.')==2,
    'timing_and_accessibility_specified':all(s in actual for s in ('10,000 ms','Never autoplay','untimed study','nonvisual','Leaving the page cancels')),
    'old_picture_and_shape_tasks_removed':not any(s in actual for s in ('MEMORY-OBJECTS','MEMORY-SHAPES','cup | key | apple','embedded.objects','embedded.shape-break')),
    'five_exercises_with_answers':sum(' — ' in text(p) and text(p).startswith('MEMORY-A2.') for p in after['section'])==5 and actual.count('ANSWER / ACCEPTED MODEL:')==5,
}
for prompt, options in [
    ('What changed when we recognised the two dates?', ['Some of the digits were removed.','The same digits connected to familiar events.','The digits were rearranged into a different number.']),
    ('When you use this idea to learn something new, what should you look for?', ['A connection to something you already know.','The most complicated story you can invent.','A way to avoid ever practising it again.'])]:
    checks['options_and_feedback_'+prompt] = all(f'{chr(65+i)}. {option}' in actual and f'FEEDBACK after “{option}”:' in actual for i,option in enumerate(options))
report={'status':'PASS' if all(checks.values()) else 'FAIL','checks':checks,'documentId':after['documentId'],'revisionId':after['revisionId'],'changedParagraphs':len(edits),'screens':screens,'scope':'MEMORY-A2 only; no application, publication or source-workbook mutation'}
(BASE/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
readable = '\n'.join(line.rstrip() for line in actual.splitlines())+'\n'
(BASE/'MEMORY-A2_REVISED.md').write_text('# MEMORY-A2 — readback snapshot, 30 October 2026\n\nEditable master: https://docs.google.com/document/d/'+after['documentId']+'/edit\n\n'+readable,encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
assert all(checks.values()), 'Document verification failed'
