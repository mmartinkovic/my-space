import type { FastifyRequest, FastifyServerOptions } from 'fastify';
import type { Config } from './config.ts';

export const redactedValue = '[redacted]';

/** Log paths whose values are replaced (SECURITY.md §2 I2). */
export const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-telegram-bot-api-secret-token"]',
  'res.headers["set-cookie"]',
  'headers.authorization',
  'headers.cookie',
  'headers["x-telegram-bot-api-secret-token"]',
  'token',
  '*.token',
  'password',
  '*.password',
  'secret',
  '*.secret',
];

const icalTokenInPath = /^(\/ical\/[^/?#]+\/)[^/?#]+(\.ics)/;
const tokenInQuery = /([?&]token=)[^&#]*/g;

/** Masks secrets that travel in URLs: iCal feed tokens in the path and `token` query params. */
export const maskUrl = (url: string): string =>
  url.replace(icalTokenInPath, `$1${redactedValue}$2`).replace(tokenInQuery, `$1${redactedValue}`);

const serializeRequest = (req: FastifyRequest) => ({
  method: req.method,
  url: maskUrl(req.url),
  host: req.host,
  remoteAddress: req.ip,
});

/** Fastify's logger options (Fastify settings + pino settings), without the boolean shorthand. */
export type LoggerOptions = Exclude<FastifyServerOptions['logger'], boolean | undefined>;

export const createLoggerOptions = (config: Pick<Config, 'logLevel'>): LoggerOptions => ({
  level: config.logLevel,
  redact: { paths: redactPaths, censor: redactedValue },
  serializers: { req: serializeRequest },
});
