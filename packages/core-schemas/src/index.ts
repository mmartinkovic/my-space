import { z } from 'zod';

/** UI and message languages supported by the app (ADR 0008). */
export const localeSchema = z.enum(['sk', 'en']);

export type Locale = z.infer<typeof localeSchema>;
