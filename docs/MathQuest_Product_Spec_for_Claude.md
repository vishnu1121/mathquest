# MathQuest
## Product Specification for a K–5 Adaptive Math Adventure

> **Original vision, not an implementation checklist.** For the actual eight-chapter build, verification, technical constraints and latest owner direction, start with [PROJECT_STATE.md](PROJECT_STATE.md) and [CLAUDE.md](../CLAUDE.md). The current adventure does not implement every adaptive or mastery feature described below. The owner now wants an active AI main feature; the proposals in [AI_PLAYBOOK.md](AI_PLAYBOOK.md) remain unselected and unimplemented. This specification is preserved as a reference.

**Document purpose:** This document is intended to serve as the primary product and UX specification for building **MathQuest** in Claude or another AI-assisted development environment.

**Scope of this document:** Product vision, user experience, learning flow, adaptive behavior, AI usage, game design, UX principles, MVP priorities, edge cases, success criteria, and implementation guidance at the product level.

**Explicitly out of scope:** Technology stack, infrastructure, hosting, database selection, framework selection, deployment architecture, and vendor-specific implementation choices.

---

# 1. Executive Summary

MathQuest is a K–5 adaptive math learning experience presented as a lightweight adventure game.

The core product idea is simple:

> **The child's progress through the game world should reflect their actual math mastery.**

The student explores themed regions, solves math challenges, receives feedback and hints, earns rewards, unlocks areas, and completes boss challenges.

Under the surface, the product continuously learns from the student's performance and adapts:

- what concept appears next,
- how difficult the next challenge should be,
- whether the learner needs review,
- whether a hint should be offered,
- whether a concept is ready to be marked as mastered,
- whether a previously learned concept should return for review.

The experience should feel to the child like an adventure.

The system should behave like an intelligent tutor.

---

# 2. Product Vision

## Vision statement

Create a math learning experience that makes practice feel like progression through a game world while continuously adapting to each learner's strengths, weaknesses, and pace.

## Product promise

For the learner:

> "The game meets me where I am, helps me when I struggle, and rewards me when I improve."

For a parent or teacher:

> "The product does not just show scores. It reveals what the child understands, where they struggle, and what they should practice next."

---

# 3. Product Problem

Traditional math practice products often have one or more of these problems:

- Every learner receives the same sequence.
- Difficulty changes only by grade level.
- Wrong answers receive shallow feedback.
- Progress is based on completion rather than mastery.
- Gamification is detached from learning.
- Students can grind easy questions for points.
- Strong learners become bored.
- Struggling learners become frustrated.
- The system records incorrect answers without understanding recurring patterns.
- The child feels like they are doing a worksheet with game visuals added on top.

MathQuest should solve this by tightly connecting:

**learning state + game progression + adaptive practice + support + rewards**

---

# 4. Target Users

## Primary user

K–5 learner.

The experience must support broad variation in:

- reading ability,
- math ability,
- attention span,
- grade level,
- confidence,
- familiarity with digital games,
- willingness to ask for help.

## Secondary users

Optional future audiences:

- parents,
- teachers,
- tutors,
- intervention specialists.

For the hackathon MVP, the learner experience is the priority.

---

# 5. Product Principles

These principles should guide every design decision.

## 5.1 Learning first

The game exists to make learning more engaging.

Game mechanics should support learning rather than distract from it.

## 5.2 Progress should represent mastery

The child should unlock important milestones by demonstrating understanding, not just by clicking through content.

## 5.3 Wrong answers are useful information

A wrong answer is not only a failure state.

It is evidence about:

- concept understanding,
- misconception patterns,
- confidence,
- fluency,
- the need for a visual model,
- the need for an easier prerequisite.

## 5.4 Hints should preserve thinking

The system should not immediately reveal answers.

It should scaffold the learner toward the answer.

## 5.5 Adapt continuously

The learning experience should respond to performance within the session, not only after a test.

## 5.6 Avoid punishment

Failure should lead to support, not shame or harsh penalties.

## 5.7 Keep the interface age-appropriate

The learner should not need to understand mastery percentages, adaptive algorithms, AI, learning analytics, or technical terminology.

## 5.8 AI should assist, not control correctness

AI may personalize language, explanations, and content variation.

Core math correctness, reward logic, progression rules, and critical safety behavior should remain reliable and rule-bound.

---

# 6. Core Product Loop

