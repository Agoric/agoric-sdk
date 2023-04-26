// @jessie-check

import { mustMatch, M } from '@agoric/store';

// NB: keep type and shape in sync manually until https://github.com/Agoric/agoric-sdk/issues/6160
/**
 * @typedef {object} NetworkConfig
 * `peers` and `seeds` are only used for configuring full nodes participating in
 * the chain’s p2p network, not for rpc clients.  The `gci` is needed for rpc
 * “light clients” to prove the ancestry of data fetched from the rpc node.
 *
 * @property {string[]} rpcAddrs endpoints serving https://docs.tendermint.com/v0.34/rpc/
 * @property {string} chainName e.g. agoric-3
 * @property {string[]} [apiAddrs] overrides for REST endpoints of RPC servers https://docs.cosmos.network/main/run-node/interact-node#using-the-rest-endpoints
 * @property {string} [gci] - "global chain identifier", a hash of the genesis block
 * @property {string[]} [peers] - a list of nodes used to start the p2p gossip (stored in a per-node “address book”, which is a file stored in that node’s data directory)
 * @property {string[]} [seeds] - nodes which tell you about other peers but don't gossip actual data
 */
export const NetworkConfigShape = M.splitRecord(
  harden({
    chainName: M.string(),
    rpcAddrs: M.arrayOf(M.string()),
  }),
  harden({
    apiAddrs: M.arrayOf(M.string()),
    gci: M.string(),
    peers: M.arrayOf(M.string()),
    seeds: M.arrayOf(M.string()),
  }),
);
harden(NetworkConfigShape);

/**
 * @param {unknown} specimen
 * @returns {asserts specimen is NetworkConfig}
 */

export const assertNetworkConfig = specimen =>
  mustMatch(specimen, NetworkConfigShape);
harden(assertNetworkConfig);
