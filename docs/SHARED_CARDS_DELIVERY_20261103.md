# Shared cards app integration candidate — 3 November 2026

Repository: C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\d93ac18d-de54-4035-ad88-9628a2b2e5df\hebleo-shared-cards
Branch: feature/shared-cards-20261102. Starting code: 40864ec3cad885b5d550eb9c9cda9c0addc6bd6d.
Candidate implementation only. No installed original checkout, demo63358, WordPress, production data, lessons or curriculum was changed. Lead owns independent review, main, push, preservation rehearsal and installation.

## Implemented interface
- Exact approved nine-field raw vocabulary and note metadata live in kv/shared-cards, namespace version 1, separately from lesson words/revisions/drafts. The schema is {version:1, raw:<whole vocabulary.json>, manifest:<whole media-manifest.json>, revision:<SHA256 of JSON.stringify({raw,manifest})>, overlays:[]}.
- Independent approved raw-object digest: 12b3f62e02e09c7f143d502c7559ba5eed4788f5ebe6dae86ba0aba84b2a8dd2. Approved manifest-object digest: 64aea4e805f7d4c949fb8b431775e20f82237d69a7e3c9b1e13afec29f1cdf77. These are computed independently of the package's self-declared APKG label. Altered raw content or arbitrary runtime HTML is refused.
- APKG source SHA256: 597c2fb3c78591a0c377216ab6668b5408a48a3f5f0a66b57fbb225122dd4e2a. Counts:1025 raw notes /2050 available logical directions /1329 media objects. No mass enrollment.
- Stable internal IDs: sc-<SourceId>-he-en / sc-<SourceId>-en-he (example sc-mf-000001-he-en). These never use media hash, mutable labels or lesson word IDs.
- Existing learner.cards, scheduler, review receipt/expected-card conflict, undo and purchased-course access are reused. Membership cancellation retains course-purchase access. No scheduler replacement or platform synchronization.
- GET /api/shared-cards?search=<text>&offset=<offset>: escaped plain collection projection, 25 entries/page, explicit independent direction enrollment. My Hebrew → Shared vocabulary is reachable with existing navigation/buttons.
- POST /api/enroll {wordId:<stable shared ID>} uses existing enrollment. POST /api/review and /api/review/undo retain their existing contracts. Nothing publishes lessons or writes lesson vocab.
- POST /api/shared-cards/ticket {cardId,face:'front'|'back'}: requires known local-demo user and purchased-course access; returns {url:'/shared-card/<unguessable ticket>'}. Tickets expire after one hour, with bounded in-memory retention, and are reauthorized against current entitlement on document/media requests.
- GET /shared-card/<ticket>: generates one complete document on demand from the fixed approved template/CSS. No generated documents enter bootstrap, namespace or ordinary backup.
- GET/HEAD /shared-media/<ticket>/<original basename>: hash-verified immutable SQLite bytes, MP3/PNG type and byte ranges; no filesystem path interpolation. Invalid/expired tickets, unknown paths and unsatisfiable ranges reject. This remains the existing fictional local demo identity model, not production login.
- POST /api/shared-cards/settings {mode:'light'|'dark',nikkud:boolean}: exact typed keys only. Persisted in that learner's sharedCardSettings, carried to each face and reload.
- Browser host helper public/shared-cards.js mounts a regular src resource with sandbox='allow-scripts' only. Source-window validation and exact finite height/settings payloads; height clamps120–2400px. Saves settings serially and flushes before shared answer reveal/rating. Disposal removes listeners and clears frame source.
- Parent script-src and style-src remain self-only. Card resource has its own hash-authorized fixed script CSP, trusted inline CSS only inside the isolated document, fixed media origin and frame-ancestors self. No allow-same-origin. Every field is HTML-parsed/allowlisted; field JS, handlers, styles, external resources/navigation and media traversal are blocked.
- GET /api/studio/shared-cards/slots?sourceId=<id>: author-only exact current source/form slot descriptors.
- POST /api/studio/shared-cards/audio {sourceId,formKey,formValue,blob:{sha256,mimeType:'audio/mpeg',dataBase64},expectedSHA256:null|<current overlay hash>}: author-only byte/type validation and CAS. Source/form identity must exactly match the approved supplied slot. formKey is Audio:<zero-based original sound-marker index> or Forms:<zero-based original form-replay-button index>. formValue is exact supplied pointed form text (or base HebrewNikkud/Hebrew). These indices are anchored to the pinned source package and always paired with exact formValue. An upgraded source package requires a separately reviewed digest/mapping change.
- Overlays are {sourceId,formKey,formValue,file:'overlay-<sha256>.mp3',sha256}. Raw fields, original recordings, logical IDs and schedules remain unchanged. No new form slots or generated missing content/audio.

