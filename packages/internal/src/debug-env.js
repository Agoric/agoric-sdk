import {
  getEnvironmentOption,
  getEnvironmentOptionsList,
} from '@endo/env-options';

const DEFAULT_DEBUG_ENV_NAME = 'DEBUG';
const DEFAULT_SELECTOR_PREFIX = 'agoric';
const DEFAULT_SUPPRESSED_PREFIXES = Object.freeze([
  'SwingSet:vat',
  'SwingSet:ls',
]);

/**
 * Parsed DEBUG environment settings shared by logging adapters.
 *
 * `debugList` is interpreted with the following rules:
 * - unset `DEBUG` or any non-empty selector list defaults to `log`
 * - empty-string `DEBUG` defaults to `info`
 * - a bare `selectorPrefix` aliases to `${selectorPrefix}:debug`
 * - the last matching `${selectorPrefix}:...` selector wins
 * - unknown level names, including `none`, disable output via `-Infinity`
 *
 * `isSuppressedLogger(name)` applies an additional policy for noisy runtime
 * logger prefixes. A logger is suppressed only when its name matches one of the
 * configured `suppressedPrefixes` and no raw DEBUG selector prefix explicitly
 * unsuppresses it.
 *
 * @typedef {object} ParseDebugEnvOptions
 * @property {string} [debugEnvName]
 * @property {string | undefined} [debugValue]
 * @property {string[]} [debugList]
 * @property {string} [selectorPrefix]
 * @property {string[]} [suppressedPrefixes]
 */

/**
 * @typedef {object} ParsedDebugEnv
 * @property {string | undefined} debugValue
 * @property {string[]} debugList
 * @property {string | undefined} maxActiveLevel
 * @property {number} maxActiveLevelCode
 * @property {(level: string | undefined) => boolean} enabledFor
 * @property {(name: string) => boolean} isSuppressedLogger
 */

/**
 * Parse DEBUG-related environment state for anylogger adapters.
 *
 * @param {Record<string, number>} levels
 * @param {ParseDebugEnvOptions} [options]
 * @returns {ParsedDebugEnv}
 */
export const parseDebugEnv = (levels, options = {}) => {
  const {
    debugEnvName = DEFAULT_DEBUG_ENV_NAME,
    debugValue = getEnvironmentOption(debugEnvName, 'unset'),
    debugList = getEnvironmentOptionsList(debugEnvName),
    selectorPrefix = DEFAULT_SELECTOR_PREFIX,
    suppressedPrefixes = DEFAULT_SUPPRESSED_PREFIXES,
  } = options;

  const bareSelector = selectorPrefix;
  const prefixedSelector = `${selectorPrefix}:`;

  /** @type {string | undefined} */
  let maxActiveLevel = debugList.length || debugValue === 'unset' ? 'log' : 'info';
  for (const selector of debugList) {
    const fullSelector =
      selector === bareSelector ? `${prefixedSelector}debug` : selector;
    if (fullSelector.startsWith(prefixedSelector)) {
      maxActiveLevel = fullSelector.slice(prefixedSelector.length);
    }
  }

  const maxActiveLevelCode = levels[maxActiveLevel] ?? -Infinity;

  /**
   * @param {string | undefined} level
   * @returns {boolean}
   */
  const enabledFor = level =>
    level !== undefined && levels[level] <= maxActiveLevelCode;

  /**
   * @param {string} name
   * @returns {boolean}
   */
  const isSuppressedLogger = name => {
    const nameColon = `${name}:`;
    const matchesSuppressedPrefix = suppressedPrefixes.some(prefix =>
      nameColon.startsWith(`${prefix}:`),
    );
    return (
      matchesSuppressedPrefix &&
      !debugList.some(selector => nameColon.startsWith(`${selector}:`))
    );
  };

  return harden({
    debugValue,
    debugList,
    maxActiveLevel,
    maxActiveLevelCode,
    enabledFor,
    isSuppressedLogger,
  });
};
