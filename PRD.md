# PRD: Visual Technology Learning Companion

Version 1.3 | 16 October 2026 | Product requirements | On-demand topic tree and source-backed lessons

This document defines the product behaviour. The project name is a working name. Technical implementation decisions are specified separately in [technical-design.md](docs/technical-design.md).

## 1. 4W framework

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

### Topic starters and lessons

The first release starts with four broad, fixed roots: **Software Development**, **AI Engineering**, **Cybersecurity**, and **Cloud Computing**. The existing 12 web, API, and database concepts remain available as catalogue material; the four already source-backed lessons remain usable. They are not a requirement to hand-author every branch before students can explore the tree.

Requesting topics produces exactly three student-specific topics, each placed within the selected subtree under a logical parent. A student can choose one to learn or request more topics within its subtree. Save each trio so retries return those same topics; a new deliberate request may add another trio. Each lesson targets one focused objective and roughly 15 minutes of learning. A student can stop expanding at any depth.

When a student chooses an uncached lesson, Gemini discovers candidate public references; the backend checks and extracts permitted pages, chunks relevant text, and asks Gemini to generate the lesson from those saved passages. Show the actual citations. If suitable references cannot be obtained, show a retry or let the student choose another node; do not invent a successful sourced lesson. No separate badge is needed merely to say a page was found by Gemini. Do not represent automatically found material as independently approved.

### Core features

Onboarding, topic recommendations, an expandable topic tree that also shows learning history, guided visual lessons, an animated tutor, understanding checks, targeted review, and guest-to-account progress preservation.

Social features, leaderboards, certificates, and advanced simulations are outside the initial release.

## 3. Screens and user flows

### 3.1 First visit and onboarding

1. Explain the learning experience and let the student start as a guest.
2. Ask about interests and current experience in the broad starter areas.
3. Offer a skippable three-to-five-question starting-point check.
4. Use answers to choose an initial recommendation.
5. Open the home screen.

Skipping the check leaves understanding unassessed. An isolated diagnostic answer is not enough to claim demonstrated understanding of an entire concept or area.

### 3.2 Home

Present two main choices:

- **Learn something new:** show a recommended available tree node and a short explanation of why it was chosen. Let the student choose or expand another topic in the tree.
- **Review:** show previously explored concepts and suggested reviews, while allowing the student to select a concept themselves.

Show the most recent activity and a resume action when a session is unfinished. Fifteen minutes is a guide, not a cutoff; clarification and optional tasks can extend the session.

### 3.3 Learn

Topic-tree selection -> guided visual lesson -> understanding check -> feedback and results -> topic-tree update.

- Show the topic, objectives, estimated duration, and available references before starting.
- Make the tutor available throughout the lesson.
- Save progress after meaningful actions so the student can leave and resume.
- At the end, explain what was assessed and what remains uncertain.
- Show the concept's previous and current learning statuses when they differ.
- Link to the updated node in the topic tree.

### 3.4 Review

Topic-tree selection -> recall questions -> targeted explanations and diagrams for gaps -> follow-up questions -> results -> topic-tree update.

- Begin with recall rather than replaying the complete lesson automatically.
- Let the student open the complete visual lesson at any time.
- Give targeted feedback for gaps and offer follow-up questions.
- Distinguish assisted practice from a fresh independent check.
- Show the previous and current status after results, for example **developing -> demonstrated understanding** when a qualifying independent check supports that change.
- Explain the evidence behind the change and provide a link to the updated tree node.
- If evidence does not justify a change, show the current status and remaining gap clearly.

### 3.5 Topic tree

Choose a broad root -> generate and save three topics within that subtree -> select a topic to learn or expand it further -> return to the same saved tree and learning history.

- The topic tree is the sole place to browse, expand, and select learning topics; there is no separate Explore or knowledge-map screen.
- Repeated or concurrent copies of one expansion request return the saved trio. Reject duplicate or near-duplicate suggestions and invalid parent links before saving. Show siblings side by side and children below their parent.
- Selecting a node with an existing lesson reuses it. A new lesson begins only after adequate reference passages have been saved.
- Show actual learning status, assessed objectives, source links, related lessons, and Learn/Review actions on each relevant node.

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

