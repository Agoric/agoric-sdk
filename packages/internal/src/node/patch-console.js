/* global globalThis */
/**
 * @file Node.js-specific console interception
 * @example
 *   import patchConsole from './node/patch-console.js';
 *   import '@endo/init';
 *
 *   const restoreConsole = patchConsole((level, written, origConsole) => {
 *     origConsole[level]('> Intercepted:', written.join('').trimEnd());
 *   }, console);
 *
 *   console.log('hello, world');
 *   // > Intercepted: hello, world
 *   restoreConsole();
 *   console.log('goodbye, friend');
 *   // goodbye, friend
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
