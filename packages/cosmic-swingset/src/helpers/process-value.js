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
        i += 1;
        flagValue = args[i];
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
   * @param {string} options.trueValue
   * @returns {string | undefined}
   */
  const getPath = ({ envName, flagName, trueValue }) => {
    let option;
    if (envName) {
      option = env[envName];
    } else if (flagName) {
      option = getFlag(flagName);
    } else {
      return undefined;
    }

    switch (option) {
      case '0':
      case 'false':
      case false:
        return undefined;
      case '1':
      case 'true':
      case true:
        return trueValue;
      default:
        if (option) {
          return pathResolve(option);
        } else if (envName && flagName) {
          return getPath({ flagName, trueValue });
        } else {
          return undefined;
        }
    }
  };

  return harden({ getFlag, getPath });
};
