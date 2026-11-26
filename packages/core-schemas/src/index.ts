import { z } from 'zod';

export { errorResponseSchema, validationIssueSchema } from './errors.ts';
export type { ErrorResponse, ValidationIssue } from './errors.ts';
export { livenessResponseSchema, readinessResponseSchema } from './health.ts';
export type { LivenessResponse, ReadinessResponse } from './health.ts';

/** UI and message languages supported by the app (ADR 0008). */
export const localeSchema = z.enum(['sk', 'en']);

export type Locale = z.infer<typeof localeSchema>;