```text
ENTER ADVENTURE
      ↓
RECEIVE CHALLENGE
      ↓
ANSWER
      ↓
EVALUATE RESPONSE
      ↓
UPDATE LEARNER STATE
      ↓
DECIDE WHAT THE LEARNER NEEDS NEXT
      ↓
PROVIDE:
- next challenge
- easier challenge
- harder challenge
- hint
- explanation
- review
      ↓
REWARD PROGRESS
      ↓
ADVANCE THROUGH THE WORLD
```

The game loop and the learning loop should be the same loop.

---

# 7. High-Level User Journey

## First session

```text
Welcome
  ↓
Choose avatar
  ↓
Select / confirm grade
  ↓
Short diagnostic
  ↓
Create initial learner profile
  ↓
Enter adventure map
  ↓
Start recommended region
  ↓
Solve challenges
  ↓
Receive adaptive support
  ↓
Complete mini-goal
  ↓
Earn reward
  ↓
View progress
```

## Returning session

```text
Welcome back
  ↓
Show current adventure progress
  ↓
Offer recommended next activity
  ↓
Include short review of prior skills if appropriate
  ↓
Continue adventure
  ↓
Update mastery
  ↓
Unlock / reinforce
```

---

# 8. Adventure Representation

## Recommended representation

MathQuest should be presented as a **2D or 2.5D interactive adventure**, not as a full 3D open world.

The adventure is represented through:

- an illustrated world map,
- animated characters,
- paths,
- locked and unlocked regions,
- bridges,
- gates,
- treasure chests,
- stars,
- boss encounters,
- changes to the world based on progress.

The adventure should feel visually alive without requiring complex free-roaming gameplay.

## Why this is the right product choice

A full 3D game could become the product focus instead of the learning experience.

For a hackathon, the strongest value comes from demonstrating:

- personalization,
- adaptive learning,
- clear learner progress,
- meaningful game feedback,
- AI-supported tutoring,
- polished interaction.

The world should be beautiful and interactive, but the learning system is the differentiator.

---

# 9. World Structure

Example world:

```text
STARTING VILLAGE
      ↓
🌳 Addition Forest
      ↓
🏜️ Subtraction Desert
      ↓
🏔️ Multiplication Mountain
      ↓
🏰 Division Castle
      ↓
🌋 Fraction Volcano
```

These regions are thematic representations of skill families.

The final product does not need to force all learners through exactly this order.

A learner's recommended path may differ based on diagnostic performance.

---

# 10. Regions

## 10.1 Addition Forest

Possible concepts:

- counting,
- number sense,
- single-digit addition,
- addition within 20,
- two-digit addition,
- regrouping,
- visual addition,
- word problems.

## 10.2 Subtraction Desert

Possible concepts:

- simple subtraction,
- subtraction within 20,
- two-digit subtraction,
- regrouping,
- visual subtraction,
- word problems.

## 10.3 Multiplication Mountain

Possible concepts:

- repeated addition,
- equal groups,
- arrays,
- multiplication facts,
- multiplication patterns,
- word problems,
- larger multiplication for older students.

## 10.4 Division Castle

Possible concepts:

- equal sharing,
- grouping,
- division facts,
- remainders,
- inverse relationship with multiplication,
- word problems.

## 10.5 Fraction Volcano

Possible concepts:

- part-whole relationships,
- identifying fractions,
- visual fractions,
- comparing fractions,
- equivalent fractions,
- fraction number lines,
- basic fraction operations where age-appropriate.

---

# 11. Onboarding

## 11.1 Welcome screen

Goals:

- feel playful,
- minimize text,
- immediately communicate adventure.

Example:

```text
MATHQUEST

Your adventure begins!

Choose your hero:

🧙  🦸  🐱  🧑‍🚀

[START]
```

## 11.2 Avatar selection

The learner selects a character.

The avatar should appear throughout the map, challenge scenes, rewards, boss encounters, and progress moments.

## 11.3 Grade selection

Use simple language.

Example:

> "What grade are you in?"

Do not use this as the only determinant of difficulty.

It is merely the initial calibration input.

---

# 12. Diagnostic Experience

## Objective

Estimate the learner's starting point without making the experience feel like a school test.

## Recommended length

Approximately 8–12 questions for an MVP.

## Diagnostic dimensions

Sample coverage:

- number sense,
- addition,
- subtraction,
- multiplication,
- division,
- fractions,
- word problems.

The exact topics should depend on grade.

