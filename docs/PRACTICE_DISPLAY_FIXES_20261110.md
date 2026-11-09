# Practice display fixes — 10 November 2026

Guy requested two display corrections and an approval-only tutorial proposal. Only the display corrections are implemented here. Current tutorial copy and behavior remain unchanged.

## Installed website changes

The help add-on previously inserted a new sibling directly into the theme's layout. `public/conjugation/wordpress-help.js` now wraps the existing surface and its separate help bar in one full-width layout item. `help.css` owns its responsive width, centered measure, and right-aligned help row. The practice node and all its descendants are moved intact; practice redraws retain their existing owner. Destroy returns the original surface to its original parent. The 1.0.1 add-on version changes the CSS/bootstrap asset URLs so the new layout is fetched.

The live `wp-learning-cards/archive-decks.php` NEW square now renders only `newLimited`. A subtle `Total remaining: ${deck.new_cards}` line appears below that square. `adapters/wordpress/practice-display/generate.mjs` applies only the reviewed markup/CSS patch, refusing any baseline other than SHA256 `96a04404eddd6fa535af66f8d449fedded7e71e34cdd81e8b0fa074ad6546eb3`. Output SHA256 is `d469dbe9dfa9a8fda66d7105e8cc6fc2285304738bc431c7fa3e1f15490d2d8b`.

`newLimited = Math.min(deck.new_cards, settings.new_cards_per_day || 20)` is the existing capped display calculation. `deck.new_cards` is the existing server count of eligible unsuspended new cards in that deck, with existing global suspension and sibling-availability filters. The old suffix was `deck.new_cards - newLimited`. Therefore 20+2027 becomes 20 and Total remaining: 2047. The total includes the capped allowance. Four cases (2047/20, 5/20, 0/20, 2047/12) passed through the actual patched render method with unchanged input data. No API, query, scheduling, daily-limit calculation, settings, enrollment or progress logic changed. This task does not independently alter or certify the scheduler's daily-allowance semantics.

## Native/shared surfaces

The shared helper source owns the website fix. Native Flashcards uses a block content area and has no NEW square or plus-remainder count. Native conjugation's internal help remains in its existing wrapping header. Actual installed desktop geometry showed zero horizontal movement of the review card or conjugation grid with help hidden. No native runtime restart, reset, migration or reseed was needed. The native complete database receipt was read afresh in the task evidence folder. Existing installed native runtime remains 88ee24f; this change's WordPress-only selectors have no native targets.

## Verification and preservation

- Installed exactly four website files: archive-decks.php, practice-help.php, assets/bootstrap.js, assets/help.css. Backed up all four outside the web root, checked the installed baseline, staged writes with hashes, used same-directory atomic replacement, and independently read back the final sources. Existing help.js and read-only-dialog.js remain unchanged.
- Nine consistent-snapshot flashcard/source inventories were identical before/after installation, including 7,067 progress rows, 2,118 assignments, 37 settings and five sessions. Of 57 protected plugin files, exactly the four authorized files changed. This is bounded code/data preservation evidence, not a new audit of historical metadata changes.
- Dependency and schemas installs succeeded. `npm run check` passed. Focused help/conjugation/feedback/package tests: 27 passed. PHP lint and `git diff --check` passed. Generator and installed artifact hashes agree.
- `npm run test:candidate`: 1,196 passed, nine existing skips, one Studio lesson-picker setup timeout. Isolated `node --test --test-name-pattern=STUDIO-PICKER-01 test/app.test.js`: passed. The broad run and successful isolated recheck are separate evidence.
- Strict premium source audit retains the same four unrelated Studio/vendor findings as the baseline. No scoped source finding. No optional Studio/vendor repair was added.
- WordPress health before/after has the same two performance findings (autoloaded options and response time). Inspected log tail retains existing ability-discovery errors and deprecation messages, with no new scoped parse/fatal error in that bounded tail. Targeted page caches were purged; no whole-site object/CDN purge.

Signed-in desktop 1280px and actual canonical 360px CSS frames are verified by Web and reviewed by Lead on the report, raw geometry and all three non-private images. Both actual principal surfaces share their real theme content area's center, with zero horizontal movement with help visible/hidden/restored and no horizontal overflow. Help uses its own row; hiding it moves content upward 36px. Initial checked positions have no help/practice overlap. The real NEW display is 20 and Total remaining: 2047, 6px below its square. Close/Escape restores focus and retains the exact setup nodes/HTML. After the review, a fresh consistent snapshot still matches all nine protected inventories and the installed sources. See `evidence/practice-display-20261110/VERIFICATION.md`.

No active round, answer draft/caret, graded feedback, missed queue, alternate role, physical Android, assistive technology or Guy acceptance was exercised. At a later scrolled administrator position the toolbar covered a help click point; the refused click changed nothing and fresh navigation restored successful help use. Existing page errors and the floating keyboard's possible lower narrow overlay remain outside this display fix. Source/readback, local test, native desktop and signed-in visual evidence remain distinct.

## Tutorial handoff

`CURRENT_TUTORIAL_TEXT_AND_CONTROLS.md` in the task root contains the exact unchanged tutorial copy for all four platform/practice combinations and the current component/control inventory. Current WordPress help.js SHA256 matches native/shared source: `8a452a36dc91db6ac382c29ce83e9d8001f64b21b619cb64437c1e9f178b4cec`. Leo owns proposed wording/images for Guy's approval. No spotlight tour or revised copy was installed.
