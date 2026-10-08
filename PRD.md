# PRD: Visual Technology Learning Companion

Version 1.2 | 8 October 2026 | Product requirements | Source-backed generated lessons and questions

This document defines the product behaviour. The project name is a working name. Technical implementation decisions are specified separately in [technical-design.md](docs/technical-design.md).

## 1. Problem, audience, and goal

### Problem

Technology students encounter many concepts and tools but struggle to decide where to begin, organise their learning, connect concepts, and identify gaps in their understanding. Learning through separate AI conversations requires students to manage that structure and learning history themselves.

### Audience

Tertiary students in computing-related courses who want to understand technologies beyond their modules and connect them to projects. The initial catalogue is suitable for students building foundational understanding of web applications.

### Product promise

A daily learning companion that helps tech students connect concepts, uncover gaps, and demonstrate what they understand in approximately 15 minutes a day.

The app supports technical literacy and exploration. Its learning statuses describe performance on specific objectives and assessments; they are not professional qualifications or guarantees of mastery.

### Intended benefits

- Give students a suitable starting point and a manageable learning habit.
- Identify prerequisites worth revisiting when a student struggles.
- Connect technologies and concepts to practical applications.
- Help students practise explaining, comparing, and applying concepts.
- Maintain organised learning history across lessons and clarification conversations.
- Make coverage, assessment evidence, and possible gaps visible in one place.

These are intended benefits to validate with students, rather than established learning outcomes.

## 2. Initial product scope

### Supported catalogue

The first release contains 12 concepts across three connected areas:

- **Web communication:** clients and servers; HTTP requests and responses; HTTP methods; HTTP status codes.
- **APIs:** what an API does; REST basics; JSON; authentication versus authorization.
- **Databases:** tables and records; keys and relationships; selecting and filtering data; joins.

Students can also explore additional topics using AI-generated content. Content without supporting references is visibly labelled as having an unverified source.

### Core features

Onboarding, topic recommendations, guided visual lessons, an animated tutor, understanding checks, targeted review, an Explore area, a knowledge map, guest-to-account progress preservation, and basic source management.

Social features, leaderboards, certificates, and advanced simulations are outside the initial release.

## 3. Screens and user flows

### 3.1 First visit and onboarding

1. Explain the learning experience and let the student start as a guest.
2. Ask about interests and current experience in the supported areas.
3. Offer a skippable three-to-five-question starting-point check.
4. Use answers to choose an initial recommendation.
5. Open the home screen.

Skipping the check leaves understanding unassessed. An isolated diagnostic answer is not enough to claim demonstrated understanding of an entire concept or area.

### 3.2 Home

Present two main choices:

- **Learn something new:** show a recommended concept and a short explanation of why it was chosen. Let the student choose another supported concept or open Explore.
- **Review:** show previously explored concepts and suggested reviews, while allowing the student to select a concept themselves.

Show the most recent activity and a resume action when a session is unfinished. Fifteen minutes is a guide, not a cutoff; clarification and optional tasks can extend the session.

### 3.3 Learn

Concept selection -> guided visual lesson -> understanding check -> feedback and results -> knowledge-map update.

- Show the topic, objectives, estimated duration, and source status before starting.
- Make the tutor available throughout the lesson.
- Save progress after meaningful actions so the student can leave and resume.
- At the end, explain what was assessed and what remains uncertain.
- Show the concept's previous and current learning statuses when they differ.
- Link to the updated node in the full knowledge map.

### 3.4 Review

Concept selection -> recall questions -> targeted explanations and diagrams for gaps -> follow-up questions -> results -> knowledge-map update.

- Begin with recall rather than replaying the complete lesson automatically.
- Let the student open the complete visual lesson at any time.
- Give targeted feedback for gaps and offer follow-up questions.
- Distinguish assisted practice from a fresh independent check.
- Show the previous and current status after results, for example **developing -> demonstrated understanding** when a qualifying independent check supports that change.
- Explain the evidence behind the change and provide a link to the updated graph node.
- If evidence does not justify a change, show the current status and remaining gap clearly.

### 3.5 Explore

Enter a topic or question -> explanation -> clarification and optional assessment -> results -> knowledge-map update.

- Use supporting references when the library contains suitable material for the actual question.
- Otherwise, generate content from the AI's existing knowledge and label it unverified.
- Let the student ask follow-up questions and choose whether to attempt an assessment.
- Keep explored topics in the knowledge map, including unsupported topics.

### 3.6 Account creation and settings

After the first lesson, offer sign-in to preserve progress across devices. It must retain guest lessons, answers, conversations, and map history.

Students can continue as guests. Explain that guest progress depends on retaining their browser session. Provide account settings for interests, reduced motion, sign-out, and deletion of personal learning data.

## 4. Lessons and the animated tutor

### 4.1 Guided visual lessons

- Teach through guided diagrams, short captions, and concrete examples.
- Reveal processes step by step rather than presenting a long article.
- Let students select components to understand their role and connections.
- Use appropriate visual formats, including process flows, component relationships, and database tables.
- Keep essential explanations available as text so diagrams are not the only way to access the content.
- Show source references near the relevant lesson content.
- Provide keyboard operation, clear focus states, readable contrast, and a usable mobile layout.

### 4.2 Animated tutor character

Use an original mascot alongside the lesson, rather than copying another product's character.

- Include idle, thinking, explaining, and encouraging animation states.
- Accept typed questions about the current lesson and related concepts.
- Answer with concise text and highlight relevant parts of the current diagram when applicable.
- Use the current lesson step, available source passages, and relevant learning evidence when responding.
- Save conversations with the associated lesson or exploration.
- Support reduced motion; animation is not necessary to access any function.
- Encourage students without shaming them for mistakes or skipped optional tasks.

