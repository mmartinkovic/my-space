import type { FastifyPluginCallbackZod } from '@fastify/type-provider-zod';
import { livenessResponseSchema, readinessResponseSchema } from '@projectu/core-schemas';

/** A dependency the app needs to serve traffic (database from P0-04b, pg-boss from P0-09a). */
export type ReadinessCheck = {
  readonly name: string;
  /** Resolves `true` when the dependency is usable. Rejections count as not ready. */
  readonly isReady: () => Promise<boolean>;
};

export type HealthRoutesOptions = {
  readonly checks: readonly ReadinessCheck[];
  /** Per-check time limit; a slower check counts as not ready. */
  readonly checkTimeoutMs: number;
};

const withTimeout = (check: ReadinessCheck, timeoutMs: number): Promise<boolean> =>
  Promise.race([
    check.isReady(),
    new Promise<boolean>((resolve) => {
      setTimeout(() => {
        resolve(false);
      }, timeoutMs).unref();
    }),
  ]);

/**
 * Public health endpoints (SECURITY.md §4 allowlist): status only, details go to the log.
 */
export const healthRoutes: FastifyPluginCallbackZod<HealthRoutesOptions> = (
  app,
  { checks, checkTimeoutMs },
  done,
) => {
  app.get('/api/health/live', { schema: { response: { 200: livenessResponseSchema } } }, () => ({
    status: 'ok' as const,
  }));

  app.get(
    '/api/health/ready',
    { schema: { response: { 200: readinessResponseSchema, 503: readinessResponseSchema } } },
    async (request, reply) => {
      const results = await Promise.allSettled(
        checks.map((check) => withTimeout(check, checkTimeoutMs)),
      );
      const failing = checks
        .filter((_check, index) => {
          const result = results[index];
          return result?.status !== 'fulfilled' || !result.value;
        })
        .map((check) => check.name);

      if (failing.length > 0) {
        request.log.warn({ failing }, 'readiness check failed');
        return reply.code(503).send({ status: 'not-ready' });
      }
      return { status: 'ready' as const };
    },
  );

  done();
};
