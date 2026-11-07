# Conjugation content release gate — 7 November 2026

**Production-safe coverage from the supplied evidence: zero complete grading records.** The v1 candidate retains exactly 11 verb and 19 preposition identities, with no approved forms. This is a bounded content handoff for both implementations; it is not a new linguistic audit, a deployed catalogue, or a full 11/19 learner release.

Output folder:
`C:\Users\Trans\.openmausbot\task-workspaces\71c71389-5334-4e0c-9ca8-d80dd28223d1\653fb433-7485-48b1-9f7c-cb22711bda02\hebleo-3\.curriculum-conjugation-gate-20261107`

## Evidence and exact counts

The complete implementation authorization and engineering contract were read, together with PLAN.md, the preview's DECISIONS.md, and the existing REVIEW.md/COVERAGE.md. PROVENANCE_LEDGER.json records absolute paths and SHA256 for all 12 inputs. It reuses the prior reconciliation and reads its 302 chosen source cells back against the unchanged draft. It does not claim a fresh online audit or exhaustive coverage of the entire course, Masterfile, recordings, or original documents.

| Evidence class | Count | Release status |
|---|---:|---|
| Approved lexical selections | 30 (11 verbs / 19 prepositions) | Identity selection only |
| Course-attested semantic slots | 302 (115 verb / 187 preposition) | All held as complete drill records |
| Review units | 509 (319 verb / 190 preposition) | Review convention; not 509 released forms |
| Missing selected-course slots | 207 | Missing, not inapplicable |
| External verb-slot proposals | 308 | Separate held evidence set |
| External proposals overlapping course slots | 115 | Do not add these to 302 |
| External proposals for missing verb slots | 193 | Includes missing future/imperative/infinitive/past/present targets |
| Missing action-noun entries | 11 | Lexical/sense proposals, outside the 308 |
| Missing preposition slots | 3 | בשביל first plural and third plural masculine/feminine |
| Complete approved grading records | **0** | Native and WordPress teaching release blocked |

The 207 missing units are 193 external-only verb targets + 11 action nouns + 3 preposition targets. Future and imperative are missing for all 11 verbs; five infinitives are missing. The prior COVERAGE.md gives the per-word totals; every slot is preserved in this handoff's ledger.

## Why the safe intersection is empty

**Preserve:** the exact human source strings, stable lexical IDs, selection and resolved findings. Source attestation alone is not a complete answer-key approval. The current evidence never supplies a separately authored, independently attested standard-unpointed answer for each chosen semantic slot. All 302 chosen Hebrew cells contain marks. Neither deleting those marks nor reusing a root/lemma as a person-specific standard spelling establishes that missing evidence. Some proposed unpointed spellings occur in the prior review, but those are explicitly editorial proposals.

The verb evidence includes authored English, preserved verbatim with coordinates in `englishEvidence`; embedded glosses and adjacent vocabulary cells remain intact. No English gloss was composed or split into an accepted-answer list. Preposition evidence has base meanings plus separate suffix headings, rather than authored inflected English answers. Combining those into e.g. “with him” would author new cue/answer text. Infinitive meanings sometimes include objects/prepositions/context; no short replacement cue was invented.

**Improve:** supply exact missing standard-spelling evidence and review the complete record before assigning `approval:approved`. The smallest gate does not require correcting every source or settling every pointing difference. **Reconsider:** requiring a global full-Nikkud decision, all 11 action nouns, or all future paradigms before a deliberately bounded first subset can be approved.

## Smallest concrete release decision

