import { z } from 'zod';

/** One failed input check: `path` is dotted (`items.0.name`), empty for the whole input. */
export const validationIssueSchema = z.object({
  path: z.string(),
  message: z.string(),
});

export type ValidationIssue = z.infer<typeof validationIssueSchema>;

/** Body of every non-2xx API response (ARCHITECTURE.md §8). Never contains stack traces. */
export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    issues: z.array(validationIssueSchema).optional(),
  }),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
