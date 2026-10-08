import { z } from 'zod';
import { areaSchema } from './constants.js';
import { entityIdSchema } from './common.js';
import { successEnvelopeSchema } from './http.js';

export const experienceLevelSchema = z.enum(['new', 'some', 'experienced']);
export const interestAreaSchema = areaSchema.exclude(['other']);
export const profileSchema = z.strictObject({
  userId: entityIdSchema,
  isAnonymous: z.boolean(),
  interests: z.array(interestAreaSchema).max(3),
  experienceLevel: experienceLevelSchema,
  onboardingComplete: z.boolean(),
  timezone: z.string().min(1).max(100),
  reducedMotion: z.boolean(),
  createdAt: z.iso.datetime({ offset: true }),
});
export const meEnvelopeSchema = successEnvelopeSchema(profileSchema);
export type Profile = z.infer<typeof profileSchema>;