## Example

```text
Question 1
5 + 3 = ?

Question 2
14 - 6 = ?

Question 3
4 × 5 = ?

Question 4
20 ÷ 4 = ?

Question 5
Which is larger?
1/2 or 1/4

Question 6
Maya has 8 apples and gives away 3.
How many are left?
```

## Diagnostic output

The system creates an initial learner state.

Example:

```text
Addition          Strong
Subtraction       Strong
Multiplication    Developing
Division          Needs practice
Fractions         Needs practice
Word Problems     Developing
```

Internally, this may correspond to scores or confidence values, but the child should see simple, encouraging language.

---

# 13. Learner Model

The learner model is central to the product.

For each skill, the system should track:

- estimated mastery,
- confidence in the mastery estimate,
- recent accuracy,
- response time,
- number of attempts,
- hint usage,
- difficulty level handled,
- recent mistakes,
- recurring misconceptions,
- last practiced date,
- whether the learner has retained the concept over time.

Example internal concept:

```text
Skill: Two-digit addition with regrouping

Mastery: 0.62
Recent accuracy: 60%
Average attempts: 1.8
Hint usage: High
Trend: Improving
Last practiced: Today
```

The exact math behind this can evolve later.

The product requirement is that learner state must influence the next activity.

---

# 14. Challenge Types

To prevent repetition, use multiple challenge formats.

## 14.1 Direct equation

> 7 + 8 = ?

## 14.2 Multiple choice

> 6 × 4 = ?

> 18 / 20 / 24 / 28

## 14.3 Visual groups

```text
🍎🍎🍎🍎
🍎🍎🍎🍎
🍎🍎🍎🍎
```

Ask:

> How many apples are there?

## 14.4 Drag-and-drop

Examples:

- match fraction to picture,
- group objects,
- place number on number line.

## 14.5 Word problem

> There are 5 baskets with 4 apples in each basket. How many apples are there?

## 14.6 Compare

> Which is larger?

> 3/4 or 2/3

## 14.7 Missing number

> 8 + ? = 13

## 14.8 Mini-puzzle

> Which two numbers combine to make 20?

The product should feel varied while still practicing the intended skill.

---

# 15. Gameplay Scene

A challenge should feel integrated into the adventure.

Example:

```text
🏔️ MULTIPLICATION MOUNTAIN

The bridge is broken.

To repair it:

There are 4 crates.
Each crate has 6 boards.

How many boards are there?

[18] [20] [24] [28]
```

Correct answer:

> The bridge repairs itself.

The learner's character crosses.

This is stronger than simply awarding a point because the math has visible meaning in the world.

---

# 16. Correct Answer Flow

A correct answer should trigger:

1. immediate confirmation,
2. concise positive feedback,
3. visible game response,
4. optional learning reinforcement,
5. progression.

Example:

```text
Great job!

4 × 6 = 24

+10 XP
🔥 Streak 3

The bridge has been repaired!
```

Do not over-celebrate every trivial answer with long animations.

Feedback should remain fast enough that learning momentum continues.

---

# 17. Incorrect Answer Flow

Do not show only:

> Incorrect.

Instead:

```text
Almost — try one more time.

Need a hint?
```

Possible flow:

```text
Wrong answer
   ↓
Encouragement
   ↓
Retry OR request hint
   ↓
Hint 1
   ↓
Retry
   ↓
Hint 2 / visual explanation
   ↓
Retry
   ↓
Simpler related problem if necessary
   ↓
Return to original concept later
```

---

# 18. Hint Ladder

Hints should become progressively more explicit.

## Level 1 — Nudge

> "Think about equal groups."

## Level 2 — Strategy cue

> "Try counting by 6."

## Level 3 — Visual support

```text
6 + 6 + 6 + 6 + 6 + 6 + 6
```

## Level 4 — Guided steps

> "What is 6 × 5?"

Then:

> "What is 6 × 2?"

Then:

> "Can you combine those?"

## Level 5 — Explanation

Provide a concise explanation if the learner remains stuck.

The product should avoid jumping immediately to Level 5.

---

# 19. Adaptive Difficulty

The next challenge should depend on learner behavior.

## Learner is succeeding confidently

Signals:

- several correct answers,
- fast response,
- little or no hint usage.

Response:

- increase difficulty,
- introduce a mixed problem,
- introduce a word problem,
- move toward mastery challenge.

## Learner is struggling

Signals:

