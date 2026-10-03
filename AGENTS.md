# Hebleo project rules

The user's explicit instructions take priority. `docs/MASTER_SPEC.md` is the supplied product source; `docs/INITIAL_BUILD_BRIEF.md` defines this milestone. Record deliberate departures and implementation decisions in project documents.

- Human teaching and linguistic judgment remain authoritative. Clearly distinguish verified source content, proposed content, synthetic demo fixtures, and generated material.
- Build locally. Keep the private GitHub remote updated with meaningful commits after coherent work, passing verification, and integration. Do not push secrets, learner records, local databases, uploaded media, or unrelated files.
- One lead engineer owns implementation integration and the main branch. Feature work must use separate branches/worktrees or explicitly disjoint files agreed with the lead. Never discard another agent's changes.
- Stable content IDs, reusable references, deliberate publishing, version history, and preserving learner progress are core requirements. Document material schema/API/identity changes and their consequences.
- Scope parallel work explicitly. A handoff identifies repository path, exact commit or changed files, commands actually run, results, and outstanding limitations. Review the actual implementation rather than relying on another agent's summary.
- Run meaningful checks appropriate to the change. Critical behavior needs executable verification; minor reversible presentation changes do not require implementation-mirroring tests.
- `docs/FEATURE_CHECKLIST.md` is the shared implementation and user-acceptance ledger requested by the product owner. Update its stable feature IDs, bounded status, actual evidence, and known issues at behavioral checkpoints. User Pass/Fail/Blocked results require the user's report; automated tests and owner/independent reviews remain separate evidence.
- Use staging/demo data. Do not modify the live WordPress site, live purchases, subscriptions, student data, or external service configuration during this first build.
- Use designated credentials only when available and authorized; never print or commit them. Integrations without credentials use documented adapters and `.env.example` placeholders, not hidden fake successes.
- Routine technical decisions, reversible fixes, local builds, tests, commits, and pushes to this private project are authorized. Escalate substantive product/pedagogy changes, missing human-only access, paid operations, and production releases.
- Use mounted browser/computer tools for manual UI inspection; preserve background control. Do not interrupt the user's desktop or substitute a foreground automation path.
- Infrastructure ownership belongs to the lead engineer initially: local migrations, repeatable startup, automated checks, staging boundaries, backup/export, and restore verification.

Curriculum work proceeds directly with the product owner's principles alongside engineering. Architect and release reviewer provide independent technical judgment; the release reviewer may challenge the architectural design as well as implementation.
