import { z } from 'zod';
import { contentIdSchema, entityIdSchema } from './common.js';
import { sourceModeSchema } from './constants.js';

export const tutorRequestSchema = z.strictObject({
  message: z.string().trim().min(1).max(2000),
  selectedText: z.string().trim().min(1).max(2000).optional(),
  stepId: contentIdSchema.optional(),
  requestId: entityIdSchema,
});
export type TutorRequest = z.infer<typeof tutorRequestSchema>;

export const tutorMessageSchema = z.strictObject({
  id: entityIdSchema, sequenceNo: z.number().int().nonnegative(), role: z.enum(['user', 'assistant']),
  body: z.string().min(1).max(4000), selectedText: z.string().nullable(), stepId: contentIdSchema.nullable(),
  citationChunkIds: z.array(entityIdSchema), sourceMode: sourceModeSchema,
  highlightNodeIds: z.array(contentIdSchema), highlightEdgeIds: z.array(contentIdSchema),
  createdAt: z.iso.datetime(),
});
export type TutorMessage = z.infer<typeof tutorMessageSchema>;

export const tutorHistorySchema = z.strictObject({
  messages: z.array(tutorMessageSchema), nextBefore: z.number().int().nonnegative().nullable(),
});
export type TutorHistory = z.infer<typeof tutorHistorySchema>;

export const tutorReplySchema = z.strictObject({ userMessage: tutorMessageSchema, reply: tutorMessageSchema });
