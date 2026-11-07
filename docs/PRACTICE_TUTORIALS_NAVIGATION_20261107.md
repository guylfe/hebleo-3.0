# Practice tutorials and navigation — installation record

The local app and WordPress tutorials/navigation are installed and verified. Leo-Web returned the real signed-in canonical-page report and eight desktop/360px screenshots after the existing copy approval was resolved. Lead inspected every screenshot and the report, and independently rehashed all five installed add-on files plus the loader.

## Installed links and identities

- WordPress Smart Flashcards: https://hebleo.com/decks/?deck=49480
- WordPress Conjugation Practice: https://hebleo.com/conjugation-practice/
- Native Flashcards: http://127.0.0.1:63358/#review
- Native Conjugation practice: http://127.0.0.1:63358/#conjugation
- Installed native executable: 88ee24f1eb8821ec68cb727c62113e2f8e6b0b88; runtime SHA256 6218651d1d5df0763156d254a3270316063adb8b6528c64b0b750c0e0c9f8428. The dedicated installed-tutorials checkout remains separate from source integration. Database, media and configuration paths are reused, with preservation startup and no reset/reseed.
- WordPress new add-on: hebleo-practice-help/practice-help.php plus four portable assets, loaded by mu-plugins/hebleo-practice-help.php. No existing plugin was reactivated or replaced. Final read-only-dialog.js SHA256 8e6f9d36cf4920b5436a20e5412fe97df851d879444cb732c55c23ac5817d061; help.css 072a30142bc7421a03e3c210ad8464d0a4132bb44654141f896cb5cff5e192a3. Approved conjugation catalog, existing flashcard/audio plugins, access and scheduling remain outside these changes.

## Behavior and source owners

public/conjugation/read-only-dialog.js is the shared native modal owner extracted from authored Extra information. Visible Close and Escape restore the exact trigger; the dialog traps Tab, blocks background shortcuts and locks background scrolling while retaining the prior inline overflow value. Long content scrolls internally. public/conjugation/help.js owns exact platform-specific static copy and a separate data-practice-help event path; opening help does not remount practice or perform network/storage operations. help.css uses existing tokens, logical layout, visible focus and 44px help targets in the conjugation surface.

public/app.js exposes Flashcards and Conjugation practice as separate top destinations, with distinct current-page state. Help wraps every flashcard branch, including ordinary/shared/finished review. public/conjugation/view.js includes help in setup, round and finish; its practice action handler does not process the separate help trigger. public/index.html/src/server.js serve the modules/styles. Learner Extra information reuses the extracted primitive.

The WordPress add-on inserts a sibling help control before #study-app or [data-conjugation-host], preserving their internal redraws. It loads only on the existing decks archive and conjugation page. Package with node adapters/wordpress/practice-help/package.mjs NEW-output-directory; install the five manifest files into the new plugin directory and the separately reviewed loader.php into mu-plugins/hebleo-practice-help.php. The loader avoids activation hooks. Future full conjugation package generation includes the help modules/styles, while this installation leaves the existing seven-file approved conjugation installation intact.

Actual sidebar menu114 now has existing Smart Flashcards item45288 at order2 linked to the real deck; new Conjugation Practice item49511 at order3 links page49506. Existing Profile44710 moves to order4; all existing hierarchy and relative ordering remain. The normal positional insert API refused existing BuddyBoss entries with blank stored URLs. Lead created only the new page item at the end, then used a transaction with exact old-order/membership guards to update only menu_order on the listed posts and invalidate their object caches. Raw independent database readback confirmed all15 positions; no BuddyBoss link was rewritten. Signed-in desktop rendering confirms the requested order and links, including the retained Profile entry.

## Commands and evidence actually run

