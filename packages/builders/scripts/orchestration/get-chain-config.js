import { IBCConnectionInfoShape } from '@agoric/orchestration/src/typeGuards.js';
import { mustMatch } from '@endo/patterns';
import { makeAgd } from '@agoric/orchestration/src/utils/agd-lib.js';
import * as childProcess from 'node:child_process';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import { fetchNetworkConfig } from '@agoric/client-utils';

/**
 * @import {IBCChannelID, IBCConnectionID} from '@agoric/vats';
 * @import {CosmosChainInfo, IBCConnectionInfo} from '@agoric/orchestration'
 */

/** @param {string[]} strs */
const parsePeers = strs => {
  /** @type {[name: string, conn: IBCConnectionID, chan: IBCChannelID, denom:string][]} */
  // @ts-expect-error XXX ID syntax should be dynamically checked
  const peerParts = strs.map(s => s.split(':'));
  const badPeers = peerParts.filter(d => d.length !== 4);
  if (badPeers.length) {
    throw Error(
      `peers must be name:connection-X:channel-Y:denom, not ${badPeers.join(', ')}`,
    );
  }
  return peerParts;
};

// TODO: Can these be sourced from chain-registry?
/**
 * Get the IBC chain configuration based on the provided network and peer inputs.
 *
 * @param {object} args - The arguments object.
 * @param {'bootstrap' | 'devnet' |'emerynet' | 'local' } args.net - Agoric network shorthand (e.g., 'emerynet').
 * @param {string[]} args.peers - The peers to connect .
 * @param {childProcess.execFileSync} [args.execFileSync] - Optional execFileSync function.
 * @returns {Promise<Record<string, CosmosChainInfo>>} A promise that resolves to the chain configuration details keyed by chain name.
 */

export const getChainConfig = async ({
  net,
  peers,
  execFileSync = childProcess.execFileSync,
}) => {
  await null;

  if (net === 'bootstrap') {
    return {
      agoric: fetchedChainInfo.agoric,
      axelar: fetchedChainInfo.axelar,
    };
  }

  /** @type {Record<string, CosmosChainInfo>} */
  const chainDetails = {};

  /** @type {Record<string, IBCConnectionInfo>} */
  const connections = {};
  const portId = 'transfer';

  const { chainName: chainId, rpcAddrs } = await fetchNetworkConfig(net, {
    fetch,
  });
  // XXX execFileSync bad POLA; these queries can be made with `fetch`
  const agd = makeAgd({ execFileSync }).withOpts({ rpcAddrs });

  for (const [peerName, myConn, myChan, denom] of parsePeers(peers)) {
    console.debug(peerName, { denom });
    const connInfo = await agd
      .query(['ibc', 'connection', 'end', myConn])
      .then(x => x.connection);
    const { client_id: clientId } = connInfo;
    const clientState = await agd
      .query(['ibc', 'client', 'state', clientId])
      .then(x => x.client_state);
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
      .then(r => r.channel);

    /** @type {IBCConnectionInfo} */
    const info = harden({
      client_id: clientId,
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

  chainDetails.agoric = {
    namespace: 'cosmos',
    reference: chainId,
    chainId,
    stakingTokens: [{ denom: 'ubld' }],
    connections,
    bech32Prefix: 'agoric',
  };

  return chainDetails;
};
