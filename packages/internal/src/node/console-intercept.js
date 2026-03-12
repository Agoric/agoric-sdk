/**
 * @file Intercept output from recursive Console methods.
 *
 * Inspired by {@url https://github.com/vadimdemedes/patch-console}
 *
 * The interceptor separates responsibilities between:
 * - an inner console whose stdout/stderr writes are captured
 * - outer wrapped console methods that call the original Console API and then
 *   flush the chunks written during that one top-level call
 *
 * Nested console activity is grouped into the same buffer as the outermost
 * call, which keeps recursive formatting and helper methods from producing
 * fragmented callbacks. Any write that happens outside an active outer call is
 * treated as an error-level fallback.
 */

import { Console } from 'node:console';
import { PassThrough } from 'node:stream';

/**
 * @import { MakeConsoleMethod, OutputCallback } from '../wrap-console.js';
 */

/**
 * Create an intercepting console that captures output written starting from
 * each outer console method call, and invokes a callback with the captured
 * output when the outer method returns.
 *
 * Both stdout and stderr are wired to the same `PassThrough`, so the callback
 * receives rendered chunks without preserving the original stream split. This
 * is sufficient for structured envelope logging because the outer method's
 * derived `level` is reported separately.
 *
 * @param {OutputCallback} callback
 * @returns {{ innerConsole: Console, makeOuterConsoleMethod: MakeConsoleMethod }}
 */
export const makeConsoleInterceptor = callback => {
  /** @type {string[] | null} */
  let grouped = null;

  const output = new PassThrough();
  output.write = (data, cb) => {
    if (cb) {
      void Promise.resolve().then(() => cb(null));
    }

    if (grouped) {
      grouped.push(data);
    } else {
      callback('error', [data]);
    }
    return true;
  };

  const innerConsole = new Console({
    stdout: output,
    stderr: output,
  });

  /**
   * @type {MakeConsoleMethod}
   */
  const makeOuterConsoleMethod =
    (method, level, originalConsole) =>
    /** @param {unknown[]} args */
    (...args) => {
      const isOuter = !grouped;
      if (isOuter) {
        grouped = [];
      }
      try {
        // Invoke the original Console method so Node performs its normal
        // formatting before the inner console captures the resulting writes.
        // @ts-expect-error unused comma
        return (1, originalConsole[method]).apply(originalConsole, args);
      } finally {
        if (isOuter) {
          // Reset state and invoke callback.
          const written = grouped || [];
          grouped = null;
          callback(level, written);
        }
      }
    };

  return { makeOuterConsoleMethod, innerConsole };
};
