# Authenticated WordPress rendered verification

Checked 10 November 2026, approximately 02:24–02:35 IL. COPY ONLY verification; no production code/config/content/data writes.

Result: all four rendered exact-text comparisons pass. Website flashcards has the approved four paragraphs; website conjugation has the approved five. No native Learned only / All note, Undo last rating, Start review or Finish session wording appears in these dialogs. Done is the close action.

## Surface and method

Used this bot's mounted Browser and existing authenticated site-owner session. No login, credentials, account creation or session minting was needed. Account identifiers and admin details are omitted from evidence.

Desktop: canonical pages at 1280×720. Narrow: the same authenticated canonical URLs loaded in a temporary same-origin iframe with an actual 360×600 CSS viewport; this is responsive CSS verification, not a physical Android test. No component replay or copied HTML was used. Canonical targets:
- https://hebleo.com/decks/?deck=49480
- https://hebleo.com/conjugation-practice/

Desktop screenshots capture only the native dialog or study root. Narrow screenshots capture the iframe; a temporary white fixed background mask below the modal excludes account/admin UI without changing dialog dimensions, content or layout. All temporary iframe/mask elements were removed. Page-side probes retained node references and read HTML/control values and relevant local storage. No prototypes or practice mechanics were patched.

## Actual checks

| Check | Flashcards desktop / 360px | Conjugation desktop / 360px |
|---|---|---|
| Exact ordered paragraph text against approved artifact arrays | 4 / 4 pass | 5 / 5 pass |
| Readable text | 16px; visually reviewed | 16px; visually reviewed |
| Dialog horizontal overflow | none / none | none / none |
| Done initially visible | yes / yes | yes / yes |
| Tab and Shift+Tab containment | pass / pass | pass / pass |
| Escape closes; focus returns to launching help control | pass / pass | pass / pass |
| Done closes; focus returns to launching help control | pass / pass | pass / pass |
| Same setup root, HTML and descendant node identities after close | pass / pass | pass / pass |
| Same form-control values and relevant local storage after close | pass / pass | pass / pass |

Desktop primary open/Done used mounted Browser clicks. Desktop and iframe Tab/Shift+Tab/Escape used mounted Browser key actions. Iframe opening and Done activation used the existing DOM button click handler. Each page has one corresponding launching help button; focus readback identifies that unique control by data-practice-help. Scope is setup only; no real round was started, revealed, rated or answered and no selection/settings were changed.

Narrow dialog bounds are x=19, y=16, width=322, height=568 in both cases. Internal dialog scrolling reaches the full last paragraph: flashcards scrollTop=121; conjugation scrollTop=236. Last paragraph bottom is about y=532, within the dialog bottom y=584. Desktop all paragraphs fit without scrolling.

Done is not sticky: at the bottom of a narrow dialog it scrolls out of view. It is visible at the top and reachable by scrolling back; Escape closes from the scrolled position. Tab remains on the contained Done button but does not itself scroll that already-focused button back into view. No mechanics/style change was made.

## Practice centering and actual counts

Practice roots and surrounding content/layout centers match exactly at rest (0px center mismatch). Desktop content center x=747.5; narrow content center x=172.5 within the available 345px page area after the scrollbar. No horizontal overflow in either practice root.

Opening either modal removes the page scrollbar, expanding the covered page by 15px and shifting its center by 7.5px (desktop x=747.5→755, narrow x=172.5→180). Closing restores the original setup geometry. This is an observed modal-open reflow; this report does not claim zero movement while the modal is open.

Actual flashcard values in both widths: NEW 20; Total remaining: 2047; LEARNING 3; REVIEW 3; Study (23 cards). Total remaining is underneath NEW, and their centers match. At desktop, NEW number y=439.796875/h=36; total y=517.796875/h=16.796875. At narrow, NEW number y=484.171875/h=36; total y=562.171875/h=16.796875.

## Evidence

RAW.json contains full scoped setup HTML/control/local-state readings, dialog text, geometry, node/value preservation results and computed exact comparisons. It was read back successfully; SHA256 3AD2AA5FE9865241275D162606F8A1F4A6358BE241CD63DC86709CF46AC8A7D9.

Seven PNG screenshots were visually reviewed:
- flash-desktop.png
- flash-360-top.png
- flash-360-bottom.png
- conj-desktop.png
- conj-360-top.png
- conj-360-bottom.png
- flash-counts-desktop.png

SCREENSHOT_HASHES.json contains every screenshot SHA256. Output is in this bot's current working folder, rather than writing into the Lead's separate task directory:
C:\Users\Trans\.openmausbot\task-workspaces\87d0667d-8e06-4e26-bc79-5a718991b13c\4aecec74-ef23-4630-bd62-d4463f26b8d0\wordpress-rendered-verification

## Limits and handoff

Observed site errors: WP_BODY not found admin-context error; Angie hosting registration/client creation timeout; e.target.closest is not a function was reported on initial mounted Browser help-click actions. Dialogs still opened, rendered and closed successfully. Origins of these errors were not investigated; none repaired.

Physical Android, assistive technology, Guy acceptance and active/graded session state remain unverified. No server preservation/metadata audit was repeated. Lead owns artifact review and final protected readback.

Read related automations: tutorial documentation monitor dd9109fb-ceca-4873-83a7-2e5ef3997605 and final conjugation documentation monitor 3defc5ca-abb6-4a78-9e04-ca3d0ffc30a4 are disabled with nextRunAt=null. This bot has no active tutorial monitor; its unrelated standing email preparation automation remains untouched.

