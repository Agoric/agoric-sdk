import { IBCConnectionInfoShape } from '@agoric/orchestration/src/typeGuards.js';
import { mustMatch } from '@endo/patterns';
import { execFileSync } from 'node:child_process';
import { makeAgd } from '../tools/agd-lib.js';
import { networkConfigs } from './config.js';
import { chainInfo } from './static-config.js';

/**
 * @import {IBCChannelID, IBCConnectionID} from '@agoric/vats';
 * @import {CosmosChainInfo, IBCConnectionInfo} from '@agoric/orchestration'
 */

/** @param {string[]} strs */
const parsePeers = (strs) => {
  /** @type {[name: string, conn: IBCConnectionID, chan: IBCChannelID, denom:string][]} */
  // @ts-expect-error XXX ID syntax should be dynamically checked
  const peerParts = strs.map((s) => s.split(':'));
  const badPeers = peerParts.filter((d) => d.length !== 4);
  if (badPeers.length) {
    throw Error(
      `peers must be name:connection-X:channel-Y:denom, not ${badPeers.join(', ')}`,
    );
  }
  return peerParts;
};

/**
 * Get the IBC chain configuration based on the provided network and peer inputs.
 *
 * @param {Object} args - The arguments object.
 * @param {string} args.net - The network name (e.g., 'emerynet').
 * @param {string[]} args.peer - The peers to connect .
 * @returns {Promise<Record<string, CosmosChainInfo>>} A promise that resolves to the chain configuration details keyed by chain name.
 */

export const getChainConfig = async ({ net, peer }) => {
  if (net === 'bootstrap') {
    return chainInfo;
  }

  /** @type {Record<string, CosmosChainInfo>} */
  const chainDetails = {};

  /** @type {Record<string, IBCConnectionInfo>} */
  const connections = {};
  const portId = 'transfer';

  const { chainId, rpc } = networkConfigs[net];
  const agd = makeAgd({ execFileSync }).withOpts({ rpcAddrs: [rpc] });

  for (const [peerName, myConn, myChan, denom] of parsePeers(peer)) {
    console.debug(peerName, { denom });
    const connInfo = await agd
      .query(['ibc', 'connection', 'end', myConn])
      .then((x) => x.connection);
    const { client_id } = connInfo;
    const clientState = await agd
      .query(['ibc', 'client', 'state', client_id])
      .then((x) => x.client_state);
    const { chain_id: peerId } = clientState;
    console.debug(peerName, { chainId: peerId, denom });
    chainDetails[peerName] = {
      namespace: 'cosmos',
      reference: peerId,
      chainId: peerId,
      stakingTokens: [{ denom }],
      bech32Prefix: peerName,
    };

    const chan = await agd
      .query(['ibc', 'channel', 'end', portId, myChan])
      .then((r) => r.channel);

    /** @type {IBCConnectionInfo} */
    const info = harden({
      client_id,
      counterparty: {
        client_id: connInfo.counterparty.client_id,
        connection_id: connInfo.counterparty.connection_id,
      },
      id: myConn,
      state: connInfo.state,
      transferChannel: {
        channelId: myChan,
        counterPartyChannelId: chan.counterparty.channel_id,
        counterPartyPortId: chan.counterparty.port_id,
        ordering: chan.ordering,
        portId,
        state: chan.state,
        version: chan.version,
      },
    });
    mustMatch(info, IBCConnectionInfoShape);
    connections[peerId] = info;
  }

  chainDetails['agoric'] = {
    namespace: 'cosmos',
    reference: chainId,
    chainId,
    stakingTokens: [{ denom: 'ubld' }],
    connections,
    bech32Prefix: 'agoric',
  };

  return chainDetails;
};
