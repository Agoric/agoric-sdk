/* global globalThis */

import patchConsole from '@agoric/internal/src/node/patch-console.js';
import anylogger from '@agoric/internal/vendor/anylogger.js';

const log = anylogger('ymax-planner');

/**
 * After lockdown, `globalThis.console` is the SES causal console.  Pass it as
 * the middle console so ordinary `console.log(Error(...))` first gets expanded
 * by SES, then `patch-console` captures the rendered output and forwards it to
 * anylogger JSONL.
 *
 * If we omit this argument, `patchConsole` defaults to its pre-lockdown
 * `innerConsole`, bypassing the causal console entirely.
 */
const postLockdownConsole = globalThis.console;

patchConsole((level, written) => {
  if (!log.enabledFor(level)) {
    return;
  }
  log[level](written.join('').trimEnd());
}, postLockdownConsole);
