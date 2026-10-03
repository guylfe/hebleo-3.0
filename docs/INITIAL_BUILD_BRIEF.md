# First build: a substantial local Hebleo demo

## Authorization and inputs

On 2026-10-03 the user requested the proposed six-role team, a PRIVATE GitHub project, local development with ongoing GitHub updates, and an initial build as broadly scoped as reasonably plausible with a demo.

Inputs are `MASTER_SPEC.md` (verbatim supplied specification) and `SOURCE_DISCUSSION.txt` (verbatim supplied planning conversation). Do not treat earlier assistant suggestions as proof that a content asset exists or that a pedagogical change has been approved.

The local project is this Git repository. Do not move work into another active thread's folder. All six specialists are configured to use this project directory; concurrent writes still require explicit ownership or worktree isolation.

## Desired outcome

Deliver a polished, responsive web learner experience and content Studio that can actually be used locally, backed by real persistent data and reusable content objects. Demonstrate the defining publishing/propagation behavior, not merely navigable mock screens. Make the foundations suitable for later iOS/Android clients without attempting app-store distribution in this milestone.

Prefer a well-integrated broad build over disconnected feature stubs. The architect and lead may choose a coherent, maintainable stack after a short feasibility pass. The first milestone must run without new paid services or secrets. Use a local database and migration strategy, and document the future hosted-backend boundary. Avoid elaborate generic infrastructure before the real lesson workflow works.

## Hosting decision raised by the user

The user explicitly asked whether separate hosting versus placement alongside the existing WordPress website meaningfully changes development. This is an open architecture decision, not a settled production choice.

The user then confirmed that web payments must continue through the existing WordPress checkout. Preserve that checkout. The learner backend consumes verified purchase/subscription/refund events to determine access; it must not introduce a replacement web payment processor. Mobile store billing remains a separate future decision. Here, "live payments" means real financial operations/events, not a requirement to add mobile billing.

Leo's proposed direction is an independently deployed learner app, potentially `learn.hebleo.com`, with WordPress remaining marketing/checkout and explicit identity/entitlement integration. Separate deployment and separate physical hosting are different decisions: the services might share an appropriately configured server. A standalone local application is the first-build working assumption. The architect must assess and document standalone application, same-server deployment, and WordPress-embedded/plugin alternatives, including hosting capabilities, deployment, SSO, mobile/offline reuse, operational ownership, and migration implications. Do not buy hosting or implement production-specific identity assumptions before the decision is resolved. Keep adapters clean enough that deployment details can change without rewriting core learning logic.

## Core working scope

1. Learner home with one dominant recommended action, course/chapter navigation, concise lessons, Watch/Read alternatives when media exists, embedded checks, vocabulary, core application exercises, Next/More practice, and simple bounded remediation.
2. A reusable exercise engine supporting at least recognition/multiple choice, typed Hebrew answers, sentence ordering, matching, and one transformation or fill-in type. Use authored accepted alternatives and documented Hebrew normalization rules; avoid broad typo tolerance that accepts linguistic mistakes.
3. Hebrew rendering with explicit pointed, standard unpointed, and curated forms; Curated/Full/None settings; reveal support; exercise overrides; careful RTL/LTR and accessible keyboard assistance. Do not synthesize standard unpointed spelling by blindly stripping vowel marks.
4. Persistent learner progress, attempts, preferences, mistakes, bookmarks/notes, and a usable course-linked review queue. Use an established FSRS implementation where feasible and accurately identify the implemented scheduler. Never label a simplified custom scheduler FSRS.
5. Visual Studio with reusable vocabulary, sentences, exercises, media references, and ordered lesson components using source + selector + renderer + options. Stable IDs and manageable authoring are mandatory; no elaborate per-word prerequisite graph.
6. Content drafts, preview, publish, dependency impact, version history, rollback, and broken-reference/duplicate-ID validation. A change to one published vocabulary item must propagate to dependent lesson, practice, and review surfaces while retaining learner state.
7. Spreadsheet import/publish support. Preserve relevant formatting/rich text through a validated interchange format and provide a Google Sheets adapter/configuration boundary. A file-based import must work without credentials. Clearly distinguish working local import from any unconfigured live Sheets connection.
8. Clearly labeled local demo identity and course/membership entitlement behavior. Demonstrate that membership removal retains purchased-course access and core review. Use test users and purchase/refund event fixtures; do not process actual payments or manipulate live users.
9. Useful learner/admin statistics, simple study goals/streak behavior if practical, vocabulary search, and error/empty states. Prioritize complete core flows before optional gamification or cosmetic breadth.
10. Repeatable setup, seed/reset for demo data, local startup, database export/restore, automated checks, a private GitHub CI workflow, and a clear project status/limitations document.

## Content and media

Curriculum specialist should inspect relevant authoritative course/masterfile sources read-only if their tools and authorized connections allow it. Produce a small representative content pack and provenance manifest. Do not import student/purchase records.

If real sources cannot be read promptly, deliver clearly labeled synthetic DEMO fixtures for several short lessons that illustrate early reading, grammar, and sentence application. These are illustrative scaffolding, not approved replacement curriculum. Never present synthetic data as imported content or AI speech as existing native recordings. Missing source media must be handled honestly and gracefully.

Plan curriculum/video restructuring in parallel; broad course changes and new canonical linguistic content remain proposals for the user.

## Reasonable stretch work

After the core flows pass, add PWA/offline text and review queuing with tested reconnect behavior, richer exercise types, keyboard progression, and media management. AI tutoring, pronunciation scoring, native app packaging, community, live SSO, hosted database setup, and payment integrations may have typed adapter boundaries and honest unavailable states. They must not be claimed working without an actual implementation and verification.

## Team ownership and sequence

- Architect: inspect inputs, choose minimal architecture with lead, produce contracts/ADRs and an executable first-slice plan. Design questions should be resolved through small implementation experiments, not prolonged document-only work.
- Lead engineer: owns source integration/main, startup, data persistence, meaningful tests, CI, GitHub checkpoints, and the integrated broad demo. May coordinate named specialists once their contracts are clear.
- Feature engineer: implementation in agreed branches/worktrees under the lead's contracts. Reports exact revision and actual verification.
- Curriculum designer: parallel content/provenance work and practical Studio authoring feedback, with no live publishing or silent changes to pedagogy.
- QA/red team: run the app and tests, add reproducible regressions, check failure cases; submit defects to lead for fixes. No independent large production rewrites.
- Release reviewer: separate context, read-only by default, checks implementation and architecture at the milestone gate, including critical data/entitlement/publishing risks.
- Leo: coordinate artifacts, verify returns, resolve routine scope decisions, request concrete corrections, and deliver one consolidated result to the user.

Keep GitHub current through coherent checkpoints. A commit is not proof of tested behavior. Record actual test commands/results. Do not create an automatic timed routine for Git synchronization; commit and push at work checkpoints.

## Acceptance evidence

- A reproducible install/start sequence and a usable local demo URL.
- Executable verification of learner lesson -> attempt -> completion -> reload persistence -> review.
- Working source edit/import -> validate -> preview -> publish -> propagation -> rollback, with learner progress retained.
- Review/entitlement behavior and duplicate event/import handling tested on demo data.
- Responsive RTL/LTR inspection, accessible interaction, and truthful media/integration states.
- QA findings resolved or explicitly recorded; release reviewer reports concrete blocking and nonblocking issues on the actual revision.
- Final integrated commit pushed to a verified private GitHub repository; report exact commit, test results, demo instructions, and material limitations.
