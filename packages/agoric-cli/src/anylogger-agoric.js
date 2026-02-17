/**
 * @file agoric-cli anylogger adapter.
 *
 * Use this module as a side-effect import from CLI entrypoints when you want
 * Agoric-prefixed loggers to respect `DEBUG` and emit styled output.
 *
 * How it works:
 * - Reads `DEBUG` values like `agoric` or `agoric:<level>`.
 * - Overrides `anylogger.ext` to enable/disable levels consistently.
 * - Wraps enabled log methods with an `agoric`-style prefix.
 *
 * Why this file exists alongside `packages/cosmic-swingset/src/anylogger-agoric.js`:
 * - This CLI adapter is optimized for interactive terminal UX (colored labels).
 * - Cosmic-swingset logging targets chain/runtime service logs (timestamps,
 *   vat-prefix suppression, and `agoric:none` semantics).
 * - Keeping separate adapters avoids coupling CLI output behavior to
 *   cosmic-swingset operational logging requirements.
 */
/* eslint-env node */
import {
  getEnvironmentOption,
  getEnvironmentOptionsList,
} from '@endo/env-options';
import anylogger from '@agoric/internal/vendor/anylogger.js';
import chalk from 'chalk';

const DEBUG_LIST = getEnvironmentOptionsList('DEBUG');

// Turn on debugging output with DEBUG=agoric or DEBUG=agoric:${level}
let selectedLevel =
  DEBUG_LIST.length || getEnvironmentOption('DEBUG', 'unset') === 'unset'
    ? 'log'
    : 'info';
for (const level of DEBUG_LIST) {
  const parts = level.split(':');
  if (parts[0] !== 'agoric') {
    continue;
  }
  if (parts.length > 1) {
    selectedLevel = parts[1];
  } else {
    selectedLevel = 'debug';
  }
}
const selectedCode = anylogger.levels[selectedLevel];
const globalCode = selectedCode === undefined ? -Infinity : selectedCode;

const oldExt = anylogger.ext;
/** @type {typeof anylogger.ext} */
anylogger.ext = (l, ...rest) => {
  l = oldExt(l, ...rest);
  l.enabledFor = lvl => globalCode >= anylogger.levels[lvl];

  const prefix = l.name.replace(/:/g, ': ');
  for (const [level, code] of Object.entries(anylogger.levels)) {
    if (globalCode >= code) {
      // Enable the printing with a prefix.
      const doLog = l[level] || (() => {});
      l[level] = (...args) => doLog(chalk.bold.blue(`${prefix}:`), ...args);
    } else {
      // Disable printing.
      l[level] = () => {};
    }
  }
  return l;
};
