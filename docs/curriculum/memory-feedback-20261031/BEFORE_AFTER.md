# Exact before / after text

Before is the inspected source pack matching the previously installed revision-5 pack hash. After is an editorial integration specification; it has not been installed or written into the authoring master. Complete exact fields, including the removed quiz, are in BEFORE_AFTER.json.

## MEMORY-A2.learn.try-first

Keep identity; revise copy/presentation.

Before heading: Welcome to Hebleo

Before body:

> Welcome to Hebleo, the smart way to learn Hebrew. This course is the result of a 10+ year long journey, combining many years of experience in: Learning languages independently on a self-paced basis and seeing what works and what doesn’t first-hand, Teaching Hebrew as a tutor and developing materials along the way, optimizing them with each new student with different approaches, and seeing what works well long-term Getting an M.Sc. in Cognitive Science. It has helped me understand how to optimize learning in general and language learning in particular.

After heading: Welcome to Hebleo

After body:

Welcome to Hebleo, the smart way to learn Hebrew. I’ve spent over ten years bringing together three kinds of experience:

1. Learning languages independently and seeing what works first-hand.

2. Teaching Hebrew and refining my materials with each student.

3. My M.Sc. in Cognitive Science, which helped me understand how to improve learning, especially languages.

## MEMORY-A2.learn.adam-study

Keep identity; revise copy/presentation.

Before heading: Adam

Before body:

> This led to a case study I did with a student named Adam. He came to me with Zero Hebrew knowledge, but similar scientific background. After I explained the method to him, he became intrigued and we decided to test how long it would take him to get to a level where we would be able to generally hold Hebrew conversations together. For an English speaker learning Hebrew, this usually takes around 500 hours. For Adam, using the methodology that is at the core of Hebleo, it took around 70 hours . This means that his pace was over 7x higher than the norm. Let’s briefly demonstrate some of the underlying concepts used in the course that improve your learning and memory. Understanding them can help you use them in your personal life as well!

After heading: Welcome to Hebleo

After body:

One of my students, Adam, started with no Hebrew and a similar scientific background. We tested how long it would take him to hold conversations with me in Hebrew.

For an English speaker, this usually takes around 500 hours. Using the method at the core of Hebleo, Adam took around 70 hours—over seven times faster.

Let’s try a short demonstration. These ideas can help you learn beyond this course, too.

## MEMORY-A2.learn.number-round

Keep identity; revise copy/presentation.

Before heading: A quick memory experiment

Before body:

> Let’s try a quick experiment. I’m going to show you a number for ten seconds. Try to remember as much of it as you can without writing it down. When it disappears, type what you remember. Ready? Press Play to begin.

After heading: A quick memory experiment

After body:

Press Play to see a number for ten seconds. Remember as much as you can without writing it down. When it disappears, type what you remember.

Before prompt: How much of the number can you remember? Enter whatever comes to mind, or select Show me how.

After prompt: What do you remember? Enter an attempt, or select Show me how.

## MEMORY-A2.learn.connection

Keep identity; revise copy/presentation.

Before heading: Give the number meaning

Before body:

> That was quite a lot of digits to remember! Most people can get up to half of it, and certainly wouldn’t remember it in 1 month. Now watch what happens when we think about the same number differently.

After heading: How memory works

After body:

Let’s give the same digits some meaning.

Before date explanation:

> These dates use American month–day–year order: July 4, 1776, and September 11, 2001. The first is the date of the American Declaration of Independence; the second is the date of the September 11 attacks. For most people, assuming these dates are familiar to you, not only would you easily remember them now, but would probably be able to recite them in order in a month. We haven’t changed any of the digits though, so what changed? What changed is our interpretation, or framing, of the information, which makes it easier to remember due to 3 concepts:

After date explanation:

American month–day–year order:

July 4, 1776 — the American Declaration of Independence.

September 11, 2001 — the September 11 attacks.

Same digits, different meaning. Three ideas help:

Before: **Chunking:** instead of trying to hold sixteen separate digits in mind, we can think of two meaningful units—the two dates. Each date still contains several digits, but we can treat it as one item.

After: **Chunking:** Think of two meaningful dates instead of sixteen separate digits.

Before: **Logical constraints:** a date has a structure, and that structure limits the possibilities. A month must be between 01 and 12, so 19 cannot be the month. A day cannot be 47. Knowing the format helps us rule out possibilities instead of treating every digit as completely open.

After: **Logical constraints:** A date limits the possibilities: months run from 01 to 12, and a day cannot be 47.

Before: **Memory hooks:** if you already know these events and their dates, the number connects to knowledge you already have. If the events are unfamiliar, this particular connection will be less useful to you, even though the grouping and date structure may still help.

After: **Memory hooks:** Connect new information to established old knowledge. If you know these events and their dates, they give the digits something familiar to connect to. If not, grouping and date structure can still help.

## MEMORY-A2.learn.meaning

Keep page; remove quiz; insert optional section.

Before heading: What made the difference?

Before body:

> While we’ll use all 3 principles to enhance our learning, right now I want to focus on the third one: connecting new information to established old information. You already have a great deal of knowledge to build on from your life experience. A useful connection gives the new information a place in that knowledge. At first we’ll connect brand new Hebrew concepts to things you’re already familiar with from English, and as we move forward we’ll connect new Hebrew concepts to older Hebrew concepts you’re already comfortable with. All three principles will come back throughout the course. Let’s check what they mean in practice.

After heading: How memory works

After body:

We’ll use all three principles, starting with memory hooks: connecting new information to established old knowledge. First, we’ll build on things you know from English. Later, we’ll connect new Hebrew concepts to Hebrew you’ve already learned.

Before prompt: Imagine you recognise the number as two dates, but neither event is familiar to you. What could still help you remember it?

After prompt: (removed; no replacement quiz)

The original quiz prompt above, all three options, answer B and all feedback are removed, not replaced by the optional-comparison prompt. The comparison retains its separate existing activity identity. See baseline/MEMORY-A2-runtime.json for the full removed object.

## MEMORY-A2.learn.return

Retire from top-level order; move intact activity into preceding page.

Before heading: Notice the difference (optional)

Before body:

> If you’d like to try the comparison, bring the number back to mind once more. Think of the two dates and enter what you remember, without looking back. You can also skip this step and continue to the next lesson. If you try it, compare your attempts and notice whether grouping, the date format, or the familiar events helped. We’ll use the same ideas throughout the course, starting with familiar images that help us remember Hebrew letter shapes and sounds.

After heading: (no separate page)

After body:

Moved as the collapsed optional section of MEMORY-A2.learn.meaning. Exact prompt and feedback are in LEARNER_COPY.md.

Before prompt: With the two dates in mind, what can you now recall? Enter an attempt, select Show the comparison, or skip this step.

After prompt: (relocated; see optional section)

## MEMORY-A2.continue

Keep identity; revise copy/presentation.

Before heading: Continue

Before body:

> You’ve seen how grouping, logical constraints and familiar knowledge can make the same information easier to work with. Next, we’ll start with that third idea: using familiar concepts from English to help you learn your first four Hebrew letters. See you in the next lesson!

After heading: Continue

After body:

Next, we’ll use familiar concepts from English to learn your first four Hebrew letters. See you in the next lesson!
