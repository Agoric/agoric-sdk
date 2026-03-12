import test from 'ava';

import { logger, runWithTrace, setLogTarget } from '../src/logger.ts';

test.afterEach(() => {
  setLogTarget();
});

test('logger follows the current global console by default', async t => {
  const calls: unknown[][] = [];
  const originalConsole = globalThis.console;
  const fakeConsole = {
    ...originalConsole,
    info: (...args: unknown[]) => {
      calls.push(args);
    },
  };

  /** @type {Promise<void>} */
  let resultP;
  globalThis.console = fakeConsole;
  try {
    resultP = runWithTrace('trace-123', () => {
      logger.info('hello', 'world');
    });
  } finally {
    globalThis.console = originalConsole;
  }
  await resultP;

  t.deepEqual(calls, [[`[trace-123] `, 'hello', 'world']]);
});

test('logger uses explicit override target when provided', t => {
  const calls: unknown[][] = [];

  setLogTarget({
    ...console,
    warn: (...args: unknown[]) => {
      calls.push(args);
    },
  });

  logger.warn('override', 'target');

  t.deepEqual(calls, [['override', 'target']]);
});
