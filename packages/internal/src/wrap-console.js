/**
 * @file Wrap a Console with custom methods.
 *
 * Inspired by {@url https://github.com/vadimdemedes/patch-console}
 *
 * The wrapper preserves the original console as the prototype while replacing
 * selected methods with custom implementations. This lets callers override
 * behavior without rebuilding the full Console surface from scratch.
 */

import { fromTypedEntries } from './js-utils.js';

const consoleMethodNames = /** @type {const} */ ([
  'assert',
  'count',
  'countReset',
  'debug',
  'dir',
  'dirxml',
  'error',
  'group',
  'groupCollapsed',
  'groupEnd',
  'info',
  'log',
  'table',
  'time',
  'timeEnd',
  'timeLog',
  'trace',
  'warn',
]);

/**
 * Levels that structured logging adapters typically care about.
 *
 * @typedef {'trace' | 'debug' | 'info' | 'log' | 'warn' | 'error'} LogLevel
 * @type {Set<LogLevel>}
 */
const logLevels = new Set(['trace', 'debug', 'info', 'log', 'warn', 'error']);

/**
 * Callback invoked with the log level derived from the console method and the
 * rendered chunks written by that call.
 *
 * @callback OutputCallback
 * @param {LogLevel} level
 * @param {string[]} written
 * @returns {void}
 */

/**
 * Factory for one wrapped Console method. Methods outside `LogLevel` still map
 * to a fallback `level` of `'log'` so downstream code can route them through a
 * conventional logger API.
 *
 * @typedef {<M extends consoleMethodNames[number]>(method: M, level: LogLevel, originalConsole: Console) => Console[M]} MakeConsoleMethod
 */

/**
 * Build a Console-like object whose selected methods are provided by
 * `makeMethod`, while all other behavior is inherited from `original`.
 *
 * @param {Console} original
 * @param {MakeConsoleMethod} makeMethod
 * @returns {Console}
 */
export const wrapConsole = (original, makeMethod) => {
  const outerMethodsEntries = consoleMethodNames.map(method => {
    const maybeLevel = /** @type {LogLevel} */ (method);
    const level = logLevels.has(maybeLevel) ? maybeLevel : 'log';
    return /** @type {const} */ ([method, makeMethod(method, level, original)]);
  });

  return Object.create(
    original,
    fromTypedEntries(
      outerMethodsEntries.map(
        ([method, fn]) =>
          /** @type {const} */ ([
            method,
            {
              value: fn,
              writable: false,
              enumerable: false,
              configurable: false,
            },
          ]),
      ),
    ),
  );
};
