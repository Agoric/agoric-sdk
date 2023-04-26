// @ts-check

import { resolve as pathResolve } from 'path';

export const makeProcessValue = ({ env, args }) => {
  /**
   * @param {string} flagName
   * @param {string | undefined} [deflt]
   * @returns {string | undefined}
   */
  const getFlag = (flagName, deflt) => {
    let flagValue = deflt;
    const envValue =
      env[`AG_CHAIN_COSMOS_${flagName.toUpperCase().replace(/-/g, '_')}`];
    if (envValue !== undefined) {
      flagValue = envValue;
    }
    const flag = `--${flagName}`;
    const flagEquals = `--${flagName}=`;
    for (let i = 0; i < args.length; i += 1) {
      const arg = args[i];
      if (arg === flag) {
        if (args.length > i + 1 && !args[i + 1].startsWith('--')) {
          i += 1;
          flagValue = args[i];
        } else {
          flagValue = '';
        }
      } else if (arg.startsWith(flagEquals)) {
        flagValue = arg.substr(flagEquals.length);
      }
    }
    return flagValue;
  };

  /**
   * @param {object} options
   * @param {string} [options.envName]
   * @param {string} [options.flagName]
   * @param {boolean} [options.emptyFlagIsTrue]
   * @returns {boolean | undefined}
   */
  const getBoolean = ({ envName, flagName, emptyFlagIsTrue = true }) => {
    let option;
    if (flagName) {
      option = getFlag(flagName);
    } else if (envName) {
      option = env[envName];
    } else {
      return undefined;
    }

    switch (option) {
      case '0':
      case 'false':
      case false:
        return false;
      case '1':
      case 'true':
      case true:
        return true;
      default:
        if (option === '' && flagName && emptyFlagIsTrue) {
          return true;
        }
        if (option === undefined && envName && flagName) {
          return getBoolean({ envName, emptyFlagIsTrue });
        }
        return undefined;
    }
  };

  /**
   * @param {object} options
   * @param {string} [options.envName]
   * @param {string} [options.flagName]
   * @returns {number | undefined}
   */
  const getInteger = ({ envName, flagName }) => {
    let option;
    if (flagName) {
      option = getFlag(flagName);
    } else if (envName) {
      option = env[envName];
    } else {
      return undefined;
    }

    if (option) {
      const value = Number.parseInt(option, 10);
      return String(value) === option ? value : undefined;
    } else if (option === undefined && flagName && envName) {
      return getInteger({ envName });
    }

    return undefined;
  };

  /**
   * @param {object} options
   * @param {string} [options.envName]
   * @param {string} [options.flagName]
   * @param {string} [options.trueValue]
   * @returns {string | undefined}
   */
  const getPath = ({ envName, flagName, trueValue }) => {
    if (trueValue !== undefined) {
      const boolValue = getBoolean({ envName, flagName });
      if (boolValue !== undefined) {
        return boolValue ? trueValue : undefined;
      }
    }

    let option;
    if (flagName) {
      option = getFlag(flagName);
    } else if (envName) {
      option = env[envName];
    } else {
      return undefined;
    }

    if (option) {
      return pathResolve(option);
    } else if (trueValue && envName && flagName) {
      return getPath({ envName, trueValue });
    } else {
      return undefined;
    }
  };

  return harden({ getFlag, getBoolean, getInteger, getPath });
};