- repeated wrong answers,
- slow responses,
- multiple hints,
- repeated misconception.

Response:

- reduce difficulty,
- offer visual representation,
- revisit a prerequisite,
- use a simpler example,
- keep the same skill but change presentation.

## Learner is inconsistent

Response:

- give one or two more diagnostic-style questions before changing level.

---

# 20. Example Adaptive Sequence

Student begins:

```text
6 × 7 → wrong
4 × 8 → correct
7 × 8 → wrong
3 × 9 → correct
```

System interpretation:

> Learner understands multiplication but is weak on higher multiplication facts.

Next sequence:

```text
4 × 6
5 × 7
6 × 6
6 × 7
7 × 7
```

If successful:

```text
7 × 8
8 × 8
word problem using 7 × 8
```

The learner experiences this as natural progression rather than remediation.

---

# 21. Mastery

Mastery should not mean:

> "The learner answered one question correctly."

The system should look for evidence across:

- repeated performance,
- multiple representations,
- different problem formats,
- reasonable independence,
- some retention over time.

Example:

A learner should not master multiplication solely because they answered 6 × 7 correctly once.

They may need to demonstrate the concept through:

- equation,
- visual group,
- word problem,
- delayed review.

---

# 22. Unlocking Rules

Game progression should map to demonstrated understanding.

Example:

```text
Addition Forest
      ↓
Mastery milestone reached
      ↓
Forest Guardian unlocked
      ↓
Boss challenge complete
      ↓
Subtraction Desert opens
```

However, this should not create harsh blocking.

If a child struggles, the product should offer training paths rather than simply saying:

> "You cannot continue."

---

# 23. Boss Battles

Boss battles are milestone assessments disguised as gameplay.

Example:

## Multiplication Mountain Boss

```text
🐉 DRAGON BOSS

Solve 5 challenges to cross the mountain.
```

Challenges can mix:

1. direct multiplication,
2. visual arrays,
3. missing number,
4. word problem,
5. slightly harder challenge.

Each success damages or weakens the boss.

The boss encounter should measure transfer, not memorization of one repeated format.

---

# 24. Boss Failure Flow

A failed boss battle should not feel punitive.

Example:

```text
The dragon got away!

You were strong on:
✓ basic multiplication

Let's train:
→ multiplication word problems
```

Then:

> "Train and return when you're ready."

This converts failure into a clear next step.

---

# 25. Rewards

Possible reward systems:

- XP,
- stars,
- badges,
- character accessories,
- pets,
- map decorations,
- treasure,
- unlockable animations,
- region completion trophies.

Rewards should recognize meaningful behaviors:

- mastery,
- improvement,
- persistence,
- returning to review,
- independent problem solving.

Avoid rewarding:

- random clicking,
- speed alone,
- endlessly repeating easy questions.

---

# 26. World Reactivity

One of the strongest visual ideas is to make the world change as the learner improves.

Example:

Before mastery:

```text
🏔️
🌫️
🔒
Broken bridge
```

During progress:

```text
🏔️
🌤️
Bridge partially repaired
```

After mastery:

```text
🏔️
☀️
✨
Bridge complete
🏰 New area unlocked
```

This visually connects learning progress to adventure progress.

---

# 27. Spaced Review

Previously mastered skills should occasionally return.

Example:

```text
Monday
Learn multiplication

Wednesday
One short multiplication review

Friday
Mixed multiplication + division

Next week
Boss-style mixed review
```

The system should avoid making review feel like regression.

Use framing such as:

> "Bonus challenge"

> "Quick power-up"

> "Memory mission"

---

# 28. AI Role in the Product

AI should be used only where it creates clear product value.

Recommended AI use cases:

1. personalized hints,
2. personalized explanations,
3. misconception interpretation,
4. question variation and generation,
5. conversational tutoring,
6. age-appropriate story/game dialogue,
7. personalized encouragement.

AI should not be required for every interaction.

---

# 29. AI Use Case: Personalized Hints

Inputs may include:

- grade,
- skill,
- question,
- learner response,
- previous mistakes,
- hint level,
- learner history.

Example:

```text
Grade: 4
Skill: Multiplication
Question: 7 × 6
Student answer: 36

Recent mistakes:
6 × 7 → 36
8 × 6 → 42
```

Potential AI hint:

> "You're close. Try counting by 6 seven times."

The hint should be short, age-appropriate, and avoid revealing the answer too quickly.