- npm ci --ignore-scripts --no-audit --no-fund and the corresponding --prefix schemas install completed in the isolated source and installed checkout.
- npm run verify:candidate: 1,197 passed,9 existing audio-related skips,0 failures,1,206 total on 0666703. The initial run found a missing schemas dependency install and an old responsive-nav expectation; both were corrected. This configured command explicitly excludes deferred audio tests; it is not an unrestricted full-suite claim.
- node --test test/practice-help.test.js test/conjugation-view.test.js test/first2-feedback.test.js test/conjugation-native.test.js adapters/wordpress/conjugation/package.test.mjs:42 passed during Lead review.
- Final modal touch/scroll/focus changes: node --test test/practice-help.test.js test/first2-feedback.test.js:16 passed on88ee24f. Prior full candidate plus these final focused checks are separate evidence levels.
- The premium static report found the same four unchanged Studio/vendor findings recorded at the prior baseline; none is in the tutorial/navigation files. PHP lint passed on the add-on and loader; package test checks all five file hashes, module graph/import and PHP syntax. git diff --check passed. WordPress CI now installs root dependencies before its JSDOM help tests.
- Mounted Browser: installed native Flashcards overview help renders, is modal, isolates focus and locks scroll. Close/Escape and Tab/focus restoration were checked. On a disposable full database copy, an active flashcard and unrevealed face stayed mounted across help and a digit key in the modal. An active conjugation Write round retained the same input node, Hebrew draft/caret, prompt HTML, local preferences and focus after help. No rating was submitted.
- Installed native360px rendering uses exact installed HTML/assets/API in a same-origin srcdoc frame, because the app correctly denies direct framing through its existing frame-ancestors policy. Only the test document's initial route was set; no app/security code changed. The actual phone dialog fits, scrolls, has a reachable Close and44px help target. Closing retained the same RTL input, Hebrew draft, prompt HTML and local preferences. This is CSS viewport evidence, not physical Android acceptance.
- Mounted public WordPress flashcard page: actual How to practice button opens the correct WordPress copy with680px desktop modal, expected styles, focus and scroll lock. Anonymous conjugation remains denied and contains no catalog. Cache-busted fresh guest HTTP returned200 and the new helper module on both pages. Leo-Web verified both canonical signed-in URLs and actual sidebar links, setup and active unrated flashcards, and a conjugation Write round. Existing DOM/card/iframe/current-card/queue/statistics and Hebrew draft/caret/prompt remained; no new resource requests occurred during help. Tab/Close/Escape/focus return passed. Desktop1280x720 and actual signed-in same-origin360px frames fit without horizontal overflow; the long conjugation tutorial scrolls to the final bullet. No production impersonation test was used.
- Existing WordPress page code emitted e.target.closest is not a function on the login page before add-on installation and during public-page interaction. Help still rendered; no unrelated keyboard repair was undertaken.

Non-sensitive screenshots and verification receipts are in evidence/practice-help-20261107/. Task-root working evidence and command logs live at C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\29589429-5a6c-4533-a05a-1766ecf38070. No raw learner rows, databases, credentials or server-private baseline inventories are committed.

## Preservation and material limits

Native complete logical database SHA256 remains09cec407e1f619058d2a64dec5eb0aafb398484d65c79af9efb9096d199cee9b across fresh backup, before installation, startup and installed Browser checks, including1,431 media blobs. All application tables/schema match, with designated configuration present/absent state and hashes retained. Synthetic flashcard enrollment/session testing was confined to a disposable database copy.

WordPress retained consistent private per-row-ID/hash inventories before and after installation outside the web root. All9 flashcard/source tables, users, usermeta and non-navigation posts match, as do52 existing files across the protected plugins. Postmeta has two changed ekit_post_views_count entries and one deleted row314240 whose key/preimage was not retained by the hash-only inventory. The two counters are identified; the deleted metadata cannot be attributed from this receipt. No restoration or wider metadata/hosting investigation occurred. Full WordPress metadata preservation is not certified. This is a separate, bounded limitation from the historical conjugation delivery uncertainty.

