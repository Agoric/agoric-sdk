/* eslint-env node */
import {
  getEnvironmentOptionsList,
  getEnvironmentOption,
} from '@endo/env-options';
import anylogger from 'anylogger';


const DEBUG_LIST = getEnvironmentOptionsList('DEBUG');

const isVatLogNameColon = nameColon =>
  ['SwingSet:ls:', 'SwingSet:vat:'].some(sel => nameColon.startsWith(sel));

// As documented in ../../../docs/env.md, the log level defaults to "log" when
// environment variable DEBUG is non-empty or unset, and to the quieter "info"
// when it is set to an empty string.
/** @type {string | undefined} */
let maxActiveLevel =
  DEBUG_LIST.length > 0 || getEnvironmentOption('DEBUG', 'unset') === 'unset'
    ? 'log'
    : 'info';
// ...but is overridden if DEBUG is a comma-separated list that contains
// "agoric:none" or "agoric:${level}" or "agoric" (the last an alias for
// "agoric:debug").
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
  logger.enabledFor = lvl => maxActiveLevelCode >= anylogger.levels[lvl];

  const prefix = logger.name.replace(/:/g, ': ');

  const nameColon = `${logger.name}:`;
  const logBelongsToVat = isVatLogNameColon(nameColon);

  // If this is a vat log, then it is enabled by a selector in DEBUG_LIST.
  const logMatchesSelector =
    !logBelongsToVat ||
    DEBUG_LIST.some(selector => {
      const selectorColon = `${selector}:`;
      return nameColon.startsWith(selectorColon);
    });

  for (const [level, code] of Object.entries(anylogger.levels)) {
    if (logMatchesSelector && maxActiveLevelCode >= code) {
      // Enable the printing with a prefix.
      const doLog = logger[level];
      if (doLog) {
        logger[level] = (...args) => {
          // Add a timestamp.
          const now = new Date().toISOString();
          doLog(`${now} ${prefix}:`, ...args);
        };
      } else {
        logger[level] = () => {};
      }
    } else {
      // Disable printing.
      logger[level] = () => {};
    }
  }
  return logger;
};