---

# 30. AI Use Case: Explanation

Question:

> 52 - 27

Student answer:

> 35

The product may infer a regrouping issue.

Possible AI explanation:

> "Let's look at the ones first. We have 2 ones, but we need to take away 7. We can trade one ten for 10 ones."

Then the learner should solve a related problem.

The product goal is not just explanation.

It is explanation followed by another attempt.

---

# 31. AI Use Case: Misconception Analysis

The system should look for patterns.

Example:

```text
52 - 27 → 35
63 - 28 → 45
```

Possible pattern:

> Student may be subtracting the smaller digit from the larger digit in each column instead of regrouping.

Another example:

```text
1/4 vs 1/3
Learner selects 1/4 because 4 is larger than 3.
```

Possible misconception:

> Learner may believe a larger denominator means a larger fraction.

The next activity should specifically address the misconception.

---

# 32. AI Use Case: Question Generation

AI may generate additional question variations when needed.

Example instruction:

```text
Grade: 3
Skill: multiplication
Concept: equal groups
Difficulty: medium
Format: short word problem
```

Possible output:

> "There are 6 bags with 4 marbles in each bag. How many marbles are there?"

However, generated questions must be validated before being shown to the child.

---

# 33. AI Question Validation

Required flow:

```text
Generate candidate question
      ↓
Validate math
      ↓
Validate answer
      ↓
Check ambiguity
      ↓
Check grade appropriateness
      ↓
Check language simplicity
      ↓
Approve
      ↓
Show to learner
```

AI should never be the sole authority on mathematical correctness.

---

# 34. AI Use Case: Conversational Tutor

The learner may ask:

> "Why is 1/2 bigger than 1/4?"

The tutor should respond through guided reasoning.

Example:

> "Imagine two pizzas the same size. One is cut into 2 pieces and the other into 4 pieces. If you get one piece from each pizza, which piece would be bigger?"

Then:

> "So which fraction is larger?"

The tutor should favor guided discovery over long explanations.

---

# 35. AI Use Case: Dynamic Dialogue

AI can personalize game dialogue.

Example:

```text
Forest Guardian:
"Alex, you've almost restored the bridge.
One more challenge!"
```

If the learner struggles:

> "That one was tricky. Try breaking the problem into smaller steps."

This makes the world feel responsive without allowing AI to control core game logic.

---

# 36. What AI Should NOT Control

Do not delegate these entirely to an LLM:

- mathematical correctness,
- scoring,
- XP calculations,
- game state,
- mastery thresholds,
- safety rules,
- access permissions,
- boss completion,
- critical progression decisions without guardrails.

AI can provide suggestions.

The product system should enforce outcomes.

---

# 37. Learner-Facing Progress

Avoid showing overly technical analytics.

Good:

```text
Multiplication
⭐⭐⭐☆☆

Almost mastered!
```

Or:

> "You're getting stronger at multiplication."

Not ideal for young learners:

```text
Mastery probability: 0.673
Confidence interval: ...
```

---

# 38. Parent / Teacher Progress View

Optional for MVP.

Possible summary:

```text
Alex's Learning Summary

Strong
✓ Addition
✓ Subtraction

Developing
→ Multiplication

Needs Support
⚠ Division

Common challenge
Word problems

Recommended next focus
Division using visual equal groups
```

A parent/teacher view should answer:

- What does the learner understand?
- Where are they struggling?
- Are they improving?
- What should they practice next?

---

# 39. Return Session Experience

When the learner returns:

```text
Welcome back, Alex!

Yesterday you repaired the bridge.

Today's mission:
Reach the top of Multiplication Mountain.

Bonus power-up:
2 quick review challenges
```

The experience should feel continuous.

Avoid making every session start like a new course.

---

# 40. Motivation Design

Use:

- progress visibility,
- small wins,
- achievable goals,
- curiosity,
- map discovery,
- character growth,
- collectibles,
- meaningful unlocks.

Avoid over-relying on:

- excessive streak pressure,
- loss aversion,
- harsh failure animations,
- constant popups,
- manipulative countdowns.

The child should feel motivated to learn, not anxious about preserving a game metric.

---

# 41. Accessibility and Child-Friendly UX

Important considerations:

- large tap targets,
- minimal reading for younger grades,
- optional audio instructions,
- clear visual hierarchy,
- no dense menus,
- no long paragraphs during play,
- consistent controls,
- low cognitive load,
- strong contrast,
- visual representations for abstract concepts,
- avoid relying only on color to convey correctness,
- allow retry without embarrassment.

