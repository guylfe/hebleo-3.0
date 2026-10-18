# Lexical contract verification receipt

2026-10-18, Architect. Base `d4bcadd3bc522828b06c48789213200305f8fd48`; isolated branch `architect/oct18-lexical-contract`. Exact delivery SHA is returned in the teammate handoff; this receipt is committed with that implementation.

Repository: `C:/Users/Trans/.openmausbot/task-workspaces/71c71389-5334-4e0c-9ca8-d80dd28223d1/653fb433-7485-48b1-9f7c-cb22711bda02/hebleo-3/architect-lexical-20261018`.

The original shared checkout was at `e73e72f` with unrelated changes. It was preserved. The new clone was made from Lead's assigned candidate with `git clone --no-hardlinks`. Windows initially refused one long evidence filename; `git config core.longpaths true` followed by `git restore --source=HEAD --staged --worktree -- .` completed only the fresh clone, then `git switch -c architect/oct18-lexical-contract d4bcadd` pinned the correct base. No Lead/Feature implementation file was edited.

Node `v24.19.0`, npm `11.17.0`.

| Actually executed | Result |
| --- | --- |
| `npm.cmd ci --ignore-scripts --no-audit --no-fund --offline` | Pass; 49 root dependencies installed from cache, no lockfile change |
| Direct JSON comparison of module IDs with supplied `VOCABULARY_STRUCTURE_SCHEMA.json` | All 42 IDs exactly equal in order; source SHA256 retained in `schemas/lexical-slots.v1.json` |
| `node --test test/lexical-contract.test.js` | 22/22 pass |
| `node --check public/lexical-contract.js` | Pass |
| `npm.cmd run verify` | Syntax passed; unrestricted tests 588/592 passed. Two audio failures and two test-file load failures because nested Ajv was not installed yet |
| `npm.cmd --prefix schemas ci --ignore-scripts --no-audit --no-fund --offline` | Pass; five schema dependencies installed from cache, no lockfile change |
| `npm.cmd --prefix schemas test` | 22/23 pass; one failure in the unchanged approval-digest test described below |
| `node --test schemas/checks/lexical-contract.check.mjs` | 3/3 pass; strict Ajv compilation, exact slot enum, valid fixture, malformed version/slot and structure-versus-semantics checks |
| `npm.cmd run verify:candidate` | Pass: repository syntax checks and 598/598 candidate tests; existing script excludes audio filenames and audio/speed/playback names |
| `git diff d4bcadd --name-only -- src public/media.js test/oct12-audio-layout.test.js schemas/tools/contracts.mjs schemas/checks/contracts.check.mjs` | Empty; these runtime/failing-suite files match the assigned base |
| `git diff --check` | Pass |
| `gh repo view guylfe/hebleo-3.0 --json nameWithOwner,isPrivate` | First sandbox network attempt refused; approved network retry confirmed `isPrivate:true` |

The unrestricted audio failures were `OCT12 speed changes preserve the active player position and pause state` (`media.addEventListener is not a function`, test line 12) and `OCT12 shared and native audio controls show the saved speed without replacing source data` (`1 !== 3`, test line 16). Audio work is already deferred in the candidate verification script; no audio fixes or repeated audio run were performed. The two missing-Ajv file loads were `feedback14-refinements.test.js` and `ux14-result-regressions.test.js`; after schema dependencies were installed, the candidate verification passed them.

The schema-suite failure is `changed content or dependency invalidates approval digests`, `schemas/checks/contracts.check.mjs:76`, `false !== true`. The associated test and implementation were not modified by this branch and do not import the new lexical module. This is reported for Lead, not hidden behind the successful candidate check. No full-suite-green claim is made.

Focused behavioral evidence covers exact inventory, course-order accumulation/reordering, course isolation, word/reviewed-class scopes, no source-only unlock, introduce/reuse/legacy distinctions, independent citations, missing representations and no substitution, pending generated text exclusion, revision review consistency, seven/full-ten prepositions, partial adjectives, staged verb tenses, live title renames and unconnected handling, UTF-16 preservation, alias namespaces, separate Usage/Example references, exact field/audio/flag conflict handling, compatibility and non-mutating schedule collision preview.

No workbook adapter, real source import, source approval, rendered-browser inspection, runtime persistence wiring, native layout acceptance, progress migration, demo activation or production action occurred. Type declarations document the API; no TypeScript compiler is installed in this project and no TypeScript compilation is claimed. Raw logs are local ignored files; no learner records, source workbook contents, databases, uploads or credentials are committed.
