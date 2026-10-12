# Hebleo existing product interface

Mode: Operate for Studio; Read/Operate for the learner. This bounded refinement follows Guy's Oct12 23:33 feedback and UX Owner's spec receipt54be2a97. Existing branding, source rendering, fonts and colors remain authoritative; no replacement visual world is approved.

Runtime ownership: existing public/styles.css and public/refinement.css (Model B). New geometry tokens live in refinement.css; this document explains them rather than creating a competing token system. Existing --ink/--line/--muted and semantic button styles remain shared.

Three sibling surfaces: main menu208px/56px, course navigation256px/48px, main content minmax(0,1fr). Course navigation exists only on course/lesson routes, outside lesson content and discussion. Each rail has its own accessible40px toggle. Expanded navigation that would squeeze main content below688px uses an overlay; below768px there is one drawer at a time and the toolbar is outside content. Navigation preference is local UI state per fictional profile, separate from backend learner/source records.

Main padding24px (16px narrow). Prose/discussion measure760px, aligned at content start; wide tables keep their own horizontal overflow. Lesson title32px desktop/24px narrow. Studio retains six tasks and mounted editors; task strip is horizontally scrollable when narrow, with max1120px workspace except wide source/table surfaces.

Comment/reply fields use stacked labels, width100%, border-box, vertical resize and existing validation. Comment starts96px; reply88px and collapsed behind Reply/Edit reply. Closing retains tab-local dirty text. Moderation preserves immediate posting, scoped anonymity and soft hide; no preapproval policy is added.

Private note data belongs to learner.notes[wordId], never source Notes or a public comment. Existing Ask-about-word control posts a word-linked lesson comment, not a standalone vocabulary feed. Saved-draft Preview excludes private notes. Audio testing is DEFERRED; no audio work or acceptance is included.

Source/DOM checks can establish structure, state and declared geometry; browser/native/pixel checks are unavailable under the binding pause. Existing immutable integrity receipts remain separate. Source registration/import/Stage/Publish and the separately implemented Masterfile-ID adapter are outside this correction.
