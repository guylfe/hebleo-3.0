# Card edge padding — 5 November 2026

Guy requested breathing room around both flashcard faces on WordPress and new Hebleo. WordPress's front/back face container now has16px padding with border-box sizing and zero minimum width. The app's shared-card frame sits inside a16px padded border-box wrapper on either face. Existing native app cards already retain at least18px inset on mobile and40px normally.

The iframe itself is not padded: its measured content height remains unchanged and cannot lose32px of viewport height. Frame width stays100% of the inset content area. Natural height and existing responsive rules remain; no fixed height, nested scrolling or control-position change is introduced. Primary/rating/secondary controls remain outside the app wrapper. WordPress's existing centered control container is unchanged.

Generated WordPress output differs from the installed front-v1 only by the added CSS rule. Its JavaScript, scheduler, loader, frame bridge, receipts and burial logic are byte-exact. App.js differs only by the shared face wrapper; the other app change is its CSS. Original templates, content/audio, source, access, progress and database schema are unchanged.

Five existing actual-app shortcut/save/race checks passed. Twenty bounded source/computed-style checks confirmed four-edge16px padding on both faces, border-box sizing, no newly added scroll container, unchanged generated WordPress runtime outside the style rule, and wrapper-only app markup. PHP/JavaScript syntax checks passed. These checks do not claim browser geometry or visual acceptance. Fresh guarded deployment/readback receipts live outside Git in the Lead task directory card-padding-20261105.
