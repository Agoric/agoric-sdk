/**
 * @file build core-eval to populate agoricNames.chain etc.
 * optionally using IBC queries.
 *
 * @see {options} for CLI usage
 * @see {sourceSpec} for core-eval details
 */
import { makeHelpers } from '@agoric/deploy-script-support';
import { mustMatch } from '@agoric/internal';
import { ChainInfoShape, IBCConnectionInfoShape } from '@agoric/orchestration';
import { M } from '@endo/patterns';
import { parseArgs } from 'node:util';

const { keys } = Object;

// TODO: factor out overlap with builders/scripts/orchestration/write-chain-info.js

const sourceSpec = '@aglocal/portfolio-deploy/src/chain-info.core.js';

/**
 * @import {ParseArgsConfig} from 'node:util';
 * @import {CoreEvalBuilder, DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {TypedPattern} from '@agoric/internal';
 * @import {ChainInfo, CosmosChainInfo, IBCConnectionInfo} from '@agoric/orchestration';
 * @import {IBCChannelID, IBCConnectionID} from '@agoric/vats';
 */

/** @type {ParseArgsConfig['options'] } */
const options = {
  baseName: { type: 'string', default: 'eval-chain-info' },
  chainInfo: { type: 'string', default: '{}' },
  net: { type: 'string' },
  peer: { type: 'string', multiple: true },
};
/**
 * @typedef {{
 *   baseName: string;
 *   chainInfo: string;
 *   net?: string;
 *   peer?: string[];
 * }} FlagValues
 */

/**
 * @param {unknown} _utils
 * @param {Record<string, ChainInfo>} chainInfo
 * @satisfies {CoreEvalBuilder}
 */
export const defaultProposalBuilder = async (_utils, chainInfo) =>
  harden({
    sourceSpec,
    getManifestCall: ['getManifestForChainInfo', { options: { chainInfo } }],
  });

/** @type {TypedPattern<Record<string, ChainInfo>>} */
const ChainInfosShape = M.recordOf(M.string(), ChainInfoShape);

/**
 * @typedef {{ rpcAddrs: string[], chainName: string }} MinimalNetworkConfig
 */

/**
 * @param {string} net
 * @param {typeof fetch} fetch
 * @returns {Promise<MinimalNetworkConfig>}
 */
const getNetConfig = (net, fetch) =>
  fetch(`https://${net}.agoric.net/network-config`)
    .then(res => res.text())
    .then(s => JSON.parse(s));

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

/**
 * @example
 *   const agd = makeAgd({execFileSync})
 *                 .withOpts({rpcAddrs: ['https...]});
 *   const info = await agd.query(['bank', 'balances', 'agoric1...]);
 * @param {{ execFileSync: typeof import('child_process').execFileSync}} io
 */
const makeAgd = ({ execFileSync }) => {
  const exec = (
    /** @type {string[]} */
    args,
    /** @type {import('node:child_process').ExecFileSyncOptionsWithStringEncoding} */
    opts = { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] },
  ) => execFileSync('agd', [...args], opts);

  /** @param {{ rpcAddrs?: string[] }} opts */
  const make = ({ rpcAddrs = [] } = {}) => {
    const nodeArgs = rpcAddrs ? ['--node', rpcAddrs[0]] : [];
    const outJson = ['--output=json'];
    return harden({
      /**
       * @param { string[] } qArgs
       * @returns {Promise<*>} parsed output from -o json
       *   or undefined in case of a JSON parsing error
       */
      query: async qArgs => {
        const out = exec(['query', ...qArgs, ...nodeArgs, ...outJson]);

        try {
          return JSON.parse(out);
        } catch (e) {
          console.error(e);
          console.info('output:', out);
        }
      },
      /** @param {{ rpcAddrs?: string[] }} opts */
      withOpts: opts => make({ rpcAddrs, ...opts }),
    });
  };
  return make();
};

/**
 * Get ChainInfo for peers using IBC queries.
 *
 * @param {string} chainId of agoric chain
 * @param {string[]} peers bech32prefix:connection-12:channel-34:ustake
 * @param {{ agd: ReturnType<makeAgd> }} io
 * @returns {Promise<Record<string, CosmosChainInfo>>} where
 *   info.agoric.connections has a connection to each peeer
 */
const getPeerChainInfo = async (chainId, peers, { agd }) => {
  /** @type {Record<string, IBCConnectionInfo>} */
  const connections = {};
  const portId = 'transfer';

  /** @type {Record<string, CosmosChainInfo>} */
  const chainDetails = {};

  await null;
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

  return harden(chainDetails);
};

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { scriptArgs } = endowments;
  /** @type {FlagValues} */
  // @ts-expect-error guaranteed by options config
  const { values: flags } = parseArgs({ args: scriptArgs, options });
  const { chainInfo: chainJSON, baseName } = flags;
  let chainInfo = harden(JSON.parse(chainJSON));

  await null;
  if (flags.net) {
    if (!flags.peer) throw Error('--peer required');
    // only import/use net access if asked with --net
    const { execFileSync } = await import('child_process');
    const { chainName: chainId, rpcAddrs } = await getNetConfig(
      flags.net,
      fetch,
    );
    const agd = makeAgd({ execFileSync }).withOpts({ rpcAddrs });
    const dynChainInfo = await getPeerChainInfo(chainId, flags.peer, { agd });

    chainInfo = harden({ ...chainInfo, ...dynChainInfo });
  }

  mustMatch(chainInfo, ChainInfosShape);
  console.log('configured chains:', keys(chainInfo));
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval(baseName, utils =>
    defaultProposalBuilder(utils, chainInfo),
  );
};
