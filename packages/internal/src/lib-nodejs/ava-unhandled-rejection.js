// @ts-check
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

import engineGC from './engine-gc.js';
import { makeGcAndFinalize } from './gc-and-finalize.js';

/**
 * @import {ExecutionContext, ImplementationFn, Macro, MacroDeclarationOptions,TestFn} from 'ava';
 */

/** Not an official AVA feature, so prefix with `AGORIC_` */
export const AGORIC_AVA_EXPECT_UNHANDLED_REJECTIONS =
  'AGORIC_AVA_EXPECT_UNHANDLED_REJECTIONS';
/** Backwards compatibility... */
export const AVA_EXPECT_UNHANDLED_REJECTIONS =
  AGORIC_AVA_EXPECT_UNHANDLED_REJECTIONS;

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
  const handledLate = new Set();
  const tokenByPromise = new WeakMap();
  // Finalization callbacks run on the main thread; `pending` is only mutated
  // here and after the flushes in countUnhandled, so no extra synchronization
  // is required.
  const registry = new FinalizationRegistry(token => {
    if (pending.delete(token)) {
      // Don't count promises that were handled late.
      if (!handledLate.delete(token)) {
        unhandled += 1;
      }
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
    const token = tokenByPromise.get(promise);
    tokenByPromise.delete(promise);
    // Mark this token as handled late so it won't be counted when the
    // finalizer runs. We remove it from `pending` to exclude it from
    // the pending count, and track it in `handledLate` to avoid counting
    // it when GC'd.
    if (token && pending.delete(token)) {
      handledLate.add(token);
    }
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
 * @param {string} name parent test name
 * @param {number} expectedUnhandled how many unhandled rejections this subtest should expect
 * @returns name for a subtest that expects the given number of unhandled rejections
 */
export const subtest = (name, expectedUnhandled) =>
  `(${expectedUnhandled} rejection subtest) ${name}`;

/**
 * @deprecated Use `makeExpectUnhandledRejectionMacro` instead, which uses the
 * test's first argument title instead of an explicit `name`, and can
 * optionallywrap an inner `Macro`.
 *
 * @template C
 * @param {object} powers
 * @param {TestFn<C>} powers.test
 * @param {string} powers.importMetaUrl
 * @returns {( expectedUnhandled: number) => Macro<[name: string, impl: (t:
 *   ExecutionContext<C>) => any], C>}
 */
export const makeExpectUnhandledRejection = ({ test, importMetaUrl }) => {
  const self = fileURLToPath(importMetaUrl);
  const gcAndFinalize = makeGcAndFinalize(engineGC);

  if (process.env[AVA_EXPECT_UNHANDLED_REJECTIONS]) {
    return expectedUnhandled =>
      test.macro({
        title: (_providedTitle = '', name, _impl) =>
          subtest(name, expectedUnhandled),
        exec: async (t, _name, impl) => {
          const rawExpected =
            process.env[AVA_EXPECT_UNHANDLED_REJECTIONS] ?? expectedUnhandled;
          const expected = Number(rawExpected);
          if (!Number.isSafeInteger(expected) || expected < 0) {
            t.fail(
              `expected unhandled rejection count to be a natural number, got ${rawExpected}`,
            );
          }
          const { unhandled, pending, seenUnhandled } = await countUnhandled(
            () => impl(t),
            { gcAndFinalize },
          );
          const totalUnhandled = unhandled + pending;
          if (totalUnhandled !== expected) {
            t.fail(
              `expected ${expected} unhandled promise rejections, got ${totalUnhandled} (of ${seenUnhandled} seen, ${pending} pending finalization)`,
            );
          }
        },
      });
  }

  return expectedUnhandled =>
    test.macro({
      title: (_providedTitle = '', name, _impl) => name,
      exec: async (t, name, _impl) =>
        new Promise((resolve, reject) => {
          const ps = spawn(
            'ava',
            [self, '-m', subtest(name, expectedUnhandled)],
            {
              env: {
                ...process.env,
                [AVA_EXPECT_UNHANDLED_REJECTIONS]: `${expectedUnhandled}`,
              },
              stdio: ['ignore', 'inherit', 'inherit', 'ignore'],
            },
          );

          ps.on('close', code => {
            t.is(code, 0, `got exit code ${code}, expected 0 for ${name}`);
            resolve();
          });
          ps.on('error', reject);
        }),
    });
};

/**
 * @template [C=unknown]
 * @param {object} powers
 * @param {TestFn<C>} powers.test
 * @param {string} powers.importMetaUrl
 */
export const makeExpectUnhandledRejectionMacro =
  ({ test, importMetaUrl }) =>
  /**
   * @template {any[]} [A=[ImplementationFn<any[], any>, ...any[]]]
   * @param {number} numUnhandled
   * @param {Macro<A, C>} [innerMacro]
   * @returns {Macro<A, C>}
   */
  (numUnhandled, innerMacro) => {
    const expector = makeExpectUnhandledRejection({
      test,
      importMetaUrl,
    })(numUnhandled);

    /**
     * @param {A} args
     * @returns {(t: ExecutionContext<C>) => any}
     */
    const makeImpl = args =>
      innerMacro ? async t => innerMacro.exec(t, ...args) : args[0];

    /** @type {string} */
    let expectorName;
    return test.macro(
      /** @type {MacroDeclarationOptions<A, C>} */ ({
        title(providedTitle = '', ...args) {
          const innerTitle =
            innerMacro?.title?.(providedTitle, ...args) ?? providedTitle;
          const impl = makeImpl(args);
          expectorName =
            expector.title?.(innerTitle, innerTitle, impl) ?? innerTitle;
          return expectorName;
        },
        async exec(t, ...args) {
          const impl = makeImpl(args);
          return expector.exec(t, expectorName, impl);
        },
      }),
    );
  };
