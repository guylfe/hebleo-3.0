# Corrected classic-editor native UX recheck — 1 November 2026

**Bounded UX PASS on 40864ec3cad885b5d550eb9c9cda9c0addc6bd6d. Original NC-01–04 findings are closed within this recheck.** The supplied two-row classic editor fits Guy's reference direction; retained private image approval, selection, mandatory alt, insertion, saved Preview and native reload work. No new blocking UX defect was reproduced. Installation and Guy acceptance remain separate.

Assignment 721fc1ce-aca0-48f0-8d74-e3fdc21cef7b. Mounted Browser only for actual UI, `http://127.0.0.1:63484/`, 1280×720/DPR1. All mutations were in the supplied disposable `classic-combined-20261101/candidate.sqlite`. No original63358 access, source-code edits, push, installation, new media import, new approval, private comment submission or publication.

## Identity and inherited evidence

Read Lead's combined handoff, relevant QA/release verdicts and receipts, current image chooser and ADR-B06. The QA native/projection/failure/anchor checks and Release integrity/recovery checks are their evidence, not independently repeated here. This narrow recheck supplements them and does not renew the entire CW-01–10 matrix.

Read-only source:
`C:/Users/Trans/.openmausbot/task-workspaces/8c900356-50f6-4d41-bbb9-50c8abe09233/4d4e36bc-67d1-4c07-bcfb-e381d246b0b3/hebleo-classic`.

- Exact revision `40864ec3cad885b5d550eb9c9cda9c0addc6bd6d`.
- Runtime `9554d3804855327e9159947abd6841a1d50a2bce2408afeb46cbdb2bd72460d7`.
- Backend `4c182a5bae3e6e9569492d7595b4e5529a026d04ad008937e3f15e5943d021d3`.
- All151 executable hashes independently calculated and compared to served build before and after. Source clean. Seven relevant served JS/CSS assets fetched through the Browser match their manifest hashes; `corrected-served-assets.json`.
- Initial Browser opened the origin afresh; later native reload and reopening confirmed the same build. Actual component version4.18.12.
- Initial DB receipt exactly equals QA's supplied final receipt `3f1aab0644b1739eb067247e670a83425004eb9c0c80e8c1e76ce99f8c792b29`: 23 saved lessons,26,632,796 content bytes. This baseline already contains QA's explicitly synthetic source fixture, two private contexts and the imported/private-approved image. It is not original canonical teaching data.

## Actual findings recheck

Stable IDs below follow my original report: NC-03 is font sizes and NC-04 is Brush accessibility; the latest brief named those two in reverse order.

| Finding | Actual native evidence and result |
|---|---|
| NC-01 image lifecycle | PASS for retained approval/use. Chooser renders provenance, exact asset/revision/SHA/MIME/68-byte pin and a real decoded1×1 local PNG. It shows the existing private approval by author-demo at `2026-11-01T09:50:35.233Z`, with teaching approval still pending. No new approval button is present; exact-revision selection is enabled. Selecting then Insert with blank alt rejects with “Add image alt text (up to 2000 characters).” and focuses alt. Filling `SYNTHETIC UX corrected private image fixture` and inserting adds the exact pinned image to the buffer. Explicit Save, ordinary saved Preview and native reload retain its URL/alt/decoded dimensions. Reopening the chooser after reload shows the identical approval actor/time and zero new approval buttons. Cancel closes it without another insertion. |
| NC-02 contextual File | PASS. Actual click on the existing synthetic link opens only **Edit link, Unlink, Brush**. No File control. No link navigation or URL submission performed. |
| NC-03 font sizes | PASS. Actual dropdown text is `8,10,12,14,16,18,24,32,48,72,96`px, unique/ascending. No prior trailing default sizes/duplicates. |
| NC-04 Brush keyboard/state | PASS within tested route. Native `Alt+F10 → Home → ArrowRight×4 → ArrowDown → ArrowRight` reaches Text. Focus is Text; Text selected=true/tabindex0, Background false/-1. Each tab's aria-controls matches its panel, each panel is labelled by its tab. Background hidden/display:none; Text visible/display:block. Escape dismisses. Screenshot shows visible keyboard focus on Text. No screen-reader claim. |

The private-use approval **creation** action was already performed by QA on this exact fixture and audited independently by Release. I did not create a second approval or edit server records to simulate one. My fresh evidence covers approval retention, approved-pin selection, validation, insertion and persistence. Private use remains distinct from canonical teaching approval.

