---
version: alpha
colors:
  ink: "#0A2457"
  primary: "#0170B9"
  hover: "#005b98"
  cyan: "#72CEF4"
  paper: "#FFFFFF"
  canvas: "#FAFBFD"
  selection: "#EAF5FC"
  muted: "#526174"
  border: "#D6D9DD"
typography:
  ui:
    fontFamily: '"Segoe UI", Arial, sans-serif'
    fontSize: 16px
    lineHeight: 1.5
  hebrew:
    fontFamily: '"Segoe UI", Arial, sans-serif'
    fontSize: 28px
    lineHeight: 1.65
rounded:
  control: 8px
spacing:
  cardGap: 16px
  footerGap: 32px
  footerPadding: 24px
components:
  buttonPrimary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
  buttonPrimaryHover:
    backgroundColor: "{colors.hover}"
    textColor: "{colors.paper}"
  body:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.ui}"
  secondary:
    backgroundColor: "{colors.selection}"
    textColor: "{colors.ink}"
  mutedText:
    textColor: "{colors.muted}"
  heroEyebrow:
    textColor: "{colors.cyan}"
---
# Hebleo selected application design

## Overview

The course is the spine. Quiet, seamless teaching prose and a clearly bounded current question carry attention. The blue palette, horizontal main navigation, separate course outline and wide authentic logo follow the selected Oct13 prototype and its application handoff; they supersede the prior Oct12 two-rail shell. This is a product surface for Hebrew learners and authors, using the existing application, source content and permissions.

The wide header artwork is the signature. Guy's supplied original navy PNG is installed unchanged at public/assets/hebleo-wide-navy.png (3693x1198,137630 bytes,SHA256 D744D37A3A10F315D58372B3A8F557B2913C04F6D6065C4F15AE26FC10789971). Both app and Google setup use the image in the160px wide home link with intrinsic dimensions, height:auto/object-fit:contain and preserved transparency. The decorative image has empty alt; the home link supplies its accessible name. No recoloring, reconstruction, crop or emblem-only substitution. The placeholder is removed; rendered legibility remains for UX critique.

## Colors

Runtime Model B: public/refinement.css owns the shared tokens listed above. This document mirrors them. Legacy base styles load first; refinement adapts every application route, Studio component and Google setup. Semantic danger, warning and correctness states retain their meaning. Inline source colors and authored emphasis keep precedence and are not remapped to UI colors.

## Typography

UI text is 16px/1.5 with headings 26–36px/1.23. Hebrew is 28px/1.65, with larger authored practice and review forms. Existing locally available fonts remain; no font download. Mixed Hebrew/English uses the existing rich renderer and bidi boundaries. Exact Nikkud, explicit full/unpointed/curated forms and source rich runs stay canonical.

## Layout

Persistent white header: one left course-outline toggle on course/lesson routes; wide home-link slot; wrapping horizontal real destinations; actual fictional profile selector. Main navigation never becomes a collapsed rail. The separate course rail is 248px; folding gives its entire track to the content. Toggle mutates layout/state only, preserving mounted answers/editors and learner/source records. Below960px, the same toggle opens a course drawer; header controls remain available, background content is inert, and dismissal returns focus.

Teaching prose, current question, portion strip, progress and lower navigation use a 760px measure. Vocabulary/media can use wider space up to1200px. Lower navigation has a32px gap, divider and24px upper padding. My Hebrew filters share a compact band and retain50-row pages. Cards are independent white items with16px gaps; Table renders the identical filtered source set with full-field/entry access. Studio retains six real tasks and its mounted editors; native tab keys preserve unsaved title/text. Tables own horizontal overflow; forms use natural document height.

## Elevation & Depth

Read-only teaching prose is unboxed. Cards, editable fields and controlled dialogs have restrained borders and8px corners. Overlays remain above content; the keyboard dock retains source geometry and reserved space. No extra ornamental shadows or decorative gradients are introduced.

## Shapes

