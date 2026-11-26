import { z } from 'zod';

/** `GET /api/health/live` — the process is up. No details by design (public route). */
export const livenessResponseSchema = z.object({ status: z.literal('ok') });

/** `GET /api/health/ready` — all dependencies answer (200) or not (503). No details by design. */
export const readinessResponseSchema = z.object({ status: z.enum(['ready', 'not-ready']) });

export type LivenessResponse = z.infer<typeof livenessResponseSchema>;
export type ReadinessResponse = z.infer<typeof readinessResponseSchema>;