Image pin: asset `synthetic-classic-review-image`; revision `media-3bba137c-d746-4b1a-bea1-b4485740cc0a`; SHA256 `5e3d382db4dd83d59aa5742793ad6b7903409e865c83bcbc54835049f043bc15`; immutable `/media/blobs/<same SHA>.png`. Existing QA image remains alongside the one additional UX insertion. Both decode complete/natural1×1 in Preview and after reload. The new image is inserted within the synthetic heading at the current insertion point; no heading text is changed.

## Reference, Preview and reload

Actual toolbar is **758×65 CSS px**, two compact supplied light-grey icon rows, separators/dropdowns and a contiguous white visual canvas. Application typography/palette remain. Reference comparison uses Guy's already inspected supplied image and prior before capture, not a claim of matching its exact vendor or every pictured feature. `corrected-01-reference.png` shows the current explicitly synthetic fixture at1280×720 with sidebar collapsed.

Ordinary saved Preview renders the existing centred24px blue/yellow bold/underlined heading, repeated mixed Hebrew/Nikkud/emoji text, link and table. Both image elements retain their exact checksum URL and individual alt text. After exiting Preview, ordinary native reload returns to active learning as expected; opening Edit lesson restores the saved synthetic draft, all formatting, link/table, retained-source boundary and both images. Status is Draft saved/not published. The prior review's failed final native reopen is closed for this corrected candidate.

No fresh narrow/200% zoom measurement was obtained in this narrow gate. No CSS or scripted viewport substitute was used. No physical-touch/mobile/APK, real IME, screen-reader or exhaustive accessibility acceptance is implied.

## Preservation and exact delta

`node verify-corrected.mjs initial`, `saved`, `final` calculate identities and full logical receipts using read-only SQLite. `node corrected-preservation.mjs` performs actual assertions against these captures.

- Only one field differs from the initial QA baseline: MEMORY-A2 / MEMORY-A2-interactive / MEMORY-A2.learn.try-first HTML.
- Removing exactly the single new `<img ... alt="SYNTHETIC UX corrected private image fixture">` tag makes that HTML byte-exact to the initial QA HTML. Complete authorProjection UTF16 text is identical. Existing source metadata/comments/boundaries and pre-existing image are retained.
- All other22 lessons and every other draft field are exact. Only draft KV changed. Private author-review/context records, media-state/import/private-approval audits, other settings/KV and immutable history are byte-exact. Media blobs/aliases, events, revisions, schema and sequence receipts unchanged. No extra private approval or media blob was created.
- Only fictional author-demo navigation changed among learner rows. The other learners are exact. Final draft23lessons/26,632,944bytes;148-byte intended addition.
- Final disposable full receipt `3c8fbea699cea7daf585bd524b8a792c637514298a0be4ae0a1fc994c4bee368`.

Original/live preservation is inherited from the cited QA/Release work; this reviewer did not reopen original data in this narrow turn. Nothing written here targets it. The current review database must never be installed.

## Evidence and limits

In this folder:

- `corrected-01-reference.png`, `corrected-02-brush-keyboard.png`, `corrected-03-preview.png`, `corrected-04-chooser-reopened.png`: inspected native screenshots.
- `corrected-preview.json`, `corrected-reload.json`, `corrected-approval.json`: actual decoded images, native reopened content/build and retained approval observations.
- `corrected-initial.json`, `corrected-saved.json`, `corrected-final.json`, `corrected-preservation.json`: exact identities/receipts/deltas. Private baseline/final JSON are local verification inputs, not import artifacts.
- `verify-corrected.mjs`, `corrected-preservation.mjs`: executed read-only verification. No broad suite/build was rerun.

Two initial actions were inconclusive: a link click was covered by the sticky header, and a premature post-reload image click produced no chooser before a wait timed out. Scrolling and acting on the settled UI succeeded; no forcing/scripted click was used. One initial keyboard sequence ran with BODY focus and did not open Brush; it is excluded. The explicit paragraph-focus/Alt+F10 sequence above succeeded. Those attempts are not passing evidence or reproduced functional defects.

No fresh performance distribution was collected. Prior five native Saves4.59–5.31s/221–342ms Long Tasks are bounded older evidence on ece6c085. QA reports a fresh40864ec native Save5.06s and trusted typing p95 1.1ms; that remains QA's evidence. Entry/Save Long Tasks and responsiveness limitations are not erased by this UX PASS.

No new publication/failure/CAS/anchor-recovery exercise was needed for these four controls. QA's actual combined native report and Release's integrity report remain the owners of those checks. Their compatibility finding also stands: rollback requires a matching pre-update database plus executable; an old executable must not be run directly against an approval-bearing database.

Lead owns guarded installation and installed identity/data/native verification. Guy acceptance remains pending. Supplied63484 server left running; no process was stopped/restarted and no own review server was created. No related automations exist.
