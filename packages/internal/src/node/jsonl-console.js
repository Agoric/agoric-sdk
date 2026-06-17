/* global globalThis */

/**
 * @file Two-phase installation of JSON Lines console output for Node programs
 * that use SES lockdown.
 *
 * Import this module before `@endo/init` or a direct `ses` lockdown so that
 * `patch-console.js` captures the initial host console and installs its
 * pre-lockdown inner console.  After lockdown, call `installJsonlConsole()`;
 * it wraps the post-lockdown console, which should be the SES causal console,
 * and forwards the rendered output through anylogger JSONL to the captured
 * initial console.
 */

import patchConsole from './patch-console.js';

/**
 * Route subsequent `console.*` calls through anylogger JSON Lines.
 *
 * The default `middleConsole` is `globalThis.console` at call time.  When this
 * function is called after lockdown with `consoleTaming: 'safe'`, that console
 * is the SES causal console.  Passing it explicitly to `patchConsole` keeps
 * causal error expansion in the path before anylogger serializes the captured
 * output.
 *
 * @param {object} options
 * @param {string} options.label
 * @param {Console} [options.middleConsole]
 * @returns {Promise<() => void>} restore function from `patchConsole`
 */
export const installJsonlConsole = async ({
  label,
  middleConsole = globalThis.console,
}) => {
  const { default: anylogger } = await import('../anylogger-jsonl.js');
  const log = anylogger(label);

  return patchConsole((level, written) => {
    if (!log.enabledFor(level)) {
      return;
    }
    log[level](written.join('').trimEnd());
  }, middleConsole);
};

// Export something useful for import-only pre-lockdown setup sites.
export default installJsonlConsole;
