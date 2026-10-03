# Hebleo 3.0 specialist team

The combined setup was applied on 2026-10-03 (decision c0581c67-a13a-42ef-b218-324bede11e5b). Leo 3.0 remains Chief of Staff. All six specialists were created in the Hebleo 3.0 section with this project as their working directory; existing threads' models were not changed.

| Role | Bot ID | Engine / model | Effort |
| --- | --- | --- | --- |
| Hebleo Architect | db09fd3d-5506-4d39-9e8a-95b458bf2c5d | Codex / gpt-6-astra | xhigh |
| Hebleo Lead Engineer | 8c900356-50f6-4d41-bbb9-50c8abe09233 | Claude / claude-opus-5-5 | xhigh |
| Hebleo Feature Engineer | 2b35801f-cca1-4beb-9e70-fd39eb282fa0 | Codex / gpt-6.1-sol | high |
| Hebleo Curriculum Designer | ce687f30-e122-487e-ad2e-974e67e3fb64 | Claude / claude-opus-5-5 | high |
| Hebleo QA Red Team | df3d19e5-dedf-4129-9d7a-5b08ffaa6bd9 | Grok / grok-4.7 | high |
| Hebleo Release Reviewer | 6fce93a9-6bf0-4d8d-ad11-edd2d2a11700 | Codex / gpt-6-astra | xhigh |

The lead owns main, commits, and pushes during parallel work in the shared checkout. Architect and curriculum specialist write their assigned documentation only and hand it to the lead for integration. Feature code uses an isolated branch/worktree or agreed disjoint files. QA and release gates evaluate the exact integrated revision.

The initial parallel workstreams are architecture/hosting assessment, curriculum/provenance pack, and broad local application implementation. Leo will dispatch independent QA and release review when the build is ready, and require concrete corrections as needed.
