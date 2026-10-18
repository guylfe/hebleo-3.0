# Private consolidated vocabulary demo

From this candidate's directory, with Node 24+:

```powershell
npm ci --ignore-scripts
npm ci --ignore-scripts --prefix schemas
New-Item -ItemType Directory -Force tmp
node scripts/capture-lexical-workbook.mjs '<supplied UX workspace root>' tmp/workbook-capture.json
node scripts/verify-lexical-workbook.mjs tmp/workbook-capture.json
node scripts/probe-lexical-http.mjs tmp/workbook-capture.json
node scripts/start-lexical-demo.mjs --capture tmp/workbook-capture.json --port 63358
```

Capture refuses to overwrite an existing file. The final handoff identifies the already-created private capture, database, running preview and exact code revision. No credentials are required.

Open `http://127.0.0.1:63358/#lesson/lesson-2/vocabulary`. Three nonlinguistic fixtures demonstrate 3/7/10 preposition forms across Lessons 1/2/3, partial adjectives and progressively expanded verb tenses. Their text explicitly says SYNTHETIC and is not teaching content. Citation headings stay independent of expanded slots.

Select **Author**, then **Studio**. The saved draft contains the 792 pending workbook words plus three synthetic fixtures. Conjugation settings sit alongside the existing letter settings. Choose category, all/word/reviewed-class scope and additions. Save, reload the saved draft, then Preview. Publish remains separate and is unnecessary for review. Blank class lists reflect the absence of reviewed classes; Root/Pattern text does not create one.

The same section accepts the versioned capture JSON: Validate → review counts → Add to workspace → Save. Replacing an existing model is refused until reconciled. Raw legacy associations and form presence never become unlocks. Pending workbook words remain outside learner tables until their actual source/identity/display approvals exist.

Only this isolated checkout uses `data/lexical-private-demo.sqlite`. Initialization occurs once, preserves subsequent edits, and refuses a different capture without reconciliation. The existing once-per-executable-build reset applies only to these fictional profiles; same-build restarts preserve state. Existing port 63357, other checkouts, their databases/uploads/credentials and production remain untouched.

Native layout review remains blocked by the mounted browser's existing-profile consent refusal. See [integration and migration details](architecture/LEXICAL_INTEGRATION_V1.md).
