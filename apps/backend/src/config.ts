import { z } from 'zod';
import { backendRoles, backendRolesSchema, cidrListSchema } from './roles.ts';

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
    BACKEND_ROLES: z.preprocess(
      emptyToUndefined,
      z.string().default(backendRoles.join(',')).pipe(backendRolesSchema),
    ),
    TRUST_PROXY_CIDRS: z.preprocess(emptyToUndefined, z.string().default('').pipe(cidrListSchema)),
    DATABASE_URL: z.preprocess(
      emptyToUndefined,
      z.url({
        protocol: /^postgres(ql)?$/,
        error: ruleMessage(
          'must be a postgres:// URL, e.g. postgres://projectu:<password>@127.0.0.1:5432/projectu',
        ),
      }),
    ),
  })
  .transform((env) => ({
    nodeEnv: env.NODE_ENV,
    logLevel: env.LOG_LEVEL,
    backendHost: env.BACKEND_HOST,
    backendPort: env.BACKEND_PORT,
    backendRoles: env.BACKEND_ROLES,
    trustProxyCidrs: env.TRUST_PROXY_CIDRS,
    databaseUrl: env.DATABASE_URL,
  }));

/**
 * Human-readable rule per variable for issues raised inside nested schemas (list items, pipes),
 * so the message never depends on (or echoes) the received value.
 */
const nestedRuleMessages: Readonly<Partial<Record<string, string>>> = {
  BACKEND_ROLES: `must be a comma-separated list of: ${backendRoles.join(', ')}`,
  TRUST_PROXY_CIDRS: 'must be a comma-separated list of CIDRs, e.g. 172.18.0.0/16 (empty = none)',
};

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
  const issues = parsed.error.issues.map((issue): ConfigIssue => {
    const variable = String(issue.path[0] ?? '');
    return { variable, message: nestedRuleMessages[variable] ?? issue.message };
  });
  const unique = issues.filter(
    (issue, index) =>
      issues.findIndex(
        (other) => other.variable === issue.variable && other.message === issue.message,
      ) === index,
  );
  return { ok: false, issues: unique };
};

export const formatConfigIssues = (issues: readonly ConfigIssue[]): string =>
  [
    'Invalid environment configuration (see .env.example):',
    ...issues.map((issue) => `  - ${issue.variable}: ${issue.message}`),
    '',
  ].join('\n');
