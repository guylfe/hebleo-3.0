# Mounted browser rehearsal observations — 7 November 2026

Local synthetic fixture server only, built-in Browser. No production site, account, learner state or installed demo was opened.

- Native setup at 360px iframe width: all 11 verb labels occupy exactly two equal tracks; long pairs wrap inside their cells. Native Learned only/All and Nikkud switches are visible. Screenshot native-phone-verbs.png.
- WordPress setup at 360px iframe width: all 19 prepositions occupy exactly three equal tracks, including long wrapping labels. No Learned/All toggle. Screenshot wordpress-phone-prepositions.png.
- Native and WordPress desktop setup: two-pane layout, two equal verb columns; native alone shows Learned only/All. Screenshots native-desktop-verbs.png and wordpress-desktop-verbs.png.
- Native phone drill: Start -> Write -> fill "fixture typo" -> Check. Snapshot showed disabled text draft, Mark as correct and Next form. Actual click on Nikkud showed checked=true with the draft retained; Mark as correct removed the override control while retaining Next. No remaining browser-level timing or touch acceptance is inferred.
- One browser check action reported success but snapshot still showed checked=false. Used the actual click and subsequent snapshot to verify checked=true; did not treat the earlier success message as proof of the state.
- First navigation had GET /surface.html 404. Corrected the absolute iframe path, added package.test.mjs regression, and independently fetched surface/engine/view/CSS with HTTP 200. Later navigation loaded the expected page; absence of reported errors is not treated as a full browser error audit.

Screenshots labeled initial/draft are intermediate evidence, not the final installed product. The final view uses explicit fixture banners throughout. Phone width here is an iframe viewport, not a physical Android device. Reverse direction and multiple repeated passes are executable test evidence; they were not exhaustively re-played manually in this browser.
