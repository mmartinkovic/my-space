import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from '@fastify/type-provider-zod';
import Fastify from 'fastify';
import type { LoggerOptions } from './logger.ts';
import { registerErrorHandling } from './plugins/error-handler.ts';

export type BuildAppOptions = {
  /** Logger options, or `false` to disable logging (tests). */
  readonly logger: LoggerOptions | false;
};

/** Composition root of the HTTP app; later tasks register their plugins and routes here. */
export const buildApp = ({ logger }: BuildAppOptions) => {
  const app = Fastify({ logger }).withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registerErrorHandling(app);
  return app;
};

export type App = ReturnType<typeof buildApp>;
