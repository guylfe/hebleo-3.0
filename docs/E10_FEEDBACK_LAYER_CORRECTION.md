# E10 feedback layer correction

Independent QA and UX withheld signoff on 065197a. QA-E10-02 / UX-E10-02
reproduced the same owner interaction: the result explanation's leave timer hid
the anchor while its separate vocabulary layer was being used, including pinned
cards. The historical reports and failing probes are retained, not relabelled.

The reminder now emits an opening event from its anchor and a closing event on
its own panel. The result explanation keeps its visibility while a child card is
open, then resumes its ordinary pointer/focus dismissal. Panel-close notification
also runs after disconnection; exact-trigger focus restoration occurs first.
This does not weaken hidden/inert/stale anchors, move the card into the status
region, change grades or introduce learner writes. Descendant focus departure
now releases the explanation after the card closes.

Lead reran the original independent regressions before fixing: all eight UX
transit cases and both QA grading-outcome cases failed as reported. After fixing,
the combined independent QA/UX probes plus answered-binding cases pass 42/42.
An earlier combined run including shared reminder and prior disclosure checks
passes 67/67. New owner coverage checks first Escape within a disclosure, next
Escape from the card, exact feedback-trigger focus, subsequent outside focus
dismissal and unchanged tables. Syntax and diff checks pass.

The QA source report/test commit 5a44cb6 is integrated as 8762f75. UX probes
are copied verbatim into qa-tests/ux-feedback-transit.test.mjs and
qa-tests/ux-learner-feedback-transit.test.mjs with their reusable app-harness.mjs.
These checks run explicitly; the normal candidate runner only discovers test/.

The two-file LF/CRLF discrepancy is a byte receipt issue. The corrected executable
will be verified from a fresh clone configured with core.autocrlf=true before
checkout, and actual hashes will be reissued. No normalized hash stands in for
tested executable bytes. Corrected-SHA independent rechecks and Release review
remain pending. Owner demo/data remain untouched. Native/Guy acceptance is pending.
