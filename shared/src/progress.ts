import { z } from 'zod';
import { entityIdSchema } from './common.js';
import { assessmentBasisSchema, learningStatusSchema, sourceModeSchema } from './constants.js';

// Server response contract, never a client-authoritative progress mutation.
export const progressUpdateSchema = z.strictObject({
  conceptId: entityIdSchema, previousStatus: learningStatusSchema, currentStatus: learningStatusSchema,
  changed: z.boolean(), evidenceRoundId: entityIdSchema,
  sourceMode: sourceModeSchema, assessmentBasis: assessmentBasisSchema,
}).superRefine((update, ctx) => {
  if (update.changed !== (update.previousStatus !== update.currentStatus)) {
    ctx.addIssue({ code: 'custom', path: ['changed'], message: 'Changed must match the before/after statuses.' });
  }
  if (!['developing', 'demonstrated_understanding'].includes(update.currentStatus)) {
    ctx.addIssue({ code: 'custom', path: ['currentStatus'], message: 'A completed concept check produces an assessed status.' });
  }
  if (update.sourceMode === 'unverified' && update.assessmentBasis !== 'ai_generated_key') {
    ctx.addIssue({ code: 'custom', path: ['assessmentBasis'], message: 'Unverified content retains the AI-assessed basis after a pass.' });
  }
});
export type ProgressUpdate = z.infer<typeof progressUpdateSchema>;
