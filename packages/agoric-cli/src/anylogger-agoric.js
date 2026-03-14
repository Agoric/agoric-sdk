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
import { parseDebugEnv } from '@agoric/internal/src/debug-env.js';
import anylogger from '@agoric/internal/vendor/anylogger.js';
import chalk from 'chalk';

const { maxActiveLevelCode: globalCode } = parseDebugEnv(anylogger.levels);

const oldExt = anylogger.ext;
/** @type {typeof anylogger.ext} */
anylogger.ext = (l, ...rest) => {
  const logger = oldExt(l, ...rest);
  logger.enabledFor = lvl =>
    lvl !== undefined && globalCode >= anylogger.levels[lvl];

  const prefix = logger.name.replace(/:/g, ': ');
  const fallbackSink = console.log.bind(console);
  for (const [level, code] of Object.entries(anylogger.levels)) {
    if (globalCode >= code) {
      // Enable the printing with a prefix.
      const doLog =
        (typeof console[level] === 'function' &&
          console[level].bind(console)) ||
        fallbackSink;
      logger[level] = (...args) =>
        doLog(chalk.bold.blue(`${prefix}:`), ...args);
    } else {
      // Disable printing.
      logger[level] = () => {};
    }
  }
  return logger;
};
