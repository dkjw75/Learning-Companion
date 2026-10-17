# PRD: Learning Companion

Product requirements | On-demand topic tree and source-backed lessons

This document defines the product behaviour. The project name is a working name. Technical implementation decisions are specified separately in [technical-design.md](docs/technical-design.md).

## 1. Problem scoping using 4W framework

### Who

Tertiary students in computing-related courses who want to gain a deeper understanding of technologies beyond their modules and connect them to projects. The initial focus is students who know some concepts or tools but are unsure what to learn next or how those concepts fit together.

### What

Students can find explanations through courses, social media, documentation, and AI, but these often appear as separate pieces of information. Students may struggle to choose a suitable starting point, recognise prerequisites, connect concepts to practical uses, and tell whether they can apply what they have learned. The core problem is not a lack of information. It is a lack of direction, connection, and reliable feedback on understanding.

### Where

This problem arises during self-directed learning on a laptop, especially when a student encounters an unfamiliar concept.

### Why
Learning Companion aims to help students:
- Explore topics that interest them, or allow the app to suggest topics within a chosen area using their selected interests, experience level, and recorded learning activity.
- See how topics relate to one another, including prerequisites worth revisiting.
- Learn through focused, source-backed explanations and practical examples.
- Check whether they can explain and apply a concept independently through short MCQ styled quizzes.
- Revisit gaps and track the evidence behind their learning status over time.

These features address the problems above as one learning journey: topic suggestions provide a starting point, the tree makes connections and possible prerequisites visible, and source-backed lessons link concepts to practical examples. Understanding checks give students feedback on what they can apply independently; review and learning history show which gaps remain and where to go next.


## 2. Goal and success

### Product goal

Help students discover tech concepts, see how those concepts connect to what they already know, and strengthen their understanding through lessons and review. The topic tree makes their learning and remaining gaps visible.

### Proposed evaluation

If the product is evaluated in the future, a small pilot with five computing students could follow this flow:

1. Ask each student to use the topic tree to find a concept relevant to their interests and explain how it connects to another topic.
2. Before the lesson, ask one unaided application question about the chosen concept and record the answer.
3. Let them complete the lesson and understanding check. Immediately afterward, give a different unaided application question on the same objective. Compare the answers, and ask them to find what to learn or review next in the tree.
4. One week later, ask a different unaided application question and record whether they can still apply the concept.

Measure how many students find a relevant topic, explain a connection, improve on the application question, and answer the later question correctly. As a provisional target, at least four of five should find a relevant topic and explain a connection, and at least three of five should improve and answer the later question correctly. This is a proposed test plan, not a commitment to run a study or proof of learning effectiveness.


## 3. Scope and trade-offs

### Scope

The current app focuses on three parts of the learning journey, in this order:

1. **Discover:** Students sign in with Google, choose interests and an experience level, then browse 10 different areas across tech. They can enter a topic or ask the app for three suggestions within a chosen branch. The tree saves those topics and shows available lessons and learning status.
2. **Understand:** Students open a saved lesson or request a new one. New lessons require usable source passages; the app shows a failure and retry if it cannot prepare one. Guided diagrams, examples, citations, and a text-based AI tutor help students explore the concept.
3. **Strengthen:** Students answer a three-question MCQ check, receive feedback and optional hints, and see their resulting learning status. The home screen shows lesson recommendations, suggested topics to revisit, recent activity, and an unfinished lesson to resume.


### Feature priorities and trade-offs

- **Prioritize a complete discover-to-check path:** Keep topic choice, sourced lessons, and honest assessment results working together before adding more assessment types. The current check uses MCQs; explanation and visual tasks are not in the app yet.
- **Prioritize visible progress over a full review journey:** Students can revisit lessons and see suggested reviews, but there is no separate recall-first review flow or new independent review check yet. Showing completed lessons and gaps gives students a clear reason to return; a dedicated review check would also need fresh questions to measure recall fairly.
- **Prioritize useful tutor help over character animation:** The tutor currently answers typed questions and can highlight lesson diagrams. An animated mascot is not part of the current experience.
- **Limit breadth:** Grow the tree when a student asks instead of hand-authoring every branch. A tree link shows where a topic belongs; it does not establish a verified prerequisite. Social features, leaderboards, certificates, and advanced simulations are outside the current scope.

## 4. Core journey and requirements

The current journey is: sign in -> choose interests and experience -> explore the topic tree -> open a visual lesson -> complete its understanding check -> see progress and revisit the lesson when needed.

### 4.1 Sign-in and onboarding

- Students sign in or register with Google before entering the app. Their learning progress is saved to their account.
- Onboarding asks for areas of interest and an overall experience level, then opens Home. It does not include a starting-point quiz.

### 4.2 Home

- Show an unfinished lesson first so the student can resume it. Otherwise, show an available recommended lesson with a short reason, or direct the student to Learn when none is available.
- Show suggested concepts to revisit, recent learning activity, and a link to the topic tree. Students can choose a topic themselves even when Home offers a recommendation.

### 4.3 Find a topic

- Learn contains the topic tree. Students choose one of ten broad roots, enter a topic they want to learn, or ask the app to suggest topics in that branch.
- A successful request saves three topics in the selected subtree. Existing topics remain available when the student returns; a new request can add more.
- Selecting a topic shows its objective, current learning status, available source links, and a Learn or resume action. Students can expand a topic further.
- A new lesson starts only when suitable source material has been saved. If preparation fails, show a retry rather than presenting an unsourced lesson as complete.

### 4.4 Learn through a visual lesson

- Present the concept in guided steps with diagrams, short explanations, a worked example, a common mistake, and citations for the current step.
- Let students move between steps and save their place so they can resume later. Keep the explanation readable as text alongside the diagram.
- Provide a text-based tutor during the lesson. Students can ask a typed question or select lesson text to ask about; relevant replies can highlight parts of the diagram. Save the conversation with the lesson.

### 4.5 Check understanding

- After the lesson, show three MCQs, including an application question. Students answer each question, see feedback, and may request a hint or retry an incorrect answer.
- Keep the first answer and any use of help distinct from practice retries. A completed check shows the previous and current learning status and how many first answers were correct without hints.
- Show the assessment basis and source links for questions. A failed submission must not create a successful result or change learning status.

### 4.6 Return and revisit

- Home suggests previously explored concepts to revisit, and the topic tree shows each topic's current status. Students can reopen a saved lesson and its existing check.
- Reopening a lesson supports practice; the current app does not start a separate recall-first review round or issue a new independent review check.

### 4.7 Account and accessibility

- Students can sign out. Their saved lessons, answers, topic tree, and tutor conversations belong to their signed-in account.
- Support keyboard use, visible focus, readable contrast, text explanations for diagrams, and reduced-motion preferences where available. The current app is designed for desktop use.

## 5. Release criteria

### Release criteria

- A student can sign in, finish onboarding, discover and save topics, complete a sourced visual lesson and its three-question check, then return to the same progress after signing in again.
- Topic suggestions remain in the chosen branch; saved topics and lessons are reused rather than regenerated on refresh or retry.
- New lessons and questions use saved reference passages, and displayed citations point to those sources. Missing sources or failed generation show a plain-language failure without inventing a lesson or result.
- The lesson, tutor, and check work on desktop with keyboard access, readable text alongside diagrams, and reduced-motion support. Opening a lesson may mark it explored; only a completed check can establish an assessed understanding status. Hints and retries remain separate from first independent answers.
- Assessment labels reflect the actual review basis, source provenance does not change after a passing check, and private learning records remain accessible only to their owner.
