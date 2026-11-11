# Vocabulary audit checkpoint — 11 November 2026

Owner: Curriculum Designer. User scope: vocabulary only, comparing the original course, the new plan and both supplied decks. No curriculum edits were made.

The local deliverable contains 539 reviewed findings: 240 original-course items/senses for retention review and 299 reviewed deck candidates. A separate appendix retains 2,533 screened candidates with provisional scores. These are not 3,072 confirmed omissions. Severity uses 1–5; no score 5 was justified. The 287 reviewed entries scoring 3–4 are the starting review list.

Source coverage: 1,054 original vocabulary-master rows; 49 original lesson pages and 64 topic pages; 119 new-plan lessons; the current authoring document; 1,088 + 4,299 deck notes. The Old outline was used for orientation. Embedded recordings, downloaded exercises and quiz-only question content were not exhaustively audited.

All 6,441 master/deck records are accounted for exactly once. Seventeen additional checks passed, including the three expressions Guy questioned, original-course listening, homographs and false inflection gaps. The earlier shortlist is explicitly superseded in its local report. No independent reviewer participated.

The student-derived exports and source snapshots remain local. This Git checkpoint records the result and locator without copying the supplied deck contents into GitHub.

Local directory:
`C:/Users/Trans/.openmausbot/task-workspaces/71c71389-5334-4e0c-9ca8-d80dd28223d1/653fb433-7485-48b1-9f7c-cb22711bda02/hebleo-3/docs/curriculum/course-gap-audit-20261111/`

Files: `REPORT.md`, `reviewed-gaps.csv`, `reviewed-priorities.csv`, `original-course-omissions.csv`, `all-vocabulary-gaps.csv`, `complete-source-coverage.csv`, `source-issues.csv`, `original-pages-inspected.csv`, `sources.json`, `verification.json`.

Executed after live-source extraction:

```text
python3.12.exe -X utf8 tmp/course-gap-audit-20261111/build_audit.py
python3.12.exe -X utf8 tmp/course-gap-audit-20261111/reconcile_original_tables.py
python3.12.exe -X utf8 tmp/course-gap-audit-20261111/finalize_audit.py
python3.12.exe -X utf8 tmp/course-gap-audit-20261111/write_report.py
```

The next curriculum decision belongs to Guy: select which reviewed items to retain or add. Provisional appendix scores require further semantic review before being treated as confirmed findings. No implementation or lesson-placement work was assigned.
