import { z } from 'zod';

export const SOURCE_MODES = ['source_grounded', 'unverified'] as const;
export const LEARNING_STATUSES = ['not_assessed', 'explored', 'developing', 'demonstrated_understanding'] as const;
export const ASSESSMENT_BASES = ['reviewed_key', 'ai_generated_key'] as const;
export const sourceModeSchema = z.enum(SOURCE_MODES);
export const learningStatusSchema = z.enum(LEARNING_STATUSES);
export const assessmentBasisSchema = z.enum(ASSESSMENT_BASES);
export const sessionModeSchema = z.enum(['learn', 'review', 'explore']);
export const roundKindSchema = z.enum(['initial', 'review', 'confirmation']);
export const areaSchema = z.enum(['web_communication', 'apis', 'databases', 'other']);
export const gradingStateSchema = z.enum(['graded', 'inconclusive']);
export const learningStatusLabels = {
  not_assessed: 'Not assessed',
  explored: 'Explored',
  developing: 'Developing',
  demonstrated_understanding: 'Demonstrated understanding',
} satisfies Record<z.infer<typeof learningStatusSchema>, string>;
export const sourceModeLabels = { source_grounded: 'Source-grounded', unverified: 'Unverified source' };
export type SourceMode = z.infer<typeof sourceModeSchema>;
export type LearningStatus = z.infer<typeof learningStatusSchema>;
export type AssessmentBasis = z.infer<typeof assessmentBasisSchema>;
