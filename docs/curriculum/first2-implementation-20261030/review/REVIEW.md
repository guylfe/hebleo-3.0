# Curriculum review of installed first two lessons — 31 October 2026

**Partial delivery.** Both intended placeholders have been replaced in the current local learner course. MEMORY-A2 is available for Guy testing. MNTL-A2 has its exact teaching text, original artwork and all seven activity definitions; sound-dependent activities remain unfinished because zero isolated consonant clips have been auditioned or installed. Do not describe the full user request as complete.

## Directly verified by Curriculum

- Read `http://127.0.0.1:63358/api/build`: code `73e242e717c630976fd2d040396d4d8d5fcd3127`, runtime SHA256 `08e689b369f2129b94e6d6d0016c4a0c6dadc4936b680cd30d26b69a20bb2249`, preservation mode true.
- Read both actual `/api/session?lessonId=...` responses. Active content revision 5; course starts MEMORY-A2, MNTL-A2, then existing lesson-3. Saved only the two authored lesson objects and retired-placeholder mapping; no learner responses or progress exported.
- Compared both installed lesson objects exactly against the candidate content pack: both equal, pack SHA256 `1b9df3021485e37c5c01af7a0eb573a482ba7329c797dc1dad55aaa2e9fb9e3a` matches the handoff. Eight source/identity checks passed, including Guy’s original introduction/Adam text, the application question and all seven letter activities. Evidence: verification.json and installed-first2.json.
- Downloaded the four actually served mnemonic PNGs via their installed URLs and visually inspected them. Mountain/climber composition, cropped/flipped nose, tripping figure and ladle match the supplied original source artwork. Hashes are recorded in verification.json; original media is not committed.
- Read the actual content builder and interaction implementation. Inspected the Git difference from Leo’s native walkthrough build abf3cca to installed 73e242e: executable change is the activity validator; renderer/content unchanged. No new native-browser walkthrough is claimed here.
- Updated four authoring status/implementation paragraphs in the live master, with a revision guard. Readback confirmed exactly those four edits and unchanged lesson heading identities. The master explicitly records that MNTL listening remains unfinished. Learner prose was not changed in this review.

## Evidence reviewed, attributed to its owners

Leo’s final handoff: `C:/Users/Trans/.openmausbot/task-workspaces/71c71389-5334-4e0c-9ca8-d80dd28223d1/fa5b73cd-180c-40ed-bf11-469defe4a57f/FIRST2_FINAL_HANDOFF.json`.

Read QA’s installed dock/control recheck and Leo’s narrow learner comparison completion check. They establish the earlier renderer-identical native control paths, with their documented device/accessibility limits. Lead reported 900 candidate tests and CI; Leo reported five final contract tests; independent reviewer closed RR-FIRST2-01 and passed preservation. These were not rerun or relabelled as Curriculum tests. Current runtime/source/artwork readback is separate direct evidence.

Code commit: `73e242e717c630976fd2d040396d4d8d5fcd3127`. Engineering evidence commit: `91403c54da9cab8cfcd7bbc12925415337a9bf70`. Original revised content: `02c3ff3e63d4f903edd7cd187cffe647fa60e56d`.

## Genuine remaining blocker and next owner

Source recordings exist: MNT newest 68.480 seconds and GDL letter source 55.808 seconds, with Drive IDs and hashes in Leo’s handoff. Curriculum attempted file audio output, but no audible content became available for phonetic inspection. The model cannot confirm consonant identity, absence of an added vowel, or exact clipping boundaries through this surface. No ASR transcript, waveform or visible teacher frame is being presented as auditory verification.

Human input needed: four approved isolated /m/, /n/, /t/, /l/ clips, a single recording explicitly containing those four sounds separated by pauses, or precise approved spans in the originals. Guy or a listening-capable human identifies the sounds; Curriculum records provenance and routes the concrete approved assets to Leo/Lead for extraction/installation/playback verification. Do not send more speculative asset-search assignments or claim the original recordings are missing.

Test links:

- http://127.0.0.1:63358/#lesson/MEMORY-A2
- http://127.0.0.1:63358/#lesson/MNTL-A2

Alex remains the recommended fresh fictional learner; this Curriculum review performed read-only API calls and did not use or reset a learner. Physical devices, screen reader, native reduced-motion behavior, consonant playback/phonetic acceptance and Guy acceptance remain unverified. WordPress and main were not changed by this review.
