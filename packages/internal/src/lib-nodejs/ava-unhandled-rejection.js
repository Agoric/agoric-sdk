// @ts-check
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

import engineGC from './engine-gc.js';
import { makeGcAndFinalize } from './gc-and-finalize.js';

/**
 * @import {ExecutionContext, Macro, TestFn} from 'ava';
 */

export const AVA_EXPECT_UNHANDLED_REJECTIONS =
  'AGORIC_AVA_EXPECT_UNHANDLED_REJECTIONS';

export const SUBTEST_PREFIX = '(unhandled rejection subprocess): ';

const delayTurn = () => new Promise(resolve => setImmediate(resolve));
const settleUnhandled = async () => {
  await delayTurn();
  await delayTurn();
};

const stripListeners = event => {
  const listeners = process.listeners(event);
  for (const listener of listeners) {
    process.off(event, listener);
  }
  return () => {
    for (const listener of listeners) {
      process.on(event, listener);
    }
  };
};

const makeUnhandledTracker = () => {
  let unhandled = 0;
  let seenUnhandled = 0;
  const pending = new Set();
  const tokenByPromise = new WeakMap();
  // Finalization callbacks run on the main thread; `pending` is only mutated
  // here and after the flushes in countUnhandled, so no extra synchronization
  // is required.
  const registry = new FinalizationRegistry(token => {
    if (pending.delete(token)) {
      // We count once per promise when it is collected, regardless of whether
      // a handler was attached later.
      unhandled += 1;
    }
  });

  const onUnhandled = (_reason, promise) => {
    seenUnhandled += 1;
    const token = Symbol('unhandledRejection');
    tokenByPromise.set(promise, token);
    pending.add(token);
    registry.register(promise, token, token);
  };

  const onHandledLate = promise => {
    tokenByPromise.delete(promise);
    // Keep the token in `pending` so late handlers don't mask an earlier
    // unhandled notification; we want to count every unhandledRejection event
    // that fired in the subprocess even if it is observed later. The registry
    // callback runs at most once per promise on the main thread, so this does
    // not double-count. Tokens stay in `pending` only until the promise is GC'd
    // and the finalizer fires to delete them.
  };

  const snapshot = () => ({ unhandled, pending: pending.size, seenUnhandled });

  return {
    onUnhandled,
    onHandledLate,
    snapshot,
  };
};

/**
 * Count unhandled rejections for the given work by running it after removing
 * any existing listeners (like AVA's) and waiting for GC/finalization.
 *
 * @param {() => any | Promise<any>} work
 * @param {object} powers
 * @param {() => Promise<void>} powers.gcAndFinalize
 */
export const countUnhandled = async (work, { gcAndFinalize }) => {
  await null; // for Jessie
  const tracker = makeUnhandledTracker();
  const restoreUnhandled = stripListeners('unhandledRejection');
  const restoreHandled = stripListeners('rejectionHandled');
  const flushUnhandled = async () => {
    await settleUnhandled();
    await gcAndFinalize();
  };
  process.on('unhandledRejection', tracker.onUnhandled);
  process.on('rejectionHandled', tracker.onHandledLate);
  try {
    await work();
  } finally {
    // Two passes through settle+GC help ensure finalizers run before we snapshot
    // the unhandled state across Node/XS runtimes, even when callbacks queue
    // additional macrotasks. This count happens after the flushes so finalizer
    // timing cannot race the snapshot.
    await flushUnhandled();
    await flushUnhandled();
    await settleUnhandled();
    process.off('unhandledRejection', tracker.onUnhandled);
    process.off('rejectionHandled', tracker.onHandledLate);
    restoreUnhandled();
    restoreHandled();
  }
  return tracker.snapshot();
};

/**
 * @template C
 * @param {object} powers
 * @param {TestFn<C>} powers.test
 * @param {string} powers.importMetaUrl
 * @returns {(
 *   expectedUnhandled: number,
 * ) => Macro<[name: string, impl: (t: ExecutionContext<C>) => any], C>}
 */
export const makeExpectUnhandledRejection = ({ test, importMetaUrl }) => {
  const self = fileURLToPath(importMetaUrl);
  const gcAndFinalize = makeGcAndFinalize(engineGC);

  if (process.env[AVA_EXPECT_UNHANDLED_REJECTIONS]) {
    return _expectedUnhandled =>
      test.macro({
        title: (_, name, _impl) => SUBTEST_PREFIX + name,
        exec: async (t, _name, impl) => {
          const rawExpected =
            process.env[AVA_EXPECT_UNHANDLED_REJECTIONS] ?? _expectedUnhandled;
          const expected = Number(rawExpected);
          if (!Number.isFinite(expected)) {
            throw Error(
              `expected unhandled rejection count must be numeric, got ${rawExpected}`,
            );
          }
          const { unhandled, pending, seenUnhandled } = await countUnhandled(
            () => impl(t),
            { gcAndFinalize },
          );
          const totalUnhandled = unhandled + pending;
          if (totalUnhandled !== expected) {
            throw Error(
              `got ${totalUnhandled} (of ${seenUnhandled} seen, ${pending} pending finalization) unhandled rejections, expected ${expected}`,
            );
          }
        },
      });
  }

  return expectedUnhandled =>
    test.macro({
      title: (_, name, _impl) => name,
      exec: async (t, name, _impl) =>
        new Promise((resolve, reject) => {
          const ps = spawn('ava', [self, '-m', SUBTEST_PREFIX + name], {
            env: {
              ...process.env,
              [AVA_EXPECT_UNHANDLED_REJECTIONS]: `${expectedUnhandled}`,
            },
            stdio: ['ignore', 'inherit', 'inherit', 'ignore'],
          });

          ps.on('close', code => {
            t.is(code, 0, `got exit code ${code}, expected 0 for ${name}`);
            resolve();
          });
          ps.on('error', reject);
        }),
    });
};
