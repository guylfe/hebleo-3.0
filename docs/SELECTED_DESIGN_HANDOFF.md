# Selected actual-app candidate for finished-source UX critique

Selected-design baseline **ac0df0e63510637bc47f254ea1b6b144b15391b4**; navy-integration parent **48783b06daa5a78cf9444376fbd2391d82ce01aa**, private branch **lead/oct13-selected-design**. Final navy-integrated application HEAD is recorded in selected-design-evidence/FREEZE.json. Candidate checkout: **C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\23dc494f-f6a7-47cc-9218-7984b1625748\hebleo-selected-design**. Documentation HEAD and file hashes are recorded in the task's selected-design-evidence/FREEZE.json after the documentation commit. Implementation is not merged to main or deployed.

## Baseline, ownership and preservation

Baseline **09c3b846aa1f61f1d9692924a7bb3b7243c81aa0**, clean current owned candidate-oct12-navigation at the start. New exclusive clone/branch isolates this work from active runtime/other checkout edits. Executable LF/CRLF-normalized app.js, learner-view.js, refinement.css and media.js match the working95bd766 UI. / serves the app document; /index.html returns404, retained and corrected in BASELINE.json rather than counted as successful verification. The older Chief e73 checkout was not used/restored. Lead integrated all changes; Feature Engineer receipt8ca5d14d failed to write and produced no patch/tests, so it is not independent implementation evidence.

Learner/source/data/schema/curriculum/grader/scheduler/publishing and WordPress contracts are unchanged. The bounded logo addition adds only one static PNG whitelist entry and its binary MIME type to src/server.js. Existing notes/anonymous projection/permissions/revision pins and deliberate publishing remain. Masterfile-ID importer remains separate/unactivated; no live Sheet acquisition/import/teaching readiness claim.

## Final logo and captures

**ORIGINAL NAVY WIDE LOGO INTEGRATED.** Candidate public/assets/hebleo-wide-navy.png is byte-identical to supplied d172fe3c-13f0-4919-bd7f-1eba631b61bc.png:137630 bytes,3693x1198 RGBA,SHA256 D744D37A3A10F315D58372B3A8F557B2913C04F6D6065C4F15AE26FC10789971. App and Google setup home links use160px width/auto height, intrinsic3693x1198 dimensions and contain geometry. Empty image alt plus labelled home link avoids duplicate speech. Placeholder border/text removed; no recoloring/crop/stretch/reconstruction. The single approved URL /assets/hebleo-wide-navy.png serves exact PNG bytes as image/png; arbitrary adjacent assets remain unavailable. Rendered logo/header legibility remains open.

Cyan provenance in the UX Owner's reference handoff is superseded; its E9906853... hash is not the candidate logo hash. The frozen49F67415... prototype is comparison evidence only; its fixtures/disabled routes/profiles/media/grading were not installed.

**No current candidate screenshots/captures exist.** No browser/native/headless/substitute route was used. Source/cascade/DOM/HTTP results do not certify pixels, logo legibility, true drawer/header/dock geometry,200% zoom, physical/touch or Guy acceptance. Browser person-control pause remains; mobile/physical acceptance is deferred to the APK decision. Audio-speed is DEFERRED in every phase.

## Actual changed files

Application commit files: .github/workflows/checks.yml; DESIGN.md; UX-CONTRACT.md; premium-ui.json; package.json; public/app.js; public/google-setup.html; public/index.html; public/keyboard-owner.js; public/preview/learner-renderer.js; public/refinement.css; scripts/verify-candidate.mjs; test/app.test.js; test/keyboard.test.js. Documentation checkpoint additionally updates docs/FEATURE_CHECKLIST.md and adds this handoff. Existing human-result cells stay untouched.

## Verification actually run

