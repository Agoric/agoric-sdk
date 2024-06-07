import { useRegistry, useChain, ConfigContext } from 'starshipjs';

export const makeGetConfigFile =
  (path: Pick<typeof import('path'), 'dirname' | 'join'>) =>
  (filePath: string) =>
    path.join(path.dirname(new URL(import.meta.url).pathname), filePath);

type GetConfigFilePathFn = ReturnType<typeof makeGetConfigFile>;

export const makeSetupRegistry = (getConfigFile: GetConfigFilePathFn) => {
  /**
   * @param {Object} opts
   * @param {string} [opts.config='../config.yaml'] - The path to the starship configuration file.
   * @example
   * ```js
   * const { useChain } = await setupRegistry();
   *
   * const { creditFromFaucet } = useChain('osmosis');
   * await creditFromFaucet('osmo1234');
   * ```
   */
  const setupRegistry = async ({ config = '../config.yaml' } = {}) => {
    ConfigContext.setConfigFile(getConfigFile(config));
    ConfigContext.setRegistry(await useRegistry(ConfigContext.configFile!));
    return { useChain };
  };

  return setupRegistry;
};
