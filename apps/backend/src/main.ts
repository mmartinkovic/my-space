import { buildApp } from './app.ts';
import { formatConfigIssues, loadConfig } from './config.ts';
import { createLoggerOptions } from './logger.ts';
import { createShutdownHandler } from './shutdown.ts';

const shutdownTimeoutMs = 10_000;

const result = loadConfig(process.env);
if (!result.ok) {
  process.stderr.write(formatConfigIssues(result.issues));
  process.exit(1);
}
const { config } = result;

const app = buildApp({
  logger: createLoggerOptions(config),
  trustProxyCidrs: config.trustProxyCidrs,
  readinessChecks: [],
});

const shutdown = createShutdownHandler({
  close: () => app.close(),
  log: app.log,
  exit: (code) => process.exit(code),
  timeoutMs: shutdownTimeoutMs,
});
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, (received) => void shutdown(received));
}

// The HTTP server runs in every role: `/api/health/*` serves the container healthcheck.
// Role-specific parts plug in here: API modules (from P0-06a) and the pg-boss worker (P0-09a).
app.log.info({ roles: config.backendRoles }, 'starting backend');
await app.listen({ host: config.backendHost, port: config.backendPort });