For the first nonempty teaching subset, Guy can approve **one complete record**, while every other slot remains held. Proposed first record for review (not currently approved and not placed in the candidate's forms):

| v1 field | Proposed value / exact evidence |
|---|---|
| id | `verb-proposal-02.past.3sg.m` |
| wordId | `verb-proposal-02` |
| tense / person / gender / number | `past` / `3` / `masculine` / `singular` |
| pronoun | `he` (target metadata from the authored gloss) |
| pointed | `רָצָה`, post 25792, table 2, row 13, cell 0 |
| unpointed | `רצה` — proposed standard spelling requiring Guy's explicit authorship/approval or independent authored slot evidence; the lexical selection alone does not establish it as a grading answer |
| english / acceptedEnglish | `(he) wanted` / `["(he) wanted"]`, unchanged authored text at post 25792, table 2, row 13, cell 1 |
| acceptedHebrew | Proposed exact strings `["רָצָה", "רצה"]`, pending approval of the complete record |
| word display | Existing literal selection label `רצה–רוצה`; pointed label may remain absent under v1 fallback |
| provenance needed | Retain the two course coordinates and source hashes; add Guy's exact standard-spelling and record approval reference |

All table/row/cell coordinates are zero-based. This is an isolated proposed record; no live table correction is required. Retaining the existing English string avoids a new English cue decision. Its pointed form avoids the disputed systematic examples. One form permits a bounded Write/reveal drill in both directions; it cannot provide distinct multiple-choice distractors. Engineering must handle that shortage honestly. This minimum does **not** satisfy the full selected 11/19 content scope or full Choose experience.

Next owner: Lead returns this precise proposal and gate to Leo/Guy. Guy supplies the content approval/evidence; Curriculum then packages only that approved subset in v1, and Lead integrates and verifies both versions. No question has been sent to Leo and no approval is inferred from another bot's message.

## Decisions for broader coverage

These are separable decisions, not prerequisites to the one-record subset. The ledger attaches specific V/P finding references and held reasons to each exact lexical/semantic ID so a reviewer can identify the affected rows without reopening the audit.

| Gate | Concrete decision / authoring work | Existing evidence |
|---|---|---|
| Standard unpointed answers | Author/attest each included slot independently, including ey-suffix full spelling; choose accepted variants explicitly | No separate slot-level standard-unpointed key in selected source snapshot |
| Pointing and clear defects | Decide course curated versus full pointing only where included; approve any repairs independently | V01/V02b/V03–V09, P02/P04/P06/P07/P09–P12 in REVIEW.md |
| English accepted answers | Retain exact authored verb glosses where suitable; author short inflected preposition meanings and any additional legitimate readings | Verbatim cells/base meaning/headings in ledger; editorial EnglishDisplay is not approved wording |
| Missing paradigms | Review each selected reference completion, plus three derived בשביל forms | 308 external verb proposals held separately; no automatic promotion |
| Action nouns | Choose all included lexemes and senses individually | All 11 missing; למידה/לימוד, רצייה versus רצון, מגורים especially need deliberate selection |

Do not reopen resolved historical issues: current רצו says they wanted; איתו/איתנו and בשבילכם are present correctly; ליד and כמו gender columns are aligned. These facts do not approve other fields in those records.

## Package and checks actually performed

- `catalog.candidate.json`: exact contract v1 envelope, 30 literal unpointed selection labels, no pointed labels invented, empty forms array. Selection labels come verbatim from PLAN.md's Approved selection paragraph, not mark stripping. All original 11/19 IDs are preserved.
- `PROVENANCE_LEDGER.json`: 509 held course review units with exact old evidence, original matrix pointers, English evidence coordinates, missing-field reasons and per-lexeme decisions; 308 external proposals in a separate array; input path/hash manifest and lexical-label provenance.
- `build_catalog.py`: reproducible local evidence packager/verifier. It reads the referenced prior artifacts and writes only this output folder. It does not modify sources or recalculate paradigms.
- `VERIFICATION.json`: destination JSON readback, exact identity/count checks, all 302 source-cell comparisons, and unchanged hashes for all 12 inputs passed.

Command run from the shared repository: `$env:PYTHONUTF8='1'; python .curriculum-conjugation-gate-20261107/build_catalog.py` — **PASS**. Candidate SHA256: `7046599c9abb4c61f92711392d18c2feb0a373cd3d4fb6fbd66712b776c345b8`. Ledger hash is recorded in VERIFICATION.json.

No application/runtime, UI, import, publication, installation, learner-data mutation, live source edit, or shared checklist edit was performed. No main-branch commit or push: the contract explicitly requests external task artifacts and reserves integration to Lead. Existing shared work was left untouched. This package is ready for Lead's bounded integration review; production grading remains blocked on the stated content approval.