---

# 42. Example End-to-End User Story

Alex is a 4th-grade learner.

## Step 1

Alex enters the app and chooses an explorer avatar.

## Step 2

Alex completes a short diagnostic.

The product determines:

```text
Addition         Strong
Subtraction      Strong
Multiplication   Developing
Division         Needs practice
```

## Step 3

The map recommends:

> Multiplication Mountain.

## Step 4

Alex solves:

> 4 × 6 = ?

Correct.

The bridge begins to repair.

## Step 5

Alex solves:

> 7 × 6 = ?

Alex answers:

> 36

Incorrect.

## Step 6

The product notices a possible multiplication fact weakness.

It gives a hint:

> "Try counting by 6."

## Step 7

Alex retries correctly.

## Step 8

The next question remains on the same concept but becomes slightly easier.

## Step 9

Alex gets several in a row correct.

Difficulty increases.

## Step 10

Alex receives a word problem:

> "There are 6 baskets with 7 apples in each basket. How many apples are there?"

Correct.

## Step 11

The learner state improves.

## Step 12

The summit challenge becomes available.

## Step 13

Alex completes the boss battle.

## Step 14

The mountain transforms visually.

```text
☀️
✨
🏔️
🏆
```

## Step 15

Division Castle becomes the recommended next adventure.

This one session demonstrates the entire product concept.

---

# 43. MVP Definition

The MVP should prove the core thesis:

> **Can we create a math game where learner performance meaningfully changes the next experience?**

Do not attempt the entire K–5 curriculum.

## Recommended MVP

### One playable region

**Addition Forest**

### Skills

- simple addition,
- two-digit addition,
- visual addition,
- addition word problems.

### Core product features

- onboarding,
- avatar selection,
- mini diagnostic,
- world map,
- one region,
- adaptive challenge sequence,
- correct answer state,
- incorrect answer state,
- progressive hints,
- learner mastery,
- XP,
- stars,
- one boss battle,
- region completion,
- progress view.

### Recommended AI features

- personalized hint generation,
- personalized explanation generation,
- limited question variation,
- simple misconception identification.

### Optional stretch features

- dynamic dialogue,
- parent dashboard,
- spaced review,
- more than one region,
- audio narration,
- avatar customization.

---

# 44. Hackathon Demo Flow

The demo should be scripted to reveal the intelligence of the product quickly.

## Demo objective

Show:

1. personalization,
2. struggle detection,
3. adaptive support,
4. improvement,
5. visible game progression.

## Demo script

### Scene 1 — Intro

Show MathQuest world.

Explain:

> "Every part of the adventure changes based on what the child understands."

### Scene 2 — Diagnostic

Answer a few questions.

Show that the product selects a starting point.

### Scene 3 — Enter region

Start Addition Forest.

### Scene 4 — Correct answer

Show progression.

### Scene 5 — Intentional mistake

Give a wrong answer on regrouping.

### Scene 6 — Adaptive response

Show:

- learner does not simply receive "wrong",
- personalized hint appears,
- a simpler related example is offered.

### Scene 7 — Recovery

Learner succeeds.

### Scene 8 — Adaptation

The next problem reflects the learner's new state.

### Scene 9 — Boss

Show the milestone challenge.

### Scene 10 — Reward

The environment changes and a new area unlocks.

### Scene 11 — Progress

Show what the system learned about the learner.

This tells a much stronger story than showing many unrelated features.

---

# 45. Product Success Criteria

For the hackathon MVP, evaluate success using product behavior rather than large-scale learning-outcome claims.

## Experience success

- A new user understands what to do without explanation.
- The game loop is clear within one minute.
- A child receives useful feedback after a mistake.
- The next challenge visibly changes based on performance.
- Progress in math causes progress in the game.
- The demo can clearly explain why the product is adaptive.

## Learning-system success

- The product tracks performance by skill.
- Wrong answers influence the next activity.
- Hint usage influences learner state.
- Easy/hard transitions are explainable.
- Mastery is based on multiple observations.

## AI success

- Hints are relevant.
- Explanations are age-appropriate.
- AI does not reveal the answer too quickly.
- AI-generated questions are validated.
- AI failure does not break core gameplay.

---

# 46. Product Risks and Mitigations

## Risk 1 — The game is fun but learning feels shallow