## Operator import and candidate startup
First npm ci --ignore-scripts in the app and npm ci --ignore-scripts --prefix schemas for the separately locked schema tooling.
With the candidate server stopped:
    node scripts/import-shared-cards.mjs SOURCE_DIRECTORY data/shared-candidate.db
SOURCE_DIRECTORY is the approved portable package, containing vocabulary.json, media-manifest.json and media/. The template/CSS is bundled approved code; external executable HTML/templates are not imported. The operator command checks original basenames, regular files, exact sizes and SHA256 of every object before transactional import. Repeat import preserves overlays and all learner schedules; it requires the current source revision. Source revision for this package: dd55611857dcbcb3b1249008570c0258b88d8ebfbac04817216aae53e48b1837.
Then:
    node scripts/start-shared-candidate.mjs
This opens only http://127.0.0.1:63592 on data/shared-candidate.db. It does not copy another thread's database and does not call the demo progress reset. The initial candidate is fresh synthetic lesson data plus the separate approved vocabulary namespace. The starter records bounded MP3 request metadata (filename/status/range only, no ticket) in ignored tmp/shared-browser-media.jsonl for developer playback evidence. Stop with Ctrl+C.
Existing npm start retains the project's explicit once-per-build fictional-progress reset rule; any later installed use requires Lead's complete preservation backup and verification first.

## Reader and backup consequence
Store marker is now11. Older executables reject it, including when namespace is empty; they must never be pointed at this database.
Backup-v2 reader11 requires an explicit sharedCards value (null when absent). Raw notes/metadata/manifest, overlays, all immutable media bytes, shared settings, schedules, receipts and undo state roundtrip in existing backup/media recovery. Missing/corrupt/unsupported contracts reject before writes. Restoring an older or empty namespace over an existing shared namespace is refused, rather than silently dropping it. Historical supported readers2–10 can still restore into an empty namespace. Existing author review reader10/namespace2 semantics remain valid within reader11.
Existing media recovery50MB and whole-backup200MB bounds are retained. Original shared objects total14,462,012 bytes. Generated runtime docs and private source/media files are excluded from Git. No87MB duplicated runtime artifact is required here.
Current migration test expectations were updated only for the new current-reader marker; historical version fixtures remain historical.

## Verification actually run
- App npm ci --ignore-scripts --no-audit --no-fund:77 packages installed successfully under this task's permissions. Lead's earlier failed install was not treated as success.
- npm ci --ignore-scripts --no-audit --no-fund in schemas/:5 locked packages installed.
- Full original package operator import into data/shared-candidate.db passed:1025/2050/1329, original files/bytes/hash checked and exact raw digest pinned.
- npm run check passed after integration; final repetition is recorded below.
- Focused command with HEBLEO_SHARED_SOURCE set to the original package:
  node --test test/shared-cards.test.js test/shared-card-frame.test.js test/shared-card-renderer.test.js
  Result9/9 pass. Covers every original raw note and form layout/text/teaching-class/disclosure/infinitive/grid/group/replay count; both directions/all faces; malicious fields/settings/media traversal; full import/reimport; stable independent rating/retry/conflict/undo/access; exact base/form overlays including reimport and backup; actual SQLite reopen/backup/draft/settings preservation; real card response headers/ranges/invalid tickets; exact-frame bridge validation; real fixed script replay/end/error/disposal/rerender and settings messages.
