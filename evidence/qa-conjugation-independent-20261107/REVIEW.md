# Independent QA: bounded pass

Candidate: `d57125620f98f0b18630975d1e970d1e11ebaa95`. Isolated clone/branch `qa/conjugation-independent-20261107`; no implementation edits, installation, production writes, or access to port 63358. All browser writes were to the explicitly disposable in-memory fixture at 63491. Synthetic content is test evidence only.

## Executed

`npm ci`: succeeded, zero runtime dependency vulnerabilities (`qa-install.log`, local ignored).

`node --test test/conjugation-engine.test.js test/conjugation-view.test.js test/conjugation-native.test.js test/conjugation-integration.test.js adapters/wordpress/conjugation/package.test.mjs`: **38 passed, zero failures/skips**. Raw output: focused.txt. Read the actual tests and implementation. These exercise both platforms/directions, Choose/Write, typed blur preserving the first Show/Check button, Nikkud/mode drafts, typed-only override, end-of-pass/repeated misses, filters/empty selection, ambiguity distractors, HTTP Studio partial save/reload/publication, pinned-lesson completion and learner isolation, CAS/atomic failures, legacy state and access gates. Preservation assertions compare actual in-memory database tables/content/card state; this does not certify an installed database.

`node qa-tests/conjugation-independent-20261107.mjs`: **200 randomized rounds passed**, seven forms each, both directions, every initial form once, corrected item excluded, two subsequent missed passes then completion. Reproducible probe is committed; randomized.json is its actual output.

`node qa-tests/verify-conjugation-provenance.mjs`: **12 input hashes and 302 represented cells verified**; 509 held units, 308 separate external proposals, **zero approved grading forms**. Raw output: provenance.txt.

## Mounted Browser observations

Native Studio at 63491: selected only `fixture-study-i` plus the whole currently available `fixture-my` group (two forms); clicked Save, then Reload saved draft. Accessibility readback retained study-I checked, study-we and study-he unchecked, my/our checked, with-me unchecked. Independent GET /api/studio with fictional author identity returned exactly `[fixture-study-i, fixture-my, fixture-our]` for lesson-1; sanitized readback: studio-readback.json. Painted evidence: studio-partial-reloaded.png and studio-prepositions-reloaded.png. No publication or completion was performed through the mounted Browser.

Native actual 360px application iframe: native-360-verbs.png and native-360-prepositions.png show two and three equal visual columns respectively, with Hebrew wrapping inside cells. WordPress shared-view fixture at 33608, 360px iframe: wordpress-360-verbs.png and wordpress-360-prepositions.png show the same contracted column counts. These are painted screenshots, not a numerical DOM geometry measurement or physical Android acceptance. The mounted WordPress page is not an installed WordPress runtime.

Native desktop: typed `QA mismatch native`, then a first pointer click on Show answer immediately revealed the answer and explicit self-check controls. Started reverse English direction with Choose default, switched Write, typed `QA reverse draft`; the first Check click produced missed-form feedback and Mark as correct. Clicking that changed feedback to Correct (native-typed-override.png). These actions were observed in the actual mounted application, separately from JSDOM evidence.

Browser bounds: subsequent attempts encountered stale refs and an active page unexpectedly returning to native home between calls, including after opening a separately labeled QA tab. No cause or application defect is established by that observation. CSS selectors on the outer wrapper do not select inside its iframe. A Change selection click at an existing scroll position was refused as covered by the sticky menu; explicitly scrolling up made it work. No foreground or alternate automation was used. Further manual WordPress draft/blur checks were not established; the executable tests above cover those paths. Screenshots and successful native observations remain valid evidence of their observed states.

## Verdict and handoff

No reproducible in-scope implementation defect found in the executed checks. Engineering receives a bounded pass; learner release remains blocked by the genuine zero-form content gate. No synthetic answer key was promoted. Full candidate suite, CI, physical Android, destination installation/access-policy binding, and Guy acceptance were not independently rerun/established here. Lead owns the shared FEATURE_CHECKLIST and should append this independent evidence to CP rows without changing user-result cells. Next owner: Lead integrates this QA receipt; Leo/Guy/Curriculum resolve the exact approved grading subset before installation.

Initial clone checkout hit Windows path length; the isolated clone was recovered with repository-local core.longpaths=true and reset to its own HEAD before branching. No other checkout was reset.
`served-hashes.json`: independently fetched native app.js, shared view/engine/CSS and Studio unlock module; all five SHA-256 values match the isolated candidate files.
