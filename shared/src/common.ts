import { z } from 'zod';

// Local content IDs are stable identifiers; persisted entity/request IDs are UUIDs.
export const contentIdSchema = z.string().min(1).max(100).regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/);
export const entityIdSchema = z.uuid();
export const shortTextSchema = z.string().trim().min(1).max(500);
export const proseSchema = z.string().trim().min(1).max(3000);
export const uniqueIds = (values: readonly string[]) => new Set(values).size === values.length;
