# E10 explicit occurrences across six exercise families

Integrated candidate, 2026-10-22. Independent QA/Release/UX and installation pending.
Current owner demo remains on previously delivered 15d0103 until those checks pass.

The optional ADR B04 contract adds exact human-authored text occurrences to existing
exercise revisions. Studio selects actual surfaces and whole text ranges, searches
existing vocabulary IDs, and supports Link, inspect, Rebind and Remove. Save/CAS,
saved rehearsal and publication retain their existing owners. A changed source or
removed row must be explicitly repaired. No dictionary lookup creates identity.

All six families support prompt/context/feedback links. Ordering adds original token
rows, projected into prepared tray indices without spelling matching. Typing,
ordering, cloze and transformation add authored accepted-answer occurrences withheld
until grading. Both grading outcomes show separate authored-answer reminders; raw
learner text and assembled submissions stay unchanged. Existing direct-ID cards and
unbound content retain their prior behavior. Locked managed entries cannot fall back
to flat entries. Opening cards does not create attempts, progress, approval or enrollment.

Backend/shared contract: Architect source commit 2b582678549d7c0a1a43d32fd98d129ddec209d0,
integrated as eba3c49. Studio: Feature Engineer source 7f2f1d59acb956808d4a637f0e792490b72864f6,
integrated as 57966d6. Lead owns shared learner/rehearsal markers, decoration, public
routes and real HTTP integration. No seed, canonical source, Masterfile or owner data edits.

## Executed candidate checks

- `npm ci --ignore-scripts` and corresponding schemas install: pass.
- `npm run verify:candidate`: syntax and 760/760 tests pass. Existing audio filename
  and audio/speed/playback-name exclusions remain explicit in the runner.
- `npm test --prefix schemas`: 27/27; contracts.check.mjs: 18/18;
  `node schemas/tools/validate.mjs --seed --runtime .`: accepted, input unchanged;
  `node schemas/tools/runtime-check.mjs --runtime .`: nine scenarios pass.
- `test/answered-bindings.test.js`: ten tests, including all-six-family correct/incorrect
  decoration, exact Unicode/CRLF, denied and stale references, repeated token and
  authored-answer identities, plus six real saved-draft controller scenarios with no writes.
- `test/app.test.js` E10 bound cases: six real HTTP app scenarios for correct/incorrect
  ordering/cloze/transformation, in-place grading, restored cards, raw submissions,
  no nested buttons, focus return and no card-view writes.
- Studio contract/persistence/retention coverage is in the existing focused tests and
  `test/studio-exercise-bindings.test.js`. The two older blanket enabled-control assertions
  now compare actual pre-save disabled states, retaining invalid-link and paging guards.
- Strict premium audit executed: three existing findings in unchanged lesson-editor.js
  and media-picker.js, none in changed files. `git diff --check`: pass.

Synthetic occurrence fixtures live only in the test helper
`scripts/exercise-bindings-fixture.mjs`; startup never loads it. All test stores are
in-memory or disposable; servers use ephemeral loopback ports. This does not approve
any new vocabulary or linguistic mapping for real lessons.

## Open evidence

Independent reports and exact final revision/build/state receipts will be recorded
by the Lead delivery handoff after review. Browser profile consent remains a separate
blocker; no substitute browser or foreground route is authorized. Native pointer/keyboard
defaults, RTL/Nikkud layout, viewport geometry, screen reader, zoom, touch and Guy
acceptance remain pending. Automated geometry stubs establish lifecycle behavior only.

The current array model cannot distinguish an external swap of byte-identical rows;
Studio explicitly guards row removals and requires repair. Occurrence IDs, field/index,
whole-source snapshots and exact spans prevent automatic relocation. See ADR B04.
