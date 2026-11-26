import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from '@fastify/type-provider-zod';
import type { ErrorResponse, ValidationIssue } from '@projectu/core-schemas';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { AppError, statusForKind } from '../errors.ts';

type ErrorBody = ErrorResponse['error'];

const send = (reply: FastifyReply, status: number, error: ErrorBody): FastifyReply =>
  reply.code(status).type('application/json').send({ error });

/** `/items/0/name` (JSON pointer from the validator) → `items.0.name`. */
const toDottedPath = (instancePath: string): string =>
  instancePath.replace(/^\//, '').replaceAll('/', '.');

/** Client errors Fastify raises itself (bad JSON, wrong content type, body too large). */
const clientErrors: Readonly<Partial<Record<number, ErrorBody>>> = {
  400: { code: 'bad-request', message: 'Malformed request' },
  413: { code: 'payload-too-large', message: 'Request body too large' },
  415: { code: 'unsupported-media-type', message: 'Unsupported content type' },
};

const clientStatusOf = (error: unknown): number | undefined => {
  if (typeof error !== 'object' || error === null || !('statusCode' in error)) {
    return undefined;
  }
  const { statusCode } = error;
  return typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500
    ? statusCode
    : undefined;
};

const internalError: ErrorBody = { code: 'internal', message: 'Internal server error' };

/**
 * One place that turns every failure into `{ error: { code, message, issues? } }`
 * (ARCHITECTURE.md §8): no stack traces or internal messages reach the client.
 */
export const registerErrorHandling = (app: FastifyInstance): void => {
  app.setNotFoundHandler((_request, reply) =>
    send(reply, 404, { code: 'not-found', message: 'Route not found' }),
  );

  app.setErrorHandler((error: unknown, request, reply) => {
    if (error instanceof AppError) {
      const { detail } = error;
      const status = statusForKind(detail.kind);
      request.log.info({ kind: detail.kind, status }, 'request failed with an expected error');
      return detail.kind === 'validation'
        ? send(reply, status, {
            code: 'validation',
            message: detail.message,
            issues: [...detail.issues],
          })
        : send(reply, status, { code: detail.code ?? detail.kind, message: detail.message });
    }

    if (hasZodFastifySchemaValidationErrors(error)) {
      const issues: ValidationIssue[] = error.validation.map((issue) => ({
        path: toDottedPath(issue.instancePath),
        message: issue.message ?? 'Invalid value',
      }));
      return send(reply, 400, { code: 'validation', message: 'Invalid request', issues });
    }

    if (isResponseSerializationError(error)) {
      request.log.error({ err: error }, 'response did not match its schema');
      return send(reply, 500, internalError);
    }

    const clientStatus = clientStatusOf(error);
    if (clientStatus !== undefined) {
      request.log.info({ status: clientStatus }, 'request rejected by the framework');
      return send(
        reply,
        clientStatus,
        clientErrors[clientStatus] ?? { code: 'client-error', message: 'Request rejected' },
      );
    }

    request.log.error({ err: error }, 'unhandled error');
    return send(reply, 500, internalError);
  });
};
