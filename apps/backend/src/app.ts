import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from '@fastify/type-provider-zod';
import Fastify from 'fastify';
import type { LoggerOptions } from './logger.ts';
import { healthRoutes, type ReadinessCheck } from './modules/system/health.routes.ts';
import { registerErrorHandling } from './plugins/error-handler.ts';

export type BuildAppOptions = {
  /** Logger options, or `false` to disable logging (tests). */
  readonly logger: LoggerOptions | false;
  /**
   * CIDRs of the reverse proxy whose `X-Forwarded-For` is trusted (SECURITY.md §6).
   * Empty = trust no one, `request.ip` is the socket address.
   */
  readonly trustProxyCidrs: readonly string[];
  /** Dependencies `/api/health/ready` verifies. */
  readonly readinessChecks: readonly ReadinessCheck[];
};

const readinessCheckTimeoutMs = 2000;

/** Composition root of the HTTP app; later tasks register their plugins and routes here. */
export const buildApp = ({ logger, trustProxyCidrs, readinessChecks }: BuildAppOptions) => {
  const app = Fastify({
    logger,
    trustProxy: trustProxyCidrs.length > 0 ? [...trustProxyCidrs] : false,
  }).withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registerErrorHandling(app);
  app.register(healthRoutes, {
    checks: readinessChecks,
    checkTimeoutMs: readinessCheckTimeoutMs,
  });
  return app;
};

export type App = ReturnType<typeof buildApp>;
