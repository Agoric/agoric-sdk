import { NonNullish } from '@agoric/internal';

export const networkConfigUrl = agoricNetSubdomain =>
  `https://${agoricNetSubdomain}.agoric.net/network-config`;
export const rpcUrl = agoricNetSubdomain =>
  `https://${agoricNetSubdomain}.rpc.agoric.net:443`;

/**
 * @param {string} str
 * @param {{ fetch: typeof fetch }} io
 * @returns {Promise<MinimalNetworkConfig>}
 */
const fromAgoricNet = (str, { fetch }) => {
  const [netName, chainName] = str.split(',');
  if (chainName) {
    return Promise.resolve({ chainName, rpcAddrs: [rpcUrl(netName)] });
  }
  return fetch(networkConfigUrl(netName)).then(res => res.json());
};

/**
 * @param {{ env: typeof process.env, fetch: typeof fetch }} io
 * @returns {Promise<MinimalNetworkConfig>}
 */
export const getNetworkConfig = async ({ env, fetch }) => {
  if (!('AGORIC_NET' in env) || env.AGORIC_NET === 'local') {
    return { rpcAddrs: ['http://0.0.0.0:26657'], chainName: 'agoriclocal' };
  }

  return fromAgoricNet(NonNullish(env.AGORIC_NET), { fetch }).catch(err => {
    throw Error(
      `cannot get network config (${env.AGORIC_NET || 'local'}): ${
        err.message
      }`,
    );
  });
};
