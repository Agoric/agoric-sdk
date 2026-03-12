/**
 * @file Intercept output from recursive Console methods.
 *
 * Inspired by {@url https://github.com/vadimdemedes/patch-console}
 */

import { PassThrough } from 'node:stream';

/**
 * @import { MakeConsoleMethod, OutputCallback } from '../wrap-console.js';
 */

/**
 * Create an intercepting console that captures output written starting from
 * each outer console method call, and invokes a callback with the captured output
 * when the outer method returns.
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

  const innerConsole = new console.Console({
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
