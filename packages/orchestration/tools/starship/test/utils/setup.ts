import { useRegistry, useChain, ConfigContext } from 'starshipjs';
import { dirname, join } from 'path';

const makeGetConfigFile =
  (path: Pick<typeof import('path'), 'dirname' | 'join'>) =>
  (filePath: string) =>
    path.join(path.dirname(new URL(import.meta.url).pathname), filePath);

const getConfigFile = makeGetConfigFile({ dirname, join });
const configFile = getConfigFile('../config.ci.yaml');

/**
 * @example
 * ```js
 * const { creditFromFaucet } = useChain('osmosis');
 * await creditFromFaucet('osmo1234');
 * ```
 */
export const setup = async () => {
  // Set the configuration file in StarshipJS
  ConfigContext.setConfigFile(configFile);

  await null;
  ConfigContext.setRegistry(await useRegistry(ConfigContext.configFile!));

  return { useChain };
};
