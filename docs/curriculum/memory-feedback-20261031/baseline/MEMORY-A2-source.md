# MEMORY-A2 — current implementation source

Source: https://docs.google.com/document/d/1ZC5w2lc89mwGQ1AtwMVQAKwwoaD8GU3PaCNmPPcgtYY/edit

001 · How memory works — MEMORY-A2
Content: Revised draft · Approval: Guy authorised local software implementation for testing; adapted wording remains reviewable · Built version: pending · Verified version: pending · Revision: 4 (30 October 2026)
OUTCOME: Experience the contrast between an unstructured number and meaningful dates; distinguish chunking, logical constraints and connections to established knowledge.
CONNECT TO: Familiar dates illustrate three useful principles. All three will return with Hebrew roots and patterns; the immediate focus is connecting new information to established old information.
PREREQUISITES: None.
PLAN: https://docs.google.com/spreadsheets/d/1jlSH8qDBt3nwv90J_2IKkL-pzbRx3USW522KqtXR0Nc/edit#gid=102626001&range=A4:M4
SOURCES / ADAPTATION: Guy’s original presentation, slides 7–9 (0704177609112001, ten seconds and date associations), with the letter connection on slide 10: https://drive.google.com/file/d/1ImMGqVDWT8BMN63xay1-DT7ug3Z1W9mr/view. Guy’s 30 October comments define the demonstration, click-revealed principles, optional comparison and application-based check. Preserve his latest directly edited introduction and Adam account. The redundant optional network explanation has been removed. “Memory hooks” and the replacement question are adapted wording for his review.
DESIGN DECISIONS: One initial attempt demonstrates the difficulty; the date reveal then offers a helpful way to organise the same digits. Reveal the three principles individually on clicks, with bold titles. One comprehension question tests their use rather than their names. A later recall/comparison is entirely optional. Neither attempt has a retry loop, pass threshold or mastery requirement. No extra vocabulary or application exercise is needed. Implement these interactions in the local software for Guy to test; document readback alone is not evidence of implementation.
Learn — exact text and embedded interactions
Screen 1: Welcome to Hebleo · MEMORY-A2.learn.try-first
LEARNER TEXT:

Welcome to Hebleo, the smart way to learn Hebrew. This course is the result of a 10+ year long journey, combining many years of experience in:
Learning languages independently on a self-paced basis and seeing what works and what doesn’t first-hand,
Teaching Hebrew as a tutor and developing materials along the way, optimizing them with each new student with different approaches, and seeing what works well long-term
Getting an M.Sc. in Cognitive Science. It has helped me understand how to optimize learning in general and language learning in particular.
[NEXT PAGE — learner selects Continue]
Screen 2: Adam · MEMORY-A2.learn.adam-study
This led to a case study I did with a student named Adam. He came to me with Zero Hebrew knowledge, but similar scientific background. After I explained the method to him, he became intrigued and we decided to test how long it would take him to get to a level where we would be able to generally hold Hebrew conversations together. For an English speaker learning Hebrew, this usually takes around 500 hours. For Adam, using the methodology that is at the core of Hebleo, it took around 70 hours. This means that his pace was over 7x higher than the norm.
Let’s briefly demonstrate some of the underlying concepts used in the course that improve your learning and memory. Understanding them can help you use them in your personal life as well!

