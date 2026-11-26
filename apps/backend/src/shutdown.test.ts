import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createShutdownHandler } from './shutdown.ts';

const setup = (close: () => Promise<void>) => {
  const exit = vi.fn<(code: number) => void>();
  const log = { info: vi.fn(), error: vi.fn() };
  const handler = createShutdownHandler({ close, log, exit, timeoutMs: 10_000 });
  return { exit, log, handler };
};

describe('createShutdownHandler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('closes the app and exits 0', async () => {
    const close = vi.fn(() => Promise.resolve());
    const { exit, handler } = setup(close);
    await handler('SIGTERM');
    expect(close).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledExactlyOnceWith(0);
  });

  it('exits 1 when closing fails', async () => {
    const { exit, log, handler } = setup(() => Promise.reject(new Error('pool busy')));
    await handler('SIGTERM');
    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
    expect(log.error).toHaveBeenCalledOnce();
  });

  it('forces exit 1 when closing hangs past the timeout', async () => {
    const { exit, handler } = setup(() => new Promise<void>(() => undefined));
    void handler('SIGTERM');
    await vi.advanceTimersByTimeAsync(9_999);
    expect(exit).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('ignores repeated signals while shutting down', async () => {
    const close = vi.fn(() => Promise.resolve());
    const { exit, handler } = setup(close);
    await Promise.all([handler('SIGTERM'), handler('SIGINT')]);
    expect(close).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledOnce();
  });
});
