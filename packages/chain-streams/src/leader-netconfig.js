// @ts-check
/* global fetch */
import { makeRoundRobinLeader } from './leader.js';
import { DEFAULT_RETRY_CALLBACK } from './defaults.js';

const { details: X } = assert;

/**
 * @param {string[]} rpcAddrs
 * @param {import('./types.js').ChainLeaderOptions} [leaderOptions]
 */
export const makeLeaderFromRpcAddresses = (rpcAddrs, leaderOptions) => {
  assert(Array.isArray(rpcAddrs), X`rpcAddrs ${rpcAddrs} must be an array`);

  const rpcHrefs = rpcAddrs.map(rpcAddr => {
    assert.typeof(rpcAddr, 'string', X`rpcAddr ${rpcAddr} must be a string`);
    // Don't remove explicit port numbers from the URL, because the Cosmos
    // `--node=xxx` flag requires them (it doesn't just assume that
    // `--node=https://testnet.rpc.agoric.net` is the same as
    // `--node=https://testnet.rpc.agoric.net:443`)
    return rpcAddr.includes('://') ? rpcAddr : `http://${rpcAddr}`;
  });

  return makeRoundRobinLeader(rpcHrefs, leaderOptions);
};

/**
 * @param {string} netconfigURL
 * @param {import('./types.js').ChainLeaderOptions} [options]
 */
export const makeLeaderFromNetworkConfig = (netconfigURL, options = {}) => {
  const { retryCallback = DEFAULT_RETRY_CALLBACK } = options;
  const retry = async err => {
    if (retryCallback) {
      return retryCallback(err);
    }
    throw err;
  };
  return new Promise((resolve, reject) => {
    const makeLeader = async () => {
      const response = await fetch(netconfigURL, {
        headers: { accept: 'application/json' },
      });
      const { rpcAddrs } = await response.json();
      return makeLeaderFromRpcAddresses(rpcAddrs, options);
    };
    const retryLeader = async err => {
      retry(err)
        .then(() => makeLeader().then(resolve, retryLeader))
        .catch(reject);
    };
    makeLeader().then(resolve, retryLeader);
  });
};

/**
 * @param {string} bootstrap
 * @param {import('./types.js').ChainLeaderOptions} options
 */
export const makeLeader = (bootstrap, options) => {
  if (bootstrap.includes('network-config')) {
    return makeLeaderFromNetworkConfig(bootstrap, options);
  }
  return makeLeaderFromRpcAddresses([bootstrap], options);
};