Mitigation: Tie game progress directly to demonstrated skill mastery.

## Risk 2 — The product feels like a worksheet with a cartoon skin

Mitigation: Make math actions affect the game world.

Examples:

- repair bridge,
- unlock gate,
- rescue character,
- defeat boss,
- restore environment.

## Risk 3 — AI gives incorrect math

Mitigation: Validate all mathematical outputs deterministically.

## Risk 4 — AI hints become too verbose

Mitigation: Require short, grade-appropriate hint formats.

## Risk 5 — Learner becomes stuck

Mitigation: Use progressive hinting and prerequisite fallback.

## Risk 6 — Strong learner becomes bored

Mitigation: Accelerate difficulty and offer challenge variants.

## Risk 7 — Child is punished for mistakes

Mitigation: Use mistakes as triggers for support rather than loss.

## Risk 8 — Adaptive logic changes too aggressively

Mitigation: Require several signals before making large difficulty shifts.

---

# 47. Important Edge Cases

## Repeated random answers

Do not interpret fast guesses as mastery.

Possible signals:

- very short response times,
- repeated incorrect taps,
- inconsistent results.

Response: slow progression and introduce guided interaction.

## Slow but correct learner

Do not automatically reduce difficulty only because the learner is slow.

Accuracy and independence may matter more.

## Learner uses many hints but answers correctly

Do not treat this as equivalent to independent mastery.

## Learner gets one hard question wrong

Do not immediately downgrade the learner.

Look for a pattern.

## Learner returns after a long absence

Use a lightweight review before assuming prior mastery remains unchanged.

## Learner asks AI directly for the answer

The tutor should redirect:

> "I can help you solve it. Let's start with the first step."

## AI unavailable

Core gameplay should still function using predefined questions and hints.

---

# 48. Product Requirements Checklist

- [ ] The learner has a clear adventure goal.
- [ ] The world contains at least one meaningful region.
- [ ] Math challenges affect the game world.
- [ ] The system tracks skill-level performance.
- [ ] The next challenge can change based on performance.
- [ ] Wrong answers produce useful support.
- [ ] Hints are progressive.
- [ ] Mastery is not based on one answer.
- [ ] Rewards reflect learning progress.
- [ ] A boss or milestone represents mastery.
- [ ] AI is used for meaningful personalization.
- [ ] AI is not trusted blindly for math correctness.
- [ ] The child interface remains simple.
- [ ] The MVP can demonstrate one complete learning journey.

---

# 49. Senior Product Review

From a product-management perspective, the concept is strong if the team stays disciplined about the core thesis.

## What is strongest

### 1. Clear user value

Children receive practice tailored to their current needs.

### 2. Strong visual metaphor

Adventure progress maps naturally to learning progress.

### 3. AI has a legitimate role

AI is not included simply for novelty.

It improves:

- hints,
- explanations,
- question diversity,
- tutoring,
- personalization.

### 4. The product can be demonstrated clearly

A judge can understand the value within a few minutes by seeing:

```text
mistake
→ adaptation
→ support
→ improvement
→ unlock
```

### 5. Scope can be controlled

One complete region is sufficient for the hackathon.

---

# 50. Senior Product Concerns

These should be actively avoided.

## Do not overbuild the map

A huge world with shallow learning logic weakens the product.

## Do not overuse AI

"AI-generated everything" is not a compelling product strategy.

## Do not claim deep personalization without evidence

The experience must visibly change based on learner behavior.

## Do not optimize for feature count

A polished single learning loop is stronger than five unfinished regions.

## Do not make the diagnostic long

The child should reach gameplay quickly.

## Do not expose complexity to the child

The adaptation should feel natural.

## Do not confuse engagement with learning

XP alone is not evidence of educational value.

---

# 51. Prioritization

If time is limited, build in this order:

## Priority 1 — Core learning loop

```text
Question
→ answer
→ evaluate
→ update learner state
→ choose next challenge
```

## Priority 2 — Meaningful wrong-answer flow

```text
Wrong
→ hint
→ retry
→ adaptation
```

## Priority 3 — Adventure feedback

```text
Learning success
→ visible world progress
```

## Priority 4 — Boss challenge

Demonstrate mastery.

## Priority 5 — AI personalization

Hints and explanations.

## Priority 6 — Polish

Animations, rewards, effects, collectibles.

Do not reverse this order.

---

