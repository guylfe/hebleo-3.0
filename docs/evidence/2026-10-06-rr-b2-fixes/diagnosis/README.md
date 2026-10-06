# Diagnosis of the 07:19 `npm.cmd run verify` EXIT=1 (owner evidence, 2026-10-06)

Tested tree for every file here: staged index b5ec983335f88fd1900a323825cd636b97fcfd3a (src dcab6b5e…, test 7e858ab7…), HEAD 76c2889 plus the staged RR-B2 fixes. Node v24.19.0, npm 11.17.0, os.availableParallelism() = 24.

- `../verify-FAILED-0719.txt`: the original run, kept unchanged. 67 tests, 59 pass, 8 failures. Every failure is a whole file (`test at test\<file>:1:1`, `'test failed'`) with no subtests, no TAP and no stderr: preview, publication-diff, refinement, restore-integrity, server, store, studio-authoring, ux. These are the last 8 of the 16 test files alphabetically. With 24-way parallelism all 16 children start together; the 8 failures report durations falling from 148 ms to 36 ms in spawn order, so they ended at one instant shortly after starting.
- `isolated-<file>.txt`: each of those 8 files run alone on the same tree. All EXIT=0, 70 tests, 0 failures.
- `verify-rerun-1.txt`, `verify-rerun-2.txt`: full `npm.cmd run verify` twice on the same tree. 129/129, EXIT=0 each.
- `test-serial.txt`: `node --test --test-concurrency=1`. 129/129, EXIT=0.

Conclusion: not a code regression or a test-discovery problem. The 8 child processes were terminated externally before writing any output. That run coincides with the unexplained stop of the owner's model run, and the cause is still unknown. The failing log is evidence of that interruption, not a test result for this tree.

- `baseline-76c2889.txt`: `git archive 76c2889` with the new test files and probe-only exports added (old top-level-only `demoBuildFiles`; an unenforced `RESTORABLE_SCHEMA_VERSIONS`). 9 tests: the 6 new coverage/rejection tests fail and the valid v2 round-trip passes, so the new tests detect RR-B2-01/02/03 on the unfixed code.