- node --test test/app.test.js after final enrollment-search preservation fix:127/127 pass.
- npm test was run twice. Latest full-discovery result:1183 tests,1165 pass,18 fail. Seventeen failures also reproduce when explicitly supplying unchanged HEAD public/app.js to those older QA harnesses:8 feedback recovery,3 independent reminder cases,4 learner feedback transit,2 deferred OCT12 audio-speed tests. The eighteenth is a frozen installed-build QA gate hardcoded to revision444b9177 and port63360, not this candidate. These failures are reported, not changed or called passing. Baseline-app runs do not claim a separate full baseline checkout.
- Existing npm run test:candidate excludes filenames/names for deferred audio/speed/playback by its existing repository policy. Earlier complete checkpoint1099/1099 pass. Final repetition including the last two renderer checks is recorded below; focused9/9 includes the shared replay/error lifecycle regardless of that broader exclusion.
- Generic frontend Python audit unavailable: python is absent and py points to a missing Windows Store executable; no generic audit compliance claim.

## Mounted Browser evidence under real app headers
Actual Browser at63592; no own-screen/foreground fallback:
1. My Hebrew shared collection rendered all1025 entries with search/pagination and explicit enrollment. Two directions of mf-000001 enrolled separately. Later mf-000721 directions enrolled explicitly; filtered one-entry result/search remained after enrollment.
2. Both directions traversed the actual Review session and answer reveal. Good changed only that direction's schedule; Undo restored it; reload retained schedules and settings. No incidental lesson/card mass enrollment.
3. Sandboxed regular-resource card styled and ran under actual app parent headers. Native Browser keyboard toggled theme/Nikkud; server bootstrap independently read back dark/true. Answer/reload retained both.
4. Keyboard replay inside the opaque sandbox produced a real206 MP3 range response for original14ed89409750e41c60e81569bd5fea6c9284c10fbc4ce1eb63b7f09717a3d7ba.mp3, range bytes=0-. No human pronunciation or audibility judgment.
5. Real sandbox verb mf-000721 opened Past and Present simultaneously by keyboard while Future/Imperative/Gerund remained closed. Resize bridge followed expanded content. Desktop and390px child-frame render inspected;390px is browser width simulation, not native phone evidence.
6. Screenshots/local request trace are retained only under ignored tmp; no private vocabulary/media/screenshots committed.

## Remaining gates and scope
No installed demo changes, WordPress work, push/main integration, learner-data transfer or actual23-lesson preservation rehearsal. Lead has not supplied a guarded original snapshot for that rehearsal. Native phone, physical-device listening/pronunciation, independent QA/release review and Guy acceptance remain open.
No97 new phrase recordings were imported, copied or bound. Original word/form recordings remain. New phrase holdings and noun-only links do not authorize replacing a base/form slot; later exact approved phrase mapping is separate.
Lead reviews actual code and owns guarded integration/install/main/push. Leo-Web consumes its own WordPress adapter; this app change makes no WordPress success claim.
Final exact implementation verification: npm run check PASS; configured bounded suite1101/1101 PASS in72.85s, including final renderer checks. Focused9/9 and final app UI127/127 also PASS. Candidate source committed separately from all private package/media/database/runtime files.
Final supporting correction: src/demo-build.js now fingerprints executable .mjs modules and the exact bundled approved-templates.json, while ignoring unrelated JSON. This prevents a later renderer/template-only update from bypassing the authorized startup fresh-progress rule. node --test test/demo-build.test.js passes6/6; node --check src/demo-build.js passes. No running server rechecks or resets progress.
