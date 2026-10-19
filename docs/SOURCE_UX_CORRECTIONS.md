# Real-source vocabulary UX corrections

UX Owner reviewed the installed `17a3592c5ce5b3dd20b02a653840f06deff00027` build in mounted isolated Chrome on Oct20. The review contains 21 native screenshots and actual interactions across all five real-source categories, notes/asides, source details, source search/clear, paging, collection switching and the ordinary lesson vocabulary link. It found five concrete defects. This is owner review evidence, separate from Guy acceptance.

| Finding | Correction |
|---|---|
| UX-SOURCE-01: raw infinitive slot ID | Nominal headings use Infinitive / Verbal noun while preserving supplied forms and internal slot IDs. |
| UX-SOURCE-02: learned-context absence label in source browsing | Missing source display cells say No source-labelled form; learned-context cells retain their existing introduction label. No forms are added. |
| UX-SOURCE-03: Full preposition notes clipped across horizontal scrolling | Full-table support rows retain their colspan/background; their Note and Original source reading areas are sticky and bounded to the measured visible table viewport. Overflow is measured at that reading width, so the existing Expand/disclosure treatment remains available. |
| UX-SOURCE-04: indistinct collection selection | The selected collection uses the existing navy/white palette through its aria-pressed state, including interaction states. |
| UX-SOURCE-05: paging leaves the reader at the bottom | Successful source paging focuses and scrolls to the results status/start, accounting for the existing measured sticky header. Search keeps its own focus behavior. |

Single-result status also uses “1 source word”. The changes affect rendering, accessibility text and local navigation only. Source adoption digest, original strings/formatting, approval/eligibility, database content and learner records are unchanged. Startup uses a fresh consistent backup and preservation/CAS checks; it never invokes the demo reset or replays adoption.

Focused regressions cover source/learned absence separation, nominal headings, bounded note overflow/disclosure and paging focus/scroll. Native post-fix review is required to close the five findings. Previous native keyboard traversal was refused by the strict background driver; no foreground retry was attempted. Filter selection, additional viewport sizes and measured contrast were not established by the original review. These limits must remain distinct from actual correction recheck evidence.
