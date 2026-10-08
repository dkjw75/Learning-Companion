import { z } from 'zod';
import { contentIdSchema, entityIdSchema, proseSchema, shortTextSchema, uniqueIds } from './common.js';
import { assessmentBasisSchema, gradingStateSchema, roundKindSchema, sourceModeSchema } from './constants.js';
import { progressUpdateSchema } from './progress.js';

// Public DTOs deliberately have no correct-option IDs, rubrics, or task solutions.
export const mcqSchema = z.strictObject({
  id: contentIdSchema, familyId: contentIdSchema, prompt: proseSchema,
  kind: z.enum(['recall', 'application']),
  objectiveIds: z.array(contentIdSchema).min(1).max(12).refine(uniqueIds),
  citationChunkIds: z.array(entityIdSchema).max(6).refine(uniqueIds),
  options: z.array(z.strictObject({ id: contentIdSchema, text: shortTextSchema })).min(2).max(6)
    .refine(options => uniqueIds(options.map(option => option.id)), 'Option IDs must be unique.'),
});
const taskFields = { id: contentIdSchema, prompt: proseSchema, objectiveIds: z.array(contentIdSchema).min(1).max(12).refine(uniqueIds) };
const taskItems = z.array(z.strictObject({ id: contentIdSchema, label: shortTextSchema })).min(3).max(5)
  .refine(items => uniqueIds(items.map(item => item.id)), 'Task item IDs must be unique.');
export const visualTaskSchema = z.discriminatedUnion('type', [
  z.strictObject({ ...taskFields, type: z.literal('ordering'), items: taskItems }),
  z.strictObject({ ...taskFields, type: z.literal('label_matching'), diagramId: contentIdSchema, labels: taskItems,
    targetNodeIds: z.array(contentIdSchema).min(3).max(5).refine(uniqueIds) }),
]).superRefine((task, ctx) => {
  if (task.type === 'label_matching' && task.labels.length !== task.targetNodeIds.length) {
    ctx.addIssue({ code: 'custom', message: 'Each label must have one matching target.' });
  }
});
export const explanationTaskSchema = z.strictObject({ ...taskFields, type: z.literal('explanation') });
export const assessmentRoundSchema = z.strictObject({
  id: entityIdSchema, sessionId: entityIdSchema, kind: roundKindSchema,
  sourceMode: sourceModeSchema, assessmentBasis: assessmentBasisSchema,
  questions: z.array(mcqSchema).length(3),
  explanationTask: explanationTaskSchema.optional(), visualTask: visualTaskSchema.optional(),
}).superRefine((round, ctx) => {
  if (!uniqueIds(round.questions.map(question => question.id)) || !uniqueIds(round.questions.map(question => question.familyId))) {
    ctx.addIssue({ code: 'custom', path: ['questions'], message: 'A check needs distinct question IDs and families.' });
  }
  if (!round.questions.some(question => question.kind === 'application')) {
    ctx.addIssue({ code: 'custom', path: ['questions'], message: 'A check needs at least one application question.' });
  }
  const taskIds = [round.explanationTask?.id, round.visualTask?.id].filter((id): id is string => id !== undefined);
  if (!uniqueIds([...round.questions.map(question => question.id), ...taskIds])) {
    ctx.addIssue({ code: 'custom', message: 'Assessment question and task IDs must be unique.' });
  }
  if (round.sourceMode === 'unverified' && round.assessmentBasis !== 'ai_generated_key') {
    ctx.addIssue({ code: 'custom', path: ['assessmentBasis'], message: 'Unverified rounds must retain the AI-assessed basis.' });
  }
});
export const startRoundRequestSchema = z.strictObject({ kind: roundKindSchema, requestId: entityIdSchema });
export const submitAnswerRequestSchema = z.strictObject({ questionId: contentIdSchema, answer: contentIdSchema, requestId: entityIdSchema });
export const hintRequestSchema = z.strictObject({ questionId: contentIdSchema, requestId: entityIdSchema });
export const answerEvidenceSchema = z.strictObject({
  id: entityIdSchema, roundId: entityIdSchema, questionId: contentIdSchema, requestId: entityIdSchema,
  attemptIndex: z.number().int().min(1), answer: contentIdSchema,
  correct: z.boolean(), assisted: z.boolean(), independent: z.boolean(),
  objectiveIds: z.array(contentIdSchema).min(1).max(12).refine(uniqueIds),
}).refine(evidence => evidence.independent === (evidence.attemptIndex === 1 && !evidence.assisted), 'Only an unassisted first answer is independent.');
export const submitAnswerResponseSchema = z.strictObject({
  evidence: answerEvidenceSchema, feedback: proseSchema, completed: z.boolean(),
  progressUpdate: progressUpdateSchema.optional(),
}).refine(result => result.completed === (result.progressUpdate !== undefined), 'A completed round must include a committed progress update.');
export const optionalTaskSubmissionSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('skip'), requestId: entityIdSchema }),
  z.strictObject({ type: z.literal('explanation'), answer: proseSchema, requestId: entityIdSchema }),
  z.strictObject({ type: z.literal('ordering'), orderedItemIds: z.array(contentIdSchema).min(3).max(5).refine(uniqueIds), requestId: entityIdSchema }),
  z.strictObject({ type: z.literal('label_matching'), matches: z.array(z.strictObject({ labelId: contentIdSchema, nodeId: contentIdSchema })).min(3).max(5)
    .refine(matches => uniqueIds(matches.map(match => match.labelId)) && uniqueIds(matches.map(match => match.nodeId))), requestId: entityIdSchema }),
]);
export const optionalTaskResultSchema = z.discriminatedUnion('state', [
  z.strictObject({ state: z.literal('skipped') }),
  z.strictObject({ state: gradingStateSchema.extract(['graded']), correct: z.boolean(), feedback: proseSchema }),
  z.strictObject({ state: gradingStateSchema.extract(['inconclusive']), feedback: proseSchema }),
]);
export type MCQ = z.infer<typeof mcqSchema>;
export type AssessmentRound = z.infer<typeof assessmentRoundSchema>;
export type SubmitAnswerRequest = z.infer<typeof submitAnswerRequestSchema>;
export type SubmitAnswerResponse = z.infer<typeof submitAnswerResponseSchema>;
export type AnswerEvidence = z.infer<typeof answerEvidenceSchema>;
export type VisualTask = z.infer<typeof visualTaskSchema>;
export type OptionalTaskSubmission = z.infer<typeof optionalTaskSubmissionSchema>;