The tutor can offer another explanation, an analogy, or a worked example when the student struggles. It should distinguish sourced explanation from unsupported elaboration.

## 5. Assessment and adaptation

### 5.1 Understanding checks

Each supported lesson includes:

- Three required MCQs, including at least one application question.
- One optional explanation question in the student's own words.
- One optional visual task.

AI generates lessons and questions using the concept's approved reference passages and learning objectives. Save each assessment's questions and answer criteria before the student answers; do not change the key during the assessment. Label generated assessments AI-assessed even when source-grounded, unless their keys have actually received independent review. Supporting references improve traceability but do not guarantee every generated question is accurate.

An Explore lesson offers the same assessment format, but taking its assessment is optional. Once the student chooses an assessment, all three MCQs must be answered to complete that check.

Skipping optional tasks carries no penalty and does not count as evidence of weakness. Students can leave before completing MCQs; the lesson may be explored without having a completed assessment.

Record first answers, independent answers, hints, retries, and optional-task results separately. Assess explanations for conceptual content rather than writing style.

### 5.2 Incorrect answers

1. Explain the relevant misconception or missing reasoning.
2. Offer a different follow-up question.
3. Allow continuation without requiring a correct retry.
4. Record the remaining gap for future recommendations.

A correct assisted retry is useful practice but does not retroactively make the original answer independent. A fresh independent check can establish understanding afterward.

### 5.3 Learning statuses

Use the same statuses for supported and unsupported topics:

- **Not assessed:** no assessment evidence and no learning activity yet; diagnostic information alone does not establish a full concept assessment.
- **Explored:** a lesson or exploration has been opened, but there is no graded concept-assessment evidence.
- **Developing:** assessment evidence shows partial understanding, incomplete coverage, or unresolved gaps.
- **Demonstrated understanding:** the student independently satisfies the assessment criteria for the stated objectives.

For the initial release, three correct first-attempt answers in one complete independent check, including the application question, qualify as demonstrated understanding. Optional tasks add evidence and feedback without becoming mandatory requirements for that status.

Use the latest completed concept check to update the current status, taking independence and assistance into account. A later completed review may change the status in either direction. Preserve earlier results in history. An abandoned partial review does not erase an earlier completed result.

### 5.4 Adaptation

- Offer a different explanation when the student struggles.
- Use confirmed gaps to recommend review or prerequisites.
- Treat possible misconceptions as tentative until further evidence supports them.
- Personalise examples and recommendations using interests and learning history.
- Keep topic choice available even when the recommendation differs from the student's preference.
- Explain recommendation reasons in student-friendly language.

## 6. Knowledge map and credibility

### 6.1 Knowledge-map presentation

Show an overview by area above an interactive concept graph. Area summaries report coverage and assessment activity rather than an invented overall mastery percentage.

Selecting a node reveals:

- Its learning status and specific objectives assessed.
- Its source status and assessment basis.
- Assessment history and supporting answers.
- Connected concepts and prerequisites.
- Source references and related clarification conversations.
- Learn or Review actions.

Use source status and learning status as separate attributes. Colour must not be the only way to communicate either attribute.

### 6.2 Unsupported topics

- Keep unsupported topics in the graph with an **unverified source** tag.
- Allow AI-generated explanations, questions, answer criteria, and feedback.
- Permit progression through all four learning statuses, including demonstrated understanding.
- Label assessments **AI-assessed** and explain that the result measures performance against an AI-generated assessment whose accuracy has not been independently verified.
- Label relationships without reviewed support as AI-suggested.
- Passing an assessment never removes the unverified source tag.

Source-grounded content is also AI-generated. Its distinguishing property is the supporting references, not the absence of AI.

### 6.3 Source management

- Provide an admin screen to add specific URLs, assign concepts, inspect imported material, and activate sources.
- Import the supplied page only; whole-site crawling is outside the initial release.
- Keep source title, URL, version where relevant, import date, and review status.
- Retrieve relevant passages when generating lessons and tutor responses.
- Attach citations from stored source records rather than accepting invented URLs.
- Use curated objectives, approved reference passages, and reviewed catalogue relationships for supported concepts; generate lessons and questions from those references rather than requiring a manually authored lesson/question pack for each concept.
- Keep source approval separate from answer-key review. Preserve AI-assessed labels for generated keys; use independently reviewed questions and keys only when that review actually occurred.
- Mark an explanation source-grounded only when the available passages support it.
- Use the unverified-content experience explicitly when reference coverage is insufficient.

## 7. Acceptance criteria and validation

- Different learning evidence produces meaningfully different explanations or recommendations.
- Visual lessons support step navigation, component selection, and relevant tutor highlights.
- The mascot remains usable with reduced motion enabled.
- Required MCQs and optional tasks follow the agreed completion rules.
- Review begins with recall, addresses gaps, shows results, and then shows the map update with its evidence.
- Unsupported topics can reach demonstrated understanding while retaining their unverified source tag and AI-assessed label.
- Assessment performance never changes source status automatically.
- Refresh and resume preserve completed answers and do not regenerate saved lessons unnecessarily.
- Guest progress survives sign-in, including sign-in to an existing account.
- Private learning records cannot be accessed by another user.
- Displayed citations resolve to the stored material used.
- Supported lessons and questions are generated from approved stored references; assessment keys remain fixed during the round, private, and labelled according to their actual review basis.
- Incorrect answers, valid alternative wording, missing references, grading manipulation, invalid AI output, and service failures are tested.
- Failed generation or grading does not falsely update understanding.

Validate usefulness using initial understanding, post-lesson application, later unaided recall, and student feedback about knowing what to learn next. Report small pilots as early evidence, not proof of general effectiveness.
