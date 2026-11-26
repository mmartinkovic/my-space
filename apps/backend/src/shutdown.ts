export type ShutdownDependencies = {
  /** Closes the app; resources (server, pg-boss, DB pool) close via Fastify `onClose` hooks. */
  readonly close: () => Promise<void>;
  readonly log: {
    readonly info: (fields: object, message: string) => void;
    readonly error: (fields: object, message: string) => void;
  };
  readonly exit: (code: number) => void;
  /** Hard limit; after it the process exits with code 1 even if closing hangs. */
  readonly timeoutMs: number;
};

/**
 * Returns a signal handler for graceful shutdown (SIGTERM from Docker, SIGINT from Ctrl+C).
 * Repeated signals while shutting down are ignored.
 */
export const createShutdownHandler = ({ close, log, exit, timeoutMs }: ShutdownDependencies) => {
  let shuttingDown = false;

  return async (signal: string): Promise<void> => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    log.info({ signal, timeoutMs }, 'shutting down');

    const timer = setTimeout(() => {
      log.error({ signal, timeoutMs }, 'shutdown timed out, forcing exit');
      exit(1);
    }, timeoutMs);

    try {
      await close();
      clearTimeout(timer);
      log.info({ signal }, 'shutdown complete');
      exit(0);
    } catch (error: unknown) {
      clearTimeout(timer);
      log.error({ signal, err: error }, 'shutdown failed');
      exit(1);
    }
  };
};