| Command | Actual result/evidence |
|---|---|
| npm ci --ignore-scripts --cache ../npm-cache |49 locked root packages installed;0 vulnerabilities. Initial offline REPL install timed out; owner shell retry succeeds |
| schema npm ci --ignore-scripts --cache ../../npm-cache |5 locked schema packages;0 vulnerabilities |
| node --test test/keyboard.test.js |24/24 source/DOM assertions; keyboard-focused.txt |
| node --test --test-name-pattern='DESIGN13|FB8 outside|FB8 saved-draft Preview|UX2333|OCT12 left' test/app.test.js test/nav2333-persistence.test.js |32/32 actual-app/Store/HTTP assertions at that focused checkpoint; integrated-focused.txt; subset of final suite |
| npm run verify:candidate |487/487 assertions pass, zero failure;45 selected test files, explicit audio filename and audio/speed/playback-name exclusions; candidate-verify-final.txt |
| schema npm test |20/20 schema checks; schema-check.txt |
| node schemas/tools/runtime-check.mjs --runtime . |9/9 disposable loopback HTTP/Store checks; runtime-check-corrected.txt. HEAD reports baseline because source was dirty; backend identical and working hashes captured. Earlier missing-argument/owner errors retained |
| npx --yes -p @google/design.md designmd lint DESIGN.md |0 errors,1 orphaned border warning; actual runtime --line consumes border; design-lint.json |
| python frontend-design-premium/scripts/audit_project.py . --mode strict --output <evidence>/premium-audit.json |Exit1:3 inherited delegated-button false positives, no unresolved owner/contracts; AUDIT_DISPOSITION.md maps actual Move/Select handlers and executable passing cases |
| git diff --check |Pass; tested hashes compared with committed Git blobs before freeze |
| gh repo view guylfe/hebleo-3.0 --json isPrivate,nameWithOwner,url |Confirmed private authorized destination; candidate-only local origin corrected from inherited local clone to private remote |

The initial suite486/487 failure also reproduces exact baseline app source: a test expected Start on every lesson-card button, including real Practice. Corrected selector retains Start/Continue/Revisit and explicitly requires Practice. No home behavior changed. Tests are owner evidence, not QA/Release/UX/Guy acceptance. No new broad suite after a green result; the final run follows the reproduced failure correction. Candidate CI invokes verify:candidate to retain the audio deferral; full verify remains available after explicit reopening.

## Protected demo and next handoff

PROTECTED_AFTER.json verifies63357 app/style/document/media bytes and local static files, SQLite and WAL unchanged. LISTENERS_AFTER.json records63357/PID81072,4173/PID44060,4174/PID103028 unchanged. No candidate service was started; ephemeral HTTP tests close on exit. No restart/reset/profile/data/source/auth configuration update.

Leo should forward this exact application/source candidate and evidence to UX Owner for finished implementation critique and bounded corrections. Evaluate real task flows/layout/states while retaining the source-versus-native limits above. This does not authorize demo activation; that remains after critique/corrections through the existing owner process. One consolidated QA milestone follows integration plus UX corrections. The original navy asset is integrated; the next step is finished-candidate UX critique before demo activation.

## Actual route map

Candidate checkout: C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\23dc494f-f6a7-47cc-9218-7984b1625748\hebleo-selected-design. Baseline09c3b846aa1f61f1d9692924a7bb3b7243c81aa0, matching active95bd766 UI after LF/CRLF normalization; changed source is not deployed.

