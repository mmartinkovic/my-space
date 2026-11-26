import Fastify from 'fastify';
import { formatConfigIssues, loadConfig } from './config.ts';
import { createLoggerOptions } from './logger.ts';

const result = loadConfig(process.env);
if (!result.ok) {
  process.stderr.write(formatConfigIssues(result.issues));
  process.exit(1);
}
const { config } = result;

const app = Fastify({ logger: createLoggerOptions(config) });

await app.listen({ host: config.backendHost, port: config.backendPort });
