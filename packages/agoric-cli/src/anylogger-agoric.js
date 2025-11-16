/* eslint-env node */
import {
  getEnvironmentOption,
  getEnvironmentOptionsList,
} from '@endo/env-options';
import { defineName } from '@agoric/internal/src/js-utils.js';

import anylogger from 'anylogger';
import chalk from 'chalk';

/**
 * @import {BaseLevels} from 'anylogger';
 * @typedef {keyof BaseLevels} LogLevel;
 */

const DEBUG_LIST = getEnvironmentOptionsList('DEBUG');

// Turn on debugging output with DEBUG=agoric or DEBUG=agoric:${level}
/**
 * As documented in ../../../docs/env.md, the log level defaults to "log" when
 * environment variable DEBUG is non-empty or `'unset'`,
 * and to the quieter "info" when it is set to an empty string,
 * but in either case is overridden if DEBUG
 * is a comma-separated list that contains "agoric:none" or "agoric:${level}" or
 * "agoric" (the last an alias for "agoric:debug").
 *
 * @type {string | undefined}
 */
let maxActiveLevel =
  DEBUG_LIST.length > 0 || getEnvironmentOption('DEBUG', 'unset') === 'unset'
    ? 'log'
    : 'info';
for (const level of DEBUG_LIST) {
  const parts = level.split(':');
  if (parts[0] !== 'agoric') {
    continue;
  }
  if (parts.length > 1) {
    maxActiveLevel = parts[1];
  } else {
    maxActiveLevel = 'debug';
  }
}
const selectedCode = anylogger.levels[maxActiveLevel];
const maxActiveLevelCode =
  selectedCode === undefined ? -Infinity : selectedCode;

const oldExt = anylogger.ext;
anylogger.ext = logger => {
  logger = oldExt(logger);

  /** @type {(level: LogLevel) => boolean} */
  const enabledFor = level => anylogger.levels[level] <= maxActiveLevelCode;
  logger.enabledFor = enabledFor;

  const prefix = logger.name.replace(/:/g, ': ');
  for (const [level, code] of Object.entries(anylogger.levels)) {
    if (maxActiveLevelCode >= code) {
      // Enable the printing with a prefix.
      const doLog = logger[level] || defineName(`dummy ${level}`, () => {});
      logger[level] = defineName(level, (...args) =>
        doLog(chalk.bold.blue(`${prefix}:`), ...args),
      );
    } else {
      // Disable printing.
      logger[level] = defineName(`dummy ${level}`, () => {});
    }
  }
  return logger;
};