Radius8px for controls, Cards and dialogs. At least42px header controls. Small contextual support controls retain intrinsic widths. Nikkud and pedagogical keyboard highlights retain their source-purpose shape and colors.

## Components

The actual learner renderer, vocabularyTable/wordCard, unified Studio, EasyMDE and owner keyboard remain canonical. Studio shows one title editor at its display location, editable content at its location, explicit Add/Edit/Reuse and shared-reference impact. Check stays inside the current question; lower Continue appears after feedback. Concept help is inline and does not remount the answer. Native select popup behavior is intentionally retained; there is no authored popup geometry claim.

Global scrollbars inherit thumb/track/hover/active tokens with forced-colors fallback. Accessible labels/current/expanded state, native tab semantics, focus indicators and reduced-motion rules are preserved. All profile, note, anonymity, source/session/revision and publishing contracts remain in UX-CONTRACT.md and the existing architecture documents.

## Do's and Don'ts

Use real routes and source records. Preserve unknown source fields, immutable IDs, authored responses and rich emphasis. Keep synthetic demo labels visible. Never install prototype grading/profile/media simulations as application behavior. No curriculum, scheduler, production identity or entitlement redesign.

This candidate has source/DOM/HTTP evidence only. Native rendered layout, real physical keyboard/touch,200% zoom, logo readability and Guy acceptance remain open under the person-control pause. Mobile/physical acceptance is deferred to the APK decision. Audio-speed work and testing remain DEFERRED in every phase.

## Prior checkpoint context

Oct12 private notes, comments/replies and Studio state improvements remain implemented. The two-rail navigation geometry is superseded by the selected Oct13 shell; historical reports and Guy-result cells remain unchanged. The Masterfile-ID importer remains a separate unactivated revision; this design change does not establish live Sheet capture/import or source readiness.


## Oct14 refinement of the selected design

The approved horizontal shell/navy artwork remain. Runtime refinement.css owns200ms directional course-rail/grid motion (off for OS/app reduced motion),8px Studio label gaps/20px group gaps, joined-prefix inward padding3px, compact32px result icons and a stable48px answer action/status region. Main question DOM survives grading; local dock reserve offsets keyboard collapse. Structured authored examples receive intact RTL and LTR lines; unknown fields remain lossless. Cards/table retain the same source/filter membership and contained table overflow. One speed selector belongs to each playable media surface. Private pronunciation practice sits outside the flashcard/rating body; actual nonlinguistic demo audio stays explicitly labelled. Rating colors and broader vocabulary architecture remain pending. Audio controls/fixture functionality is now authorized; speed-quality/playback-rate testing remains DEFERRED. No broad redesign or native visual acceptance is implied.

## Oct18 consolidated vocabulary

For the versioned lexical envelope, lexical-vocabulary.js/.css extend the existing learner renderer and shared controls with separate Nouns, Adjectives, Verbs, Prepositions and Other tables. Neutral verb citations are independent of expanded masks. Forms precede the green Note/Examples strip, Root/Pattern stay continuously tinted, and both sticky column offsets are measured. Seven preposition forms remain horizontal; only ten can choose the Compact vertical alternative when measured overflow requires it. Source colors and exact runs remain authored content. Studio lexical-settings.js shares workspace Save/CAS/rehearsal and natural document scrolling. Private comparison sliders and border-demo preferences do not become learner settings. Native geometry remains unverified under the mounted browser consent refusal.

### Oct18 owner correction: citation display

Hebrew word cells and combined verb citations explicitly use Hebrew and RTL; English entry/review/media actions retain their own LTR boundary. The past–present semantic sequence and hyphen stay fixed. Citation headings alone remove teaching foreground colours from a detached display projection, including cell defaults and UTF-16 runs. Source strings, original styles/runs, other emphasis and expanded teaching colours remain unchanged. Heading direction overrides conflicting source-cell direction only for that display. This is the explicit citation exception to ordinary authored-colour precedence.
