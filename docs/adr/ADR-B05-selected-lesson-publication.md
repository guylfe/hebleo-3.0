# ADR B05: Publish a saved lesson and rebase the complete draft atomically

Date: 2026-11-01. Status: adopted for the local backend milestone; production release is not approved by this decision.

The author works in one saved workspace containing 23 lessons, including 20 inactive legacy additions. Publishing that entire workspace from a button named Publish lesson would broaden the confirmed scope. Temporarily staging a release subset would replace the author's saved authority and make failure recovery dependent on a second save.

Build a candidate from active content, one exact saved existing lesson, and explicit referenced word/exercise changes. Review a deterministic digest with all mutable eligibility pins. Recompute the same scope and validations inside the existing synchronous SQLite transaction, then persist media, append the revision, advance active and replace only the saved draft's base revision token. Preserve its content and save timestamp exactly. Keep source-bound bundles on their existing approval path.

This retains the existing versioned snapshots, stable IDs, single workspace owner and reader-10 recovery format. Historical private contexts retain their original pins. The client receives a coherent post-commit workspace; its baseline is the complete remaining draft. A stale retry conflicts instead of duplicating publication. No new durable receipt table is needed.

The bounded path supports existing published lessons and explicit reusable dependencies. It blocks required pack/curriculum/source changes, deletions, reorders and unselected lesson-index repairs. These limits are deliberate and visible. Further scope should be introduced as explicit reviewed operations, never implicit inclusion.

Implementation and adoption contract: [selected lesson publication](../architecture/selected-lesson-publication.md). Executable evidence: `test/lesson-publication.test.js`, disposable-copy scripts, and the [delivery record](../evidence/selected-publication-20261101/DELIVERY.md).
