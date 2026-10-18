# ADR B03: lexical identity, form inventory and scoped additions

Date: 2026-10-18. Status: implemented as isolated local contracts; runtime integration pending.
Baseline: `d4bcadd3bc522828b06c48789213200305f8fd48`.

Guy's 2026-10-18 implementation request and the UX handoff require one lexical row with many source/form aliases and lesson occurrences. The source workbook remains a structural review draft. Neither its complete paradigm columns nor approval to implement the interface approves its proposed Hebrew or grouping decisions.

## Decision and reasons

1. Introduce an additive `hebleo-lexical-runtime-v1` envelope, preserving the source schema's exact 42 IDs, including Hebrew and spaces. A typed declaration, JSON schema and pure browser/server module describe the same model. No normalization map is needed. Existing flat words remain usable through their existing contract until an explicitly reviewed identity mapping is integrated.
2. Keep lexical word, source record, slot, variant, Usage, Example and lesson-occurrence IDs distinct. Alias resolution requires a kind and source namespace; matching text cannot merge words. Keep pending cross-category facets outside active word collections and retain other categories.
3. Require separate revision-bound reviews for lexical identity, form content, form-to-slot mapping, introduce/reuse links, class identity/membership and unlock additions. This implements the human-authority requirement without promoting the workbook's draft statuses. Reviews are server-owned metadata, not signatures. Lead must bind revisions to immutable payloads and enforce the existing authenticated approval/publication boundary.
4. Evaluate additions only against an explicit authoritative `(courseId, lessonId)` sequence supplied by Lead. A blank checkbox records no addition. It does not revoke inherited eligibility. Reuse and legacy links cannot introduce a word. Class eligibility needs reviewed class identity and membership; Root/Pattern text has no authority.
5. Render the verb's approved past-he/present-masculine-singular citation slots independently of conjugation additions, after the word is available. Preserve both positions and the hyphen. Never substitute other forms, copy representations, generate Hebrew or choose an arbitrary supplied variant.
6. Preserve source fields and exact UTF-16 formatting on the author boundary. Equal values may be mechanically reconciled; differing audio, flags or other fields require a candidate-bound reviewed resolution. Missing, blank and false remain different. Unresolved learner-affecting ownership conflicts hold the word.
7. Project lesson titles from current authoritative data on every request; never author titles in vocabulary links. Keep unknown, unbound and unconnected states explicit.
8. Provide progress mapping as a read-only preview. Report multiple schedules for one learner/word, ambiguous mappings and active identity collisions. Retain existing card IDs and schedules. There is no automatic merge, delete, progress rewrite or migration apply function.

## Consequences and boundaries

The workbook adapter must preserve every source record and unresolved item, but only explicitly reviewed material can reach learner projections. Native workbook format and counts remain adapter conservation obligations, not validated by this module. The module cannot establish that a reviewer identity is authentic, a source locator is correct, or a Hebrew form is linguistically valid.

The envelope is the single authoring home for additions and introduction links. Lesson settings are filtered views of that data. Lead owns persistence, draft compare-and-swap, Stage/Publish, payload revisioning, content hashes, immutable release pinning, learner projection, and integration with existing letters/settings. Feature owns rendering. Contracts alone install none of those paths.

Rollback restores an immutable content revision and its eligibility settings; it must not rewind learner schedules. Existing sessions keep their original snapshot. Migration would require separately reviewed mappings, an exact backup, a conflict-free operation plan and demonstrated restore; this checkpoint deliberately supplies no apply path.

Production hosting, canonical source replacement, live publication and curriculum scheduling are unchanged by this local decision. Detailed APIs and acceptance handoff: [LEXICAL_CONTRACT_V1.md](../architecture/LEXICAL_CONTRACT_V1.md).
