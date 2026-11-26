import { z } from 'zod';

const nodeEnvs = ['development', 'test', 'production'] as const;
const logLevels = ['trace', 'debug', 'info', 'warn', 'error'] as const;

/** `KEY=` in an env file means "not set". */
const emptyToUndefined = (value: unknown): unknown => (value === '' ? undefined : value);

const ruleMessage = (rule: string) => (issue: { input: unknown }) =>
  issue.input === undefined ? 'is required' : rule;

const envSchema = z
  .object({
    NODE_ENV: z.preprocess(
      emptyToUndefined,
      z.enum(nodeEnvs, { error: ruleMessage(`must be one of: ${nodeEnvs.join(', ')}`) }),
    ),
    LOG_LEVEL: z.preprocess(
      emptyToUndefined,
      z
        .enum(logLevels, { error: ruleMessage(`must be one of: ${logLevels.join(', ')}`) })
        .default('info'),
    ),
    BACKEND_HOST: z.preprocess(
      emptyToUndefined,
      z
        .ipv4({ error: ruleMessage('must be an IPv4 address, e.g. 127.0.0.1 or 0.0.0.0') })
        .default('127.0.0.1'),
    ),
    BACKEND_PORT: z.preprocess(
      emptyToUndefined,
      z
        .string({ error: ruleMessage('must be an integer between 1 and 65535') })
        .regex(/^\d{1,5}$/, { error: 'must be an integer between 1 and 65535' })
        .transform(Number)
        .pipe(
          z
            .number()
            .int()
            .min(1, { error: 'must be an integer between 1 and 65535' })
            .max(65_535, { error: 'must be an integer between 1 and 65535' }),
        )
        .default(4000),
    ),
  })
  .transform((env) => ({
    nodeEnv: env.NODE_ENV,
    logLevel: env.LOG_LEVEL,
    backendHost: env.BACKEND_HOST,
    backendPort: env.BACKEND_PORT,
  }));

export type Config = z.output<typeof envSchema>;

export type ConfigIssue = { readonly variable: string; readonly message: string };

export type ConfigResult =
  | { readonly ok: true; readonly config: Config }
  | { readonly ok: false; readonly issues: readonly ConfigIssue[] };

/**
 * Validates environment variables. Issues name the variable and the rule only — never the
 * received value, so secrets cannot leak into logs or terminal output.
 */
export const loadConfig = (env: Readonly<Record<string, string | undefined>>): ConfigResult => {
  const parsed = envSchema.safeParse(env);
  if (parsed.success) {
    return { ok: true, config: parsed.data };
  }
  return {
    ok: false,
    issues: parsed.error.issues.map((issue) => ({
      variable: issue.path.map(String).join('.'),
      message: issue.message,
    })),
  };
};

export const formatConfigIssues = (issues: readonly ConfigIssue[]): string =>
  [
    'Invalid environment configuration (see .env.example):',
    ...issues.map((issue) => `  - ${issue.variable}: ${issue.message}`),
    '',
  ].join('\n');
