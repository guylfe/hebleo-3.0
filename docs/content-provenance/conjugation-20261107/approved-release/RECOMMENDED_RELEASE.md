# Proposed release choice for Guy

7 November 2026. No answer-key approval or installation has occurred.

Recommend releasing 508 of the 509 proposed records, with the single formal action noun רצייה held for a separate sense decision. This retains all 11 verbs and 19 prepositions, all proposed ordinary conjugations, and ten action nouns. It does not remove the Gerund control or alter course sources.

## Exact proposed policy

- Keep course Nikkud displays where supplied, except the three explicit gender/person corrections: דיבר past feminine singular second person → דִּבַּרְתְּ; נכנס equivalent → נִכְנַסְתְּ; התלבש present feminine plural → מִתְלַבְּשׁוֹת. This is not a blanket conversion to standard full pointing.
- Use the explicit standard unpointed spellings and proposed English answers/alternatives in catalog.proposed.json. These are newly prepared answer-key text, not claimed to be verbatim course material.
- Use the collected Academy-based missing verb completions and the three separately identified derived בשביל completions. Keep each provenance label.
- Display the proposed common modern variants. Retain other reference forms as review alternatives rather than silently adding them to this release's acceptance lists.
- For את, reveal אתכם/אתכן and accept the attested colloquial אותכם/אותכן. For מ־, reveal מכם/מכן and accept ממכם/ממכן. Preserve the source first-plural display with explicit unpointed מאיתנו; ממנו is not added as a first-plural alternative.
- Include action nouns למידה, מגורים, יציאה, דיבור, כניסה, התלבשות, הסתכנות, הרגשה, הכרה, העברה with the meanings in DECISIONS.md. Hold only רצה's proposed רצייה (volition/wanting); do not replace it with רצון without a sense decision.

All other values are exactly the copied catalog.proposed.json and FULL_KEY.md. DECISIONS.md preserves the author's full alternatives. Approval of this recommendation would authorize the above 508-record release key for both versions and its necessary integration/installation verification, not edits to original course tables.

## Verification boundaries

Leo reran verify_key.mjs: 509 structural records, complete inventory mapping, 12 unchanged evidence inputs, 1,018 answer checks and 3,054 distractor exclusions passed. The proposed catalog retains held status. This is not independent attestation of every newly authored linguistic string. Source and destination copies of all five review files match SHA256.

Earlier Leo independently reran 39 focused implementation tests successfully. Current WordPress access code was inspected and matches the documented existing signed-in flashcard audience, with an optional stricter site restriction. Lead reports private main 3d01088 and both code-branch CI checks passed; final main Local CI is scheduled for one follow-up at 15:10 Israel. Neither version has conjugation installed.

After Guy's exact content decision, Lead owns packaging, preserved installation and independent destination verification for both versions; Leo owns the final consolidated verification and delivery.
