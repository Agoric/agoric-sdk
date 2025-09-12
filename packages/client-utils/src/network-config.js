/**
 * @typedef {object} MinimalNetworkConfig
 * @property {string} chainName a Cosmos Chain ID (cf. https://evm.cosmos.network/docs/next/documentation/concepts/chain-id and https://github.com/cosmos/chain-registry )
 * @property {string[]} rpcAddrs endpoints that are expected to respond to cosmos-sdk RPC requests
 */

export const toNetworkConfigUrl = agoricNetSubdomain =>
  `https://${agoricNetSubdomain}.agoric.net/network-config`;

export const toRpcUrl = agoricNetSubdomain =>
  `https://${agoricNetSubdomain}.rpc.agoric.net:443`;

/** @satisfies {MinimalNetworkConfig} */
export const LOCAL_CONFIG = {
  chainName: 'agoriclocal',
  rpcAddrs: ['http://0.0.0.0:26657'],
};

export const LOCAL_CONFIG_KEY = 'local';

/**
 * Parse a network specifier, which must use one of the following formats:
 *   - "$subdomain": a subdomain of agoric.net that is expected to respond to an
 *     HTTP request for `/network-config` (e.g., "local" or "main" or a network
 *     listed at https://all.agoric.net/ ) with a {@link MinimalNetworkConfig}
 *   - "$subdomain,$chainId": a single-word subdomain of rpc.agoric.net that is
 *     expected to respond to cosmos-sdk RPC requests, and a Cosmos Chain ID
 *     (cf. https://evm.cosmos.network/docs/next/documentation/concepts/chain-id
 *     and https://github.com/cosmos/chain-registry ) to associate with it
 *   - "$fqdn,$chainId": a fully-qualified domain name that is expected to
 *     respond to cosmos-sdk RPC requests, and a Cosmos Chain ID to associate
 *     with it
 *
 * @param {string} spec
 * @returns {{ domain: string, subdomain?: string, fqdn?: string, chainId?: string } & ({ domain: string } | { fqdn: string })}
 */
export const parseNetworkSpec = spec => {
  const [domain, chainId] = spec.split(',');
  if (domain.includes('.')) {
    return { domain, fqdn: domain, chainId };
  }
  return { domain, subdomain: domain, chainId };
};

/**
 * Fetches the network config for the given network specifier.
 *
 * @param {string} spec
 * @param {{ fetch: typeof fetch }} io
 * @returns {Promise<MinimalNetworkConfig>}
 */
export const fetchNetworkConfig = async (spec, { fetch }) => {
  const { domain, fqdn, subdomain, chainId } = parseNetworkSpec(spec);

  if (domain === LOCAL_CONFIG_KEY) {
    const config = { ...LOCAL_CONFIG };
    if (chainId) config.chainName = chainId;
    return config;
  }

  if (chainId) {
    const rpcAddr = subdomain ? toRpcUrl(subdomain) : `https://${fqdn}:443`;
    return { chainName: chainId, rpcAddrs: [rpcAddr] };
  }

  return fetch(toNetworkConfigUrl(subdomain))
    .then(res => res.json())
    .catch(err => {
      throw Error(`cannot get network config (${spec}): ${err.message}`);
    });
};
