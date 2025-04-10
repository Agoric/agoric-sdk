import { LOCAL_CONFIG_KEY, fetchNetworkConfig } from './network-config.js';

/**
 * @import {NetworkConfig} from './types.js';
 */

/**
 * Fetch the network config for the AGORIC_NET environment variable.
 *
 * If none is set or it's 'local', return a local chain config.
 *
 * @param {{ env: typeof process.env, fetch: typeof fetch }} io
 * @returns {Promise<NetworkConfig>}
 */

export const fetchEnvNetworkConfig = async ({ env, fetch }) => {
  const net = env.AGORIC_NET || LOCAL_CONFIG_KEY;

  return fetchNetworkConfig(net, { fetch });
};