# 52. Recommended Build Scope for Claude

When implementing this specification in Claude, treat the project as a polished prototype rather than a complete educational platform.

Build around one cohesive scenario:

> **A learner enters Addition Forest, completes adaptive addition challenges, receives personalized support when they struggle, demonstrates mastery, defeats the Forest Guardian, and unlocks the next region.**

Every screen and interaction should support that scenario.

Avoid introducing unrelated product modules until this loop is complete.

---

# 53. Suggested Screen Inventory

The MVP likely needs:

1. Welcome screen
2. Avatar selection
3. Grade selection
4. Diagnostic intro
5. Diagnostic question screen
6. Diagnostic completion / adventure start
7. World map
8. Region intro
9. Challenge screen
10. Correct answer state
11. Incorrect answer state
12. Hint state
13. Explanation / scaffold state
14. Reward state
15. Boss intro
16. Boss challenge
17. Boss completion
18. Region completion
19. Progress summary
20. Return-to-map state

These do not all need to be separate pages.

They may be states within a smaller number of screens.

---

# 54. UX Tone

The product voice should be:

- warm,
- encouraging,
- concise,
- adventurous,
- simple,
- never condescending.

Good:

> "Nice thinking!"

> "That one was tricky. Try this hint."

> "You're getting stronger."

Avoid:

> "Incorrect. Your score has decreased."

> "You failed this level."

> "This should be easy."

---

# 55. Visual Design Direction

The design should feel like:

- playful adventure,
- polished educational game,
- bright but not chaotic,
- expressive characters,
- clear hierarchy,
- simple cards and controls,
- strong visual state changes.

The interface should prioritize:

1. challenge,
2. response controls,
3. feedback,
4. game state.

Avoid cluttering gameplay with:

- too many currencies,
- too many menus,
- complex inventories,
- dense stats,
- unnecessary navigation.

---

# 56. One-Sentence Pitch

> **MathQuest is an adaptive K–5 math adventure where every challenge, hint, and next step responds to the learner's mastery, turning math practice into a world that grows as the child learns.**

---

# 57. Short Hackathon Pitch

> Most math games give every child the same sequence of questions and add points on top. MathQuest works differently. It continuously learns what the child understands, detects where they struggle, adapts the next challenge, and gives personalized support. As the learner improves, the adventure world changes with them. Their progress through the game is a visible representation of their progress in math.

---

# 58. Core Product Mental Model

```text
                     LEARNER
                        │
                        ▼
                  ADVENTURE MAP
                        │
                        ▼
                  MATH CHALLENGE
                        │
                        ▼
                     ANSWER
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
           SUCCESS             STRUGGLE
              │                   │
              │                   ▼
              │               AI SUPPORT
              │             Hint / Explain
              │                   │
              └─────────┬─────────┘
                        ▼
                  LEARNER MODEL
                        │
                        ▼
                 ADAPTIVE DECISION
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
       REVIEW         CONTINUE      ADVANCE
          │             │             │
          └─────────────┼─────────────┘
                        ▼
                     REWARD
                        │
                        ▼
                 WORLD PROGRESSION
```

---

# 59. Final Product Direction

The product should not be described primarily as:

> "A 2D math game."

It should be described as:

> **An adaptive learning system wrapped in an adventure game.**

The adventure provides:

- motivation,
- narrative,
- exploration,
- progression,
- visual feedback,
- rewards.

The learner model provides:

- skill tracking,
- mastery estimation,
- weakness detection,
- progression logic,
- review timing.

AI provides:

- personalized hints,
- explanations,
- misconception support,
- question variation,
- tutor dialogue,
- adaptive story language.

The learner should experience:

> "I'm going on an adventure."

The system should continuously reason:

> "What does this learner understand, where are they struggling, and what is the best next learning experience?"

That is the product.

---

# 60. Claude Build Instruction

Use this document as the source of truth for product behavior and UX.

When making implementation decisions:

1. Preserve the adaptive-learning loop.
2. Keep the learner-facing experience simple.
3. Prioritize one polished end-to-end journey.
4. Do not add features that do not support the core learning loop.
5. Use AI only where personalization or explanation materially improves the experience.
6. Keep core correctness and progression reliable.
7. Treat wrong answers as learning signals.
8. Make learning progress visible through the adventure world.
9. Optimize for a compelling demo of adaptation rather than breadth.
10. If a design decision conflicts with the core product principles in this document, favor the product principles.
