/* global globalThis */
/**
 * @file Node.js-specific console interception
 *
 * `patchConsole()` swaps `globalThis.console` for a wrapped outer console that
 * preserves the existing Console API while capturing the bytes written by
 * Node's own console implementation. The callback receives those rendered
 * string chunks after formatting has already happened, which makes this a
 * useful migration path for existing console-heavy programs that need to emit
 * structured JSONL without rewriting every call site.
 *
 * Structured loggers that run inside the callback must write through
 * `originalConsole`, not the patched global console, otherwise they would
 * re-enter the interception path and recurse forever.
 *
 * `middleConsole` is the console object whose methods are exposed after
 * patching. It defaults to the interceptor's inner console, but can be
 * replaced to layer interception around another Console-compatible object.
 *
 * Invariants:
 * - only one active patch is allowed at a time
 * - the returned restore function may only be used once
 * - restore reinstalls `originalConsole`
 *
 * @example
 * import patchConsole from './node/patch-console.js';
 * import '@endo/init';
 *
 * const restoreConsole = patchConsole((level, written, origConsole) => {
 *   origConsole[level]('> Intercepted:', written.join('').trimEnd());
 * }, console);
 *
 * console.log('hello, world');
 * // > Intercepted: hello, world
 * restoreConsole();
 * console.log('goodbye, friend');
 * // goodbye, friend
 * @import {OutputCallback} from '../wrap-console.js';
 */
import { wrapConsole } from '../wrap-console.js';
import { makeConsoleInterceptor } from './console-intercept.js';

/**
 * @import {LogLevel} from '../wrap-console.js';
 */

/** @typedef {((level: LogLevel, written: string[], origConsole: Console) => void)} UserCallback */

/** @type {OutputCallback} */
const defaultUserCallback = (level, written) => {
  originalConsole[level](written.join('').trimEnd());
};

/** @type {OutputCallback} */
let userCallback = defaultUserCallback;

export const originalConsole = console;
const systemCallback = (level, written) => {
  userCallback(level, written);
};

const { makeOuterConsoleMethod, innerConsole } =
  makeConsoleInterceptor(systemCallback);

// Initialize to the inner console to avoid missing output during SES lockdown.
globalThis.console = innerConsole;

/**
 * Patch `globalThis.console` and route each top-level console call through
 * `callback` with the rendered output chunks from Node's Console machinery.
 *
 * @param {OutputCallback} callback
 * @param {Console} [middleConsole]
 * @returns {() => void} restore function
 */
const patchConsole = (callback, middleConsole = innerConsole) => {
  if (userCallback !== defaultUserCallback) {
    throw Error('console already patched');
  }
  userCallback = callback;
  globalThis.console = wrapConsole(middleConsole, makeOuterConsoleMethod);
  return () => {
    if (userCallback === defaultUserCallback) {
      throw Error('console already restored');
    }
    userCallback = defaultUserCallback;
    globalThis.console = originalConsole;
  };
};
export default patchConsole;
