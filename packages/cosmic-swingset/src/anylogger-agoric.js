/* eslint-env node */
import {
  getEnvironmentOptionsList,
  getEnvironmentOption,
} from '@endo/env-options';
import anylogger from 'anylogger';
import { defineName } from '@agoric/internal/src/js-utils.js';

/** @import {BaseLevels} from 'anylogger'; */
/** @typedef {keyof BaseLevels} LogLevel; */

const VAT_LOGGER_PREFIXES = Object.freeze([
  'SwingSet:vat',
  'SwingSet:ls', // "ls" for "liveslots"
]);

const DEBUG_LIST = getEnvironmentOptionsList('DEBUG');

/**
 * As documented in ../../../docs/env.md, the log level defaults to "log" when
 * environment variable DEBUG is non-empty or unset, and to the quieter "info"
 * when it is set to an empty string, but in either case is overridden if DEBUG
 * is a comma-separated list that contains "agoric:none" or "agoric:${level}" or
 * "agoric" (the last an alias for "agoric:debug").
 *
 * @type {string | undefined}
 */
let maxActiveLevel =
  DEBUG_LIST.length > 0 || getEnvironmentOption('DEBUG', 'unset') === 'unset'
    ? 'log'
    : 'info';
for (const selector of DEBUG_LIST) {
  const fullSelector = selector === 'agoric' ? 'agoric:debug' : selector;
  const [_, detail] = fullSelector.match(/^agoric:(.*)/gs) || [];
  if (detail) {
    maxActiveLevel = detail === 'none' ? undefined : detail;
  }
}
const maxActiveLevelCode = /** @type {number} */ (
  (maxActiveLevel && anylogger.levels[maxActiveLevel]) ?? -Infinity
);

const oldExt = anylogger.ext;
anylogger.ext = logger => {
  logger = oldExt(logger);

  /** @type {(level: LogLevel) => boolean} */
  const enabledFor = level => anylogger.levels[level] <= maxActiveLevelCode;
  logger.enabledFor = enabledFor;

  const nameColon = `${logger.name}:`;
  const label = logger.name.replaceAll(':', ': ');

  // Vat logs are suppressed unless matched by a prefix in DEBUG_LIST.
  const suppressed =
    VAT_LOGGER_PREFIXES.some(prefix => nameColon.startsWith(`${prefix}:`)) &&
    !DEBUG_LIST.some(prefix => nameColon.startsWith(`${prefix}:`));

  const levels = /** @type {LogLevel[]} */ (Object.keys(anylogger.levels));
  for (const level of levels) {
    const impl = logger[level];
    const disabled = !impl || suppressed || !enabledFor(level);
    logger[level] = disabled
      ? defineName(`dummy ${level}`, () => {})
      : defineName(level, (...args) => {
          // Prepend a timestamp and label.
          const timestamp = new Date().toISOString();
          impl(`${timestamp} ${label}:`, ...args);
        });
  }
  return logger;
};