AI generates lessons and questions using the selected node's saved reference passages and learning objectives. The first four lessons can continue using their approved passages; newly discovered passages are source-backed but not independently approved. Save each assessment's questions and answer criteria before the student answers; do not change the key during the assessment. Label generated assessments AI-assessed unless their keys have actually received independent review. Supporting references improve traceability but do not guarantee every generated question is accurate.

Generated tree lessons use the same assessment format. Once the student chooses an assessment, all three MCQs must be answered to complete that check.

Skipping optional tasks carries no penalty and does not count as evidence of weakness. Students can leave before completing MCQs; the lesson may be explored without having a completed assessment.

Record first answers, independent answers, hints, retries, and optional-task results separately. Assess explanations for conceptual content rather than writing style.

### 5.2 Incorrect answers

1. Explain the relevant misconception or missing reasoning.
2. Offer a different follow-up question.
3. Allow continuation without requiring a correct retry.
4. Record the remaining gap for future recommendations.

A correct assisted retry is useful practice but does not retroactively make the original answer independent. A fresh independent check can establish understanding afterward.

### 5.3 Learning statuses

Use the same statuses for catalogue and generated tree lessons:

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

## 6. Topic tree and credibility

### 6.1 Topic-tree presentation

Show the four broad roots and only the child branches a student has requested. This tree is also the learning-history view. Summaries report coverage and assessment activity rather than an invented overall mastery percentage.

Selecting a node reveals:

- Its learning status and specific objectives assessed.
- Its saved source links and assessment basis.
- Assessment history and supporting answers.
- Parent, children, and any separately reviewed prerequisites.
- Source references and related clarification conversations.
- Learn or Review actions.

Use text as well as colour for learning status. A generated parent-child link is a navigation relationship, not proof of a prerequisite.

### 6.2 Source and assessment evidence

- Require saved, usable references for new tree lessons. When none pass the checks, do not generate a lesson from the model's prior knowledge as a silent fallback.
- Show citations from the exact saved passages used for the lesson and questions; never accept a fabricated citation from model output.
- Preserve the source provenance of historical sessions, including any older unverified sessions, independently of assessment outcomes.
- Label generated assessments **AI-assessed** and explain that the result measures performance against an AI-generated assessment whose accuracy has not been independently verified.
- Permit progression through all four learning statuses for a generated lesson, but never present a passing assessment as proof that its sources or AI-generated questions were independently reviewed.

### 6.3 Automatic source discovery

- Use Gemini 2.5 Flash with Google Search grounding to suggest candidate URLs. The backend, not Gemini, fetches and extracts each allowed public page and checks its relevance to the selected objective.
- Store the source title, canonical URL, fetched date, extracted passage snapshot, and lesson citation IDs. Fetch only selected pages; do not crawl a site.
- Retrieve bounded passages for the lesson generator and tutor. Use Gemini 3.5 Flash-Lite for the saved-passages-to-lesson call.
- Keep automatic source checks separate from human approval and answer-key review. Preserve AI-assessed labels for generated keys; use a reviewed label only when actual independent review occurred.
- Show a plain-language failure and retry when no permitted, sufficient passages are available. Do not substitute an unlabeled fixture or model-only answer.

## 7. Acceptance criteria and validation

- Different learning evidence produces meaningfully different explanations or recommendations.
- Visual lessons support step navigation, component selection, and relevant tutor highlights.
- The mascot remains usable with reduced motion enabled.
- Required MCQs and optional tasks follow the agreed completion rules.
- Review begins with recall, addresses gaps, shows results, and then updates the same topic tree with its evidence.
- Generated tree lessons can reach demonstrated understanding while retaining their AI-assessed label and source citations.
- Assessment performance never changes source provenance automatically.
- Refresh and resume preserve completed answers and do not regenerate saved lessons unnecessarily.
- Guest progress survives sign-in, including sign-in to an existing account.
- Private learning records cannot be accessed by another user.
- Displayed citations resolve to the stored material used.
- Lessons and questions are generated from saved, checked reference passages; assessment keys remain fixed during the round, private, and labelled according to their actual review basis.
- Incorrect answers, valid alternative wording, missing references, grading manipulation, invalid AI output, and service failures are tested.
- Failed generation or grading does not falsely update understanding.

Validate usefulness using initial understanding, post-lesson application, later unaided recall, and student feedback about knowing what to learn next. Report small pilots as early evidence, not proof of general effectiveness.
