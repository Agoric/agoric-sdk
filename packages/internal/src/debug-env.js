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
 * @param {Record<string, number>} levels
 * @param {object} [options]
 * @param {string} [options.debugEnvName]
 * @param {string | undefined} [options.debugValue]
 * @param {string[]} [options.debugList]
 * @param {string} [options.selectorPrefix]
 * @param {string[]} [options.suppressedPrefixes]
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

