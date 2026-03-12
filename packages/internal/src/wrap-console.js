/**
 * @file Wrap a Console with custom methods.
 *
 * Inspired by {@url https://github.com/vadimdemedes/patch-console}
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
 * @typedef {'trace' | 'debug' | 'info' | 'log' | 'warn' | 'error'} LogLevel
 * @type {Set<LogLevel>}
 */
const logLevels = new Set(['trace', 'debug', 'info', 'log', 'warn', 'error']);

/**
 * @callback OutputCallback
 * @param {LogLevel} level
 * @param {string[]} written
 * @returns {void}
 */

/**
 * @typedef {<M extends consoleMethodNames[number]>(method: M, level: LogLevel, originalConsole: Console) => Console[M]} MakeConsoleMethod
 */

/**
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