[NEXT PAGE — learner selects Continue]
Screen 3: A quick memory experiment · MEMORY-A2.learn.number-round
LEARNER TEXT:
Let’s try a quick experiment. I’m going to show you a number for ten seconds. Try to remember as much of it as you can without writing it down. When it disappears, type what you remember.
Ready? Press Play to begin.
[PLACEHOLDER / AUTHOR INSTRUCTION] TIMED DISPLAY MEMORY-NUMBER: show the exact string 0704177609112001 for 10,000 ms after Play, then hide it before enabling recall. Display digits left to right; do not show dates, event labels, grouping or the answer before the first attempt. Never autoplay.
[PLACEHOLDER / AUTHOR INSTRUCTION] CONTROL: Play once → ten-second display → one ungraded attempt or “Show me how” → explanation. Do not offer replay, hints or repeated attempts to get the number right. Do not require a complete or correct answer to continue. The intended contrast is difficulty first, then a helpful way to organise the same information. If a learner remembers it, acknowledge that honestly. For nonvisual access, present the digits once through an on-demand spoken sequence, then offer the same explanation. A learner may skip the timed attempt and go straight to the explanation. If navigation interrupts the display, allow continuing to the reveal without a restart requirement.
MEMORY-A2.embedded.number-first — typed recall
LEARNER PROMPT: How much of the number can you remember? Enter whatever comes to mind, or select Show me how.
ANSWER / AUTHOR REFERENCE: 0704177609112001. Keep this as a string. Store the learner’s attempt for the later comparison, but do not score it, show correction messages, or ask for another attempt here. The reveal on the next screen supplies the answer.
FEEDBACK after a partial or empty attempt: “That was a lot of digits to hold in mind! Let me show you a way to make sense of them.”
FEEDBACK after the complete number: “You remembered it. Now let me show you a way to organise the same information.”
[AUTHOR INSTRUCTION] Both responses proceed directly to the date reveal.
[NEXT PAGE — learner selects Continue]
Screen 4: Give the number meaning · MEMORY-A2.learn.connection
LEARNER TEXT:
That was quite a lot of digits to remember! Most people can get up to half of it, and certainly wouldn’t remember it in 1 month. Now watch what happens when we think about the same number differently.
[PLACEHOLDER / AUTHOR INSTRUCTION] ANIMATION MEMORY-NUMBER-TO-DATES: on Show the connection, start with 0704177609112001. Keep all sixteen digits in the same order and separate them into 07041776 · 09112001. Then insert slashes to produce 07/04/1776 · 09/11/2001. Only spacing and separators change; no digits appear, disappear or swap places. Reveal the event labels after the transformation. Reduced-motion and nonvisual alternatives present the same three stages with a Next step control and a short spoken/text description. Replaying this explanatory animation is allowed; it does not restart the recall task.
07/04/1776 · 09/11/2001
These dates use American month–day–year order: July 4, 1776, and September 11, 2001.
The first is the date of the American Declaration of Independence; the second is the date of the September 11 attacks. For most people, assuming these dates are familiar to you, not only would you easily remember them now, but would probably be able to recite them in order in a month.
We haven’t changed any of the digits though, so what changed?
What changed is our interpretation, or framing, of the information, which makes it easier to remember due to 3 concepts:
[AUTHOR INSTRUCTION] REVEAL MEMORY-PRINCIPLES: start with all three principles hidden. Each learner click on “Show the next idea” reveals one complete principle in order: Chunking, Logical constraints, Memory hooks. Bold each title. Keep earlier principles visible; after the third, remove the reveal control and offer Continue. No automatic advance or animation timer. Use a native button, announce each new item, retain keyboard focus and respect reduced motion.
Chunking: instead of trying to hold sixteen separate digits in mind, we can think of two meaningful units—the two dates. Each date still contains several digits, but we can treat it as one item.
Logical constraints: a date has a structure, and that structure limits the possibilities. A month must be between 01 and 12, so 19 cannot be the month. A day cannot be 47. Knowing the format helps us rule out possibilities instead of treating every digit as completely open.
Memory hooks: if you already know these events and their dates, the number connects to knowledge you already have. If the events are unfamiliar, this particular connection will be less useful to you, even though the grouping and date structure may still help.
[NEXT PAGE — learner selects Continue]
Screen 5: What made the difference? · MEMORY-A2.learn.meaning
LEARNER TEXT:
While we’ll use all 3 principles to enhance our learning, right now I want to focus on the third one: connecting new information to established old information. You already have a great deal of knowledge to build on from your life experience. A useful connection gives the new information a place in that knowledge. At first we’ll connect brand new Hebrew concepts to things you’re already familiar with from English, and as we move forward we’ll connect new Hebrew concepts to older Hebrew concepts you’re already comfortable with.
All three principles will come back throughout the course. Let’s check what they mean in practice.
MEMORY-A2.embedded.what-changed — multiple choice
LEARNER PROMPT: Imagine you recognise the number as two dates, but neither event is familiar to you. What could still help you remember it?
OPTIONS:
A. Memorise the names of the three memory principles.
B. Use the two date groups and what you know about how dates work.
C. Attach an event name to each date, even if neither event means anything to you.
ANSWER / ACCEPTED MODEL: B. Use the two date groups and what you know about how dates work.
FEEDBACK after A: “Knowing the names doesn’t help you recover these digits. Try using the grouping and date structure instead.”
FEEDBACK after B: “Yes. Two date groups give you larger units to work with, and the date format limits the possibilities. Those can still help even when the events are unfamiliar.”
FEEDBACK after C: “An unfamiliar event name adds something else to remember. A useful memory hook connects the new information to something you already know.”
[AUTHOR INSTRUCTION] This is the only comprehension question in the lesson. It checks how the ideas work, not recall of their names. Show the authored feedback for the selected option and the explanation for B after submission. Permit Continue without a compulsory repeat round.
[NEXT PAGE — learner selects Continue]
Screen 6: Notice the difference (optional) · MEMORY-A2.learn.return
LEARNER TEXT:
If you’d like to try the comparison, bring the number back to mind once more. Think of the two dates and enter what you remember, without looking back. You can also skip this step and continue to the next lesson.
If you try it, compare your attempts and notice whether grouping, the date format, or the familiar events helped. We’ll use the same ideas throughout the course, starting with familiar images that help us remember Hebrew letter shapes and sounds.
MEMORY-A2.embedded.number-return — typed recall (optional)
LEARNER PROMPT: With the two dates in mind, what can you now recall? Enter an attempt, select Show the comparison, or skip this step.
[AUTHOR INSTRUCTION] OPTIONAL COMPARISON: offer “Try the comparison” and “Continue without it” before showing the activity. Both paths permit completion; no response, reveal or comparison is required. Keep Skip available after opening it. If opened, do not add a second timed display or recall Replay/Try again button. Hide earlier dates until submission or Show the comparison, then show the original number, the dates and any attempts actually made. Never invent an attempt. Give the specific feedback below when supported by the input, followed by Continue for every outcome. The exact number is an author comparison model, not a passing requirement.
ANSWER / AUTHOR REFERENCE: 0704177609112001; grouped display 07041776 · 09112001; date display 07/04/1776 · 09/11/2001. Spaces and date separators alone do not change the answer. Preserve the raw response so formatting can be explained without losing the learner’s input.
FEEDBACK — exact digit sequence, with or without separators: “That’s the original sequence. Notice which part of the connection helped you bring it back.”
FEEDBACK — dates in reverse order, e.g. 09112001 · 07041776: “You recalled both dates, but swapped their order. The original starts with July 4, 1776, then September 11, 2001.”
FEEDBACK — omitted month/day zeroes, e.g. 7/4/1776 · 9/11/2001 or 7417769112001: “You recalled the dates. In the original display, months and days use two digits: 07/04 and 09/11. Those zeroes are part of the original sequence.”
FEEDBACK — day/month order, e.g. 04/07/1776 · 11/09/2001: “You used day–month–year. These are the same dates; the demonstration uses month–day–year, so its sequence begins 07/04/1776.”
FEEDBACK — other partial or different response: “Here’s the original number alongside your attempt. Compare the two date groups and notice which parts came back to you.”
FEEDBACK — no attempt: “Here are the two dates within the original number. Notice how the grouping, format and familiar events can help you make sense of it.”
[AUTHOR INSTRUCTION] Explain every clearly identifiable difference, including combined reversed-date/omitted-zero cases. Only label a response as the right dates when it matches a known equivalent form of those dates; do not guess from an arbitrary digit string. If the order of individual digits differs, highlight the differing groups against the model. No feedback asks for correction or another attempt; all paths continue.
[NEXT PAGE — learner selects Continue]
Vocabulary — current learner display and author reference
No new vocabulary entries in this lesson. Letter shapes, sounds or memory materials are taught in Learn and practised in the exercises; do not add a lexical quota.
Continue — learner text
You’ve seen how grouping, logical constraints and familiar knowledge can make the same information easier to work with. Next, we’ll start with that third idea: using familiar concepts from English to help you learn your first four Hebrew letters. See you in the next lesson!
Author review and implementation record
AUTHOR REVIEW: Guy’s direct prose edits are retained, including removal of the proficiency-level parenthesis and his English-to-known-Hebrew progression. The first recall demonstrates difficulty; a later optional attempt offers comparison without a memorisation requirement. Review the adapted label “Memory hooks”, the application question and targeted response feedback. Verify click-by-click principle reveal, animation, hidden answers, skip paths and accessibility in the installed software. Guy’s 500/70-hour account remains supplied author content; this task does not independently validate it.
Approval revision/date: Guy authorised local implementation for testing on 30 October 2026; comments applied; adapted wording remains reviewable · Course lesson/version: pending · Verification evidence: document readback complete; software implementation pending.
