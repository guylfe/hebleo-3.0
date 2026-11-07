# Practice tutorials and navigation — source-only handoff

Assigned clone: C:\Users\Trans\.openmausbot\task-workspaces\8c900356-50f6-4d41-bbb9-50c8abe09233\29589429-5a6c-4533-a05a-1766ecf38070\tutorials-navigation

Branch: feature/practice-tutorials-navigation-20261107. Baseline: 30bab6562236ade10d617cf5ded252312cbe0115. Lead owns integration, private push, sidebar and installation. No push to local origin, deployment, live WordPress or installed app/state/content changes performed. Locked dependencies were installed locally with npm ci --ignore-scripts --prefer-offline --no-audit --no-fund (78 packages).

## Runtime files

- public/conjugation/read-only-dialog.js: extracted scoped canonical read-only modal; learner-view.js authored extras reuse it. Native showModal provides modal isolation and Tab containment; capture-phase key isolation protects background study shortcuts. Close/cancel/Escape removes the dialog and returns focus; selection stays on mounted input.
- public/conjugation/help.js and help.css: shared tutorials for native/wordpress and flashcards/conjugation. Static copy, no network/storage calls. Delegated help uses its own data attribute, never practice data-action. Bounded viewport scrolling, RTL logical margins, existing palette and visible focus.
- public/conjugation/view.js: help available during setup, drill and finish, independent of render/grade/advance. public/app.js: review wrapper exposes help in overview, ordinary, shared iframe and finished branches; lifecycle cleanup; Flashcards #review and Conjugation practice #conjugation are distinct current tabs. public/index.html and src/server.js serve the new stylesheet/modules.
- public/conjugation/wordpress-help.js: display-only sibling help controls outside practice-owned redraw area; no prototype patch. adapters/wordpress/practice-help/{practice-help.php,package.mjs}: separately packaged add-on.
- adapters/wordpress/conjugation/{conjugation.php,package.mjs}: package includes exact shared help/dialog/CSS assets and enqueues help stylesheet. Catalog, bootstrap, approval, access, cache and scheduler semantics untouched.

## WordPress integration for Lead

Preferred narrow installation for the currently installed plugins: build a NEW separate add-on directory with `node adapters/wordpress/practice-help/package.mjs NEW-output-directory`. It produces practice-help.php, assets/bootstrap.js (from public/conjugation/wordpress-help.js), assets/help.js, assets/read-only-dialog.js, assets/help.css, and SHA256 manifest.json. Install that directory as a separate plugin under Lead's installation authority. There are no activation/migration handlers. Do not modify existing page content, flashcard/audio sources, the approved catalog, current plugin activation/migrations, access/cache or scheduling.

The add-on uses wp_enqueue_scripts for scoped CSS and wp_footer for its module, only on is_post_type_archive('decks') or is_page('conjugation-practice'). It inserts help immediately before #study-app (flashcards) and [data-conjugation-host] (existing conjugation), remaining available across their internal redraws. It skips an existing built-in help trigger or sibling add-on. Required destination verification: /decks/?deck=49480 and /conjugation-practice/ contain those actual stable hosts and footer hook; their help must open before and during practice without changing the active session. No WordPress hook was installed or executed in this task.

For a later complete conjugation package rebuild, existing `node adapters/wordpress/conjugation/package.mjs approved-catalog.json NEW-output-directory` now includes the help assets, retaining schema2 manifest and the private catalog/forbidden-public-catalog checks. Do not replace the installed approved catalog for this tutorial change. `verify-package.mjs NEW-output-directory` remains the exact-file hash verification. The separate add-on can serve the existing conjugation installation without rebuilding it.

Lead separately owns existing menu114/item45288 replacement to /decks/?deck=49480 and page49506 insertion immediately below. No menu changes made here.

## Evidence and limits

- `node --test test/practice-help.test.js test/conjugation-view.test.js test/first2-feedback.test.js test/conjugation-native.test.js adapters/wordpress/conjugation/package.test.mjs`: 42 passed. Includes input-node/caret/draft/Nikkud/prompt/feedback preservation, shortcut isolation, close/Escape/focus, setup/round help, cleanup, WP sibling retention, exact add-on package hash/import smoke and PHP lint, native routing/current-tab/HTTP serving, and existing unlock/data-integrity checks.
- `node --test --test-name-pattern='practice tutorial|review|navigation' test/app.test.js`: 16 passed on the final rerun, including the synthetic sharedReview iframe preservation case.
- `npm run check`: passed.
- `node qa-tests/verify-approved-conjugation-release.mjs`: unchanged approved catalog SHA256 fa58473bbd19b201829f9584482003d2d78e850d6bdef0b0f030837b92dd2ca1; 508 forms, 1,016 answer checks and 3,048 distractor checks passed.
- `php adapters/wordpress/conjugation/cache.test.php`: passed.
- `node --test adapters/wordpress/conjugation/direct-access.test.mjs`: 1 passed.
- `git diff --check`: passed.
- Existing native harnesses that manually strip ES imports now inject the new help exports; no behavioral assertions removed. Old conjugation current-tab expectation changed from library to conjugation.
- No browser was opened. JSDOM stubs native dialog open/close; native inertness/Tab isolation, actual focus/scroll/phone/RTL rendering and assistive technology require Lead's mounted Browser review. No physical-device or user acceptance claimed.
- WP flashcard copy below is a bounded draft for Lead confirmation: inspected study-scheduler/wordpress.php, background-review/client.js and client.test.mjs confirm the study-app host, study session/reveal/rating methods and four numeric ratings; full installed archive-decks.php was not present in this clone. Exact installed labels and hook rendering remain unverified. No unsupported audio, shortcut, unlock, Undo or queue claims appear in WP copy.
- No task-specific automation was created. No app startup/reset/install command was run; existing installed progress remains outside this task.

## Exact tutorial text

The following is generated directly from public/conjugation/help.js; WP flashcard copy retains the draft status stated above.

### How to use flashcards (native)

- Before starting, choose the session size and card presentation. Listening and sentence presentations depend on available source material.
- Add words to review from lessons or My Hebrew. Use Undo last rating to correct your latest rating. Finish session returns to the overview.
- Try to recall the answer before choosing Show answer.
- After revealing the answer, rate your recall: Again if you missed it, Hard if it was difficult, Good if you recalled it, or Easy if it was effortless. Your rating schedules the card’s next review.

### How to use flashcards (wordpress)

- Flashcards are independent practice. Open your deck, start a study session, recall the answer, then reveal and rate it.
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