Physical Android, assistive technology, alternate learner roles and Guy acceptance remain unverified. A non-empty missed queue or already-graded feedback was not manufactured in the live WordPress account; final focused automated tests cover feedback preservation. Web did not repeat the database inventory, and its report separately records site bot-detector storage changes and settled Google Tag Manager form attributes. The live evidence images contain the existing account interface and remain in the task workspace; only a non-sensitive assertion/hash receipt is committed.

The prior documentation CI was read once at20:48Israel for exact30bab65: WordPress42393067448 succeeded; Local42393067427 still reported in_progress. Its existing monitor stays paused with no next run. No retry, new monitor, deployment or wider audit follows from that bounded check.

Leo owns the next UNSENT Sender update for existing website users, using the two verified canonical WordPress links. Nothing was sent. Suggested factual copy: Sign in and choose Smart Flashcards in the sidebar, or Conjugation Practice immediately below it. Each page has a How to practice button. Flashcards schedule vocabulary review from your recall ratings; conjugation practice lets you choose verbs/prepositions and forms, answer with Choose or Write, and revisit missed forms after the remaining prompts. Conjugation leaves the flashcard schedule unchanged. Native lesson-unlock claims do not belong in that website email.

## Independent installed website review

The report and all eight screenshots in task-root wordpress-rendered-verification/ were inspected by Lead. Sidebar links/order, flashcard help during an unrated live round, conjugation setup/Write draft, focus/keyboard isolation, scroll behavior and visible RTL painting match the requested scope. Resource-request counts were zero during the reported help interactions. The report notes that Space on the Close button activates Close normally; isolation was checked with focus on the dialog. No live grading/rating/completion/settings change was used. The existing page errors are recorded without unrelated repairs. Exact installed hashes match the release manifest. Runtime/main checkpointb647d46 passed Local42407052268 and WordPress42407052267. This final evidence record changes no runtime bytes from installed88ee24f.

## Exact installed tutorial copy

### How to use flashcards (native)

- Before starting, choose the session size and card presentation. Listening and sentence presentations depend on available source material.
- Add words to review from lessons or My Hebrew. Use Undo last rating to correct your latest rating. Finish session returns to the overview.
- Try to recall the answer before choosing Show answer.
- After revealing the answer, rate your recall: Again if you missed it, Hard if it was difficult, Good if you recalled it, or Easy if it was effortless. Your rating schedules the card’s next review.

### How to use flashcards (wordpress)

- Flashcards are independent practice. On Study Decks, choose Study beside a deck. If No cards due appears, return when cards are next due.
- Try to recall the answer before choosing Show answer.
- After revealing the answer, rate your recall: Again if you missed it, Hard if it was difficult, Good if you recalled it, or Easy if it was effortless. Your rating schedules the card’s next review.

### How to use conjugation practice (native)

- Learned only includes the forms lesson authors unlock when you complete their lessons. Choose All to practice ahead. Practice does not complete lessons.
- Select Verbs or Prepositions, choose words and forms, and use More filters to narrow the selection. Choose a direction, then Start practice.
- Choose selects an answer. Write lets you type and Check answer; Nikkud is optional. You can switch modes and show or hide Nikkud.
- Show answer lets you compare, then choose I got it right or I missed it. After an incorrect written answer, Mark as correct lets you accept your own answer.
- Missed forms return after the remaining forms in each pass. Change selection returns to setup. Conjugation practice leaves your flashcard schedule unchanged.

### How to use conjugation practice (wordpress)

- Conjugation is independent practice; choose from the available forms.
- Select Verbs or Prepositions, choose words and forms, and use More filters to narrow the selection. Choose a direction, then Start practice.
- Choose selects an answer. Write lets you type and Check answer; Nikkud is optional. You can switch modes and show or hide Nikkud.
- Show answer lets you compare, then choose I got it right or I missed it. After an incorrect written answer, Mark as correct lets you accept your own answer.
- Missed forms return after the remaining forms in each pass. Change selection returns to setup. Conjugation practice leaves your flashcard schedule unchanged.