| Actual route/task | Candidate integration | Retained behavior and limits |
|---|---|---|
| #home | horizontal header, real profile, shared blue tokens | real continue/resume/next, goals/progress/due counts; synthetic content retained |
| #course | one header toggle; separate248px rail | real curriculum/chapter/order/completion/access; stable lesson IDs |
| #lesson/:id/:portion |760px unboxed prose/current question/footer; wide vocabulary/media | actual portion links, revision-pinned state/attempts/progress, rich source text, source Watch first, separate typing/cloze and all six types; in-question Check and lower Continue |
| #lesson inline concept | actual explanation inserted in current practice section | same answer node/selection; no grading/penalty/API writes; Keep open preserved for valid typing; source/DOM checked |
| #library | combined search/Tag/Used-in-lesson/state filters; separate Cards/Table | same50-item paged result set, full fields/forms/formatting, multi-lesson membership, noVocab/noCard eligibility, personal note/profile isolation; actual audio availability unchanged |
| #review | shared skin/header | real session/reveal/rating/undo/schedule and front Nikkud; simple interval scheduler, not FSRS |
| #settings | shared skin/header; app-owned restore confirmation | profile preferences, entitlement fixtures, local backup/restore, goals; actual production identity/SSO/payments absent; audio-speed DEFERRED |
| #studio lesson | actual keyboard-navigable task tabs; title at display position, shared tokens | mounted EasyMDE/content editors, stable IDs, explicit Add/Edit/Reuse, exact local authored alternatives, shared impact, source/CAS/dirty guards; Preview remains disposable |
| #studio vocabulary | task styling/independent table overflow | full canonical fields/form JSON, source rules, review policy and membership retained |
| #studio sources/import | shared tokens | actual local import/source coordinator/staging/recovery; live capture/mapping/teaching approval not established; Masterfile-ID importer remains separate/unactivated |
| #studio media | shared tokens | real local asset/reference library, immutable pins and availability, no nominal video installed |
| #studio comments/replies and reports | compact stacked composer, collapsed88px reply | real post/save/reject/pending/anonymous/Keep/soft Remove; reports retain real attempts/revisions |
| #studio changes/history | shared tokens and tab | actual draft impact/Publish/history/rollback and learner preservation; no production/WordPress writes |
| saved-draft Preview dialog | shared learner styling; shared keyboard lifecycle integrated by Lead | actual server evaluator and no learner persistence; inline concept/caret behavior source/DOM checked |
| /google-setup | selected tokens + same original navy-wide home logo | actual authorization/config/status flow retained; source registration separate; credentials/secrets untouched |

Final logo: original NAVY WIDE integrated unchanged at public/assets/hebleo-wide-navy.png;137630 bytes,3693x1198,SHA256 D744D37A3A10F315D58372B3A8F557B2913C04F6D6065C4F15AE26FC10789971.160px/auto-ratio accessible home logo, no placeholder/substitute.

No route or existing content object was removed. Only the PNG static whitelist/MIME delivery is added server-side; data models, fixtures, scheduler, source integration and publishing contracts are unchanged. Automated evidence does not certify rendered wrapping/logo size, true keyboard dock visibility,200% zoom, native interaction or Guy acceptance. No current candidate captures exist. Browser/person-control pause respected; mobile/physical acceptance deferred to APK; audio-speed DEFERRED.


### Exact private CI race correction

First candidate CI run38422226591 at080fcac finished486/487, failing the inherited OCT12 direct-practice test. Its wait predicate observed saved practiceIds plus the general Finish portion tab before the asynchronous extra-practice render added the actual Skip extra practice control. The correction waits for that real control, then retains the same IDs/revision/attempt/completion assertions. No application/source/data behavior changed. The narrow actual-HTTP case is rechecked locally; the final exact-HEAD CI result is in the task's FREEZE.json. This failure and correction are retained; first CI was not reported as a pass.


### Original navy logo integration — 2026-10-13

Parent48783b06daa5a78cf9444376fbd2391d82ce01aa. Supplied original d172fe3c PNG replaces the pending slot in both actual application and Google setup. Destination public/assets/hebleo-wide-navy.png is byte-identical (137630 bytes,3693x1198,SHA256 D744D37A3A10F315D58372B3A8F557B2913C04F6D6065C4F15AE26FC10789971); source colors/transparency preserved,160px width/auto height with intrinsic attributes. The existing static server whitelist now explicitly serves only this PNG with image/png. Existing header source/DOM checks pass5 assertions across1400/960/700/480; the focused disposable HTTP test passes1 case proving status200/exact bytes/hash/MIME and adjacent404. Node syntax and git diff --check pass. No repeat manual broad suite, new audit/reviewer/QA dispatch or persistent service action. Prior487/487 CI,20 schema and9 HTTP integration results retain their scopes; current logo delta evidence is separate. No browser/native/headless/captures, demo reset/update or production/WordPress writes. Native rendered critique and existing mobile/audio deferrals remain.

## UXI13 correction successor

The finished source critique at5150f950 identified five workflow defects. The bounded successor is documented in UXI13_CORRECTIONS.md with exact final SHA/results in the sibling uxi13-correction-evidence/FREEZE.json. Navy logo/design/routes remain unchanged. Owner checks support implementation closure; UX Owner source recheck and consolidated QA remain separate pending steps before demo activation.
