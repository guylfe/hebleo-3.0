# Local bootstrap decisions — implementation owner, not architect review

2026-10-03. Leo built this checkpoint while OpenMaus blocked the specialists in the shared project folder. These are provisional choices for a reviewable artifact, not independent sign-off or completion of the master specification.

## Hosting and checkout

Keep the learning application logically independent from WordPress. WordPress remains the web storefront and checkout. A future signed server-side adapter maps verified purchases/subscriptions into app entitlements. No simulator result proves a real purchase. Production identity must verify tokens/callbacks and enforce replay protection and access server-side. Premium membership and purchased-course access are separate entitlements.

A learner subdomain such as `learn.hebleo.com` is a provisional URL recommendation. The app could run on the existing server behind a reverse proxy or on a separate service. This changes deployment, backups, resource isolation, cookies/SSO, and operations without replacing course/exercise logic. A WordPress plugin/iframe adds coupling and complicates reusable native/offline clients. Current host capabilities and purchase/membership plugins have not been inspected; no production provider or migration is selected.

## Local stack and contracts

Node.js 24.19, an ES-module HTTP API, SQLite through `node:sqlite`, and browser-native JavaScript/CSS avoid services or new credentials. The lead may migrate the UI to React/TypeScript when isolated work can run. This departure keeps the prototype immediately runnable.

Content schema 1 contains provenance, words, lessons, and exercises with stable IDs. Words preserve explicit pointed, standard-unpointed, and curated forms. Manifests use an explanation renderer or collection source (`words`/`exercises`), lesson selector, renderer, and options. The demo permits one of each component, reordered freely; vocabulary may select another lesson's source. Core exercises stay attached to their lesson. Broader selectors/renderers are future work.

Recognition, typing, and matching resolve canonical words. Sentence ordering, cloze, and transformation have explicit accepted answers; they do not infer morphology or rewrite sentences after word edits. Normalization removes vowels when allowed, presentation direction controls, punctuation, and duplicate whitespace. It does not equate final letters, invent synonyms, or accept spelling errors. Nikkud-required typing compares only the pointed form.

Published snapshots are immutable SQLite revisions. Drafts are validated; publishing checks the expected active revision and switches atomically. Rollback creates a new revision. Separate learner state survives changes. Open lessons keep their content revision for grading. Removed word cards retain state but are hidden until available again. This prototype supports one local author; parallel draft edits need additional concurrency control before production.

Review uses a bounded interval rule with Again/Hard/Good/Easy ratings and durable due dates. It is not FSRS. Basic review stays with the purchased course regardless of membership. Refunds gate course access but retain attempts/cards for restoration.

Attempts, ratings, and entitlement events have replay protection. Backup exports active content, both demo learners, and review/entitlement receipts; it excludes history/drafts and does not migrate real users. Restore validates before a transaction and replaces the replay ledger. JSON/CSV imports preserve authored forms and quoted/newline notes and reject malformed/duplicate IDs or broken references.

## Next work

The lead must inspect this artifact and prioritize missing robust authoring, FSRS, richer learning behavior, and justified offline support against the broad brief. Curriculum needs verified source access, provenance, and Guy's linguistic/pedagogical review. The architect should inspect WordPress plugins/hosting read-only and refine identity/signed entitlement contracts. Named QA/release reviewers must check the finished candidate and return actual commands, results, and defects. Local tests do not replace those gates.
