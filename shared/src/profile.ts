import { z } from 'zod';
import { areaSchema, learningStatusSchema } from './constants.js';
import { entityIdSchema, shortTextSchema } from './common.js';
import { successEnvelopeSchema } from './http.js';

export const experienceLevelSchema = z.enum(['new', 'some', 'experienced']);
export const interestAreaSchema = areaSchema.exclude(['other']);
export const techInterestSchema = z.enum([
  'web_communication', 'apis', 'databases', 'cloud', 'cybersecurity', 'web_development',
  'ai_ml', 'data_science', 'mobile', 'game_development', 'devops', 'ui_ux', 'hardware_iot',
]);
export const profileSchema = z.strictObject({
  userId: entityIdSchema,
  isAnonymous: z.boolean(),
  interests: z.array(techInterestSchema).max(3),
  experienceLevel: experienceLevelSchema,
  onboardingComplete: z.boolean(),
  timezone: z.string().min(1).max(100),
  reducedMotion: z.boolean(),
  createdAt: z.iso.datetime({ offset: true }),
});
export const meEnvelopeSchema = successEnvelopeSchema(profileSchema);
export type Profile = z.infer<typeof profileSchema>;

export const diagnosticQuestionIds = ['interest', 'confidence', 'practice', 'goal', 'pace'] as const;
export const diagnosticAnswers = {
  interest: ['websites', 'apis', 'data', 'cloud', 'cybersecurity', 'ai_ml', 'mobile', 'games', 'design', 'hardware', 'unsure'],
  confidence: ['beginner', 'some', 'comfortable'],
  practice: ['none', 'web_apps', 'cloud_tools', 'security_tools', 'ai_tools', 'data_tools', 'mobile_apps', 'other'],
  goal: ['understand', 'project', 'explore'],
  pace: ['guided', 'balanced', 'independent'],
} as const;
export const diagnosticEvidenceSchema = z.strictObject({
  questionId: z.enum(diagnosticQuestionIds), answerId: z.string().min(1).max(30),
}).superRefine((answer, ctx) => {
  if (!(diagnosticAnswers[answer.questionId] as readonly string[]).includes(answer.answerId)) {
    ctx.addIssue({ code: 'custom', path: ['answerId'], message: 'Unknown answer.' });
  }
});
export const completeOnboardingSchema = z.strictObject({
  interests: z.array(techInterestSchema).max(3).refine(items => new Set(items).size === items.length),
  experienceLevel: experienceLevelSchema,
  timezone: z.string().min(1).max(100),
  skippedDiagnostic: z.boolean(),
  answers: z.array(diagnosticEvidenceSchema).max(5),
}).superRefine((input, ctx) => {
  if (new Set(input.answers.map(answer => answer.questionId)).size !== input.answers.length ||
    (input.skippedDiagnostic && input.answers.length !== 0) ||
    (!input.skippedDiagnostic && input.answers.length !== 5)) {
    ctx.addIssue({ code: 'custom', path: ['answers'], message: 'Answer all five questions or skip the check.' });
  }
});
export type CompleteOnboarding = z.infer<typeof completeOnboardingSchema>;

export const recommendationsSchema = z.strictObject({
  learn: z.strictObject({
    conceptId: entityIdSchema,
    reasonCode: z.enum(['interest', 'prerequisite', 'next_available']),
    reason: shortTextSchema,
  }).nullable(),
  review: z.array(z.strictObject({
    conceptId: entityIdSchema,
    reasonCode: z.enum(['finish_check', 'developing', 'explored', 'recall_due']),
    reason: shortTextSchema,
    dueAt: z.iso.datetime({ offset: true }).nullable(),
  })),
});
export const recommendationsEnvelopeSchema = successEnvelopeSchema(recommendationsSchema);
export type Recommendations = z.infer<typeof recommendationsSchema>;

export const homeSchema = z.strictObject({
  concepts: z.array(z.strictObject({
    id: entityIdSchema, slug: shortTextSchema, title: shortTextSchema, description: shortTextSchema.nullable(),
    objectives: z.array(shortTextSchema), citations: z.array(z.strictObject({ title: shortTextSchema, url: z.url() })),
    area: interestAreaSchema, order: z.number().int().positive(),
    contentAvailable: z.boolean(), status: learningStatusSchema, sessionId: entityIdSchema.nullable(),
    sessionCompleted: z.boolean(),
  })),
  recommendations: recommendationsSchema,
  activityCounts: z.array(z.strictObject({ date: z.iso.date(), count: z.number().int().positive() })),
  recentSession: z.strictObject({
    id: entityIdSchema, conceptId: entityIdSchema,
    createdAt: z.iso.datetime({ offset: true }), completed: z.boolean(),
  }).nullable(),
  unfinishedSession: z.strictObject({ id: entityIdSchema, conceptId: entityIdSchema }).nullable(),
});
export const homeEnvelopeSchema = successEnvelopeSchema(homeSchema);
export type HomeData = z.infer<typeof homeSchema>;
