import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import {
  CosmosAssetInfoShape,
  type CosmosChainInfo,
} from '@agoric/orchestration';
import { chainInfoDevNet, ethOverridesDevNet } from './devnet-chain-info.js';
import { makeAssetInfo } from '../src/chain-name-service.js';
import { privateArgsShape } from '@aglocal/portfolio-contract/src/portfolio.contract.js';
import { mustMatch } from '@agoric/internal';
import { Far } from '@endo/pass-style';
import { M } from '@endo/patterns';

const { entries, fromEntries } = Object;

const tokenMap = {
  agoric: ['ubld'],
  noble: ['uusdc'],
  axelar: ['uaxl'],
};

/**
 * Utility to reverse connection info perspective.
 *
 * @param {IBCConnectionInfo} connInfo
 * @returns {IBCConnectionInfo}
 */
const reverseConnInfo = connInfo => {
  const { transferChannel } = connInfo;
  return harden({
    id: connInfo.counterparty.connection_id,
    client_id: connInfo.counterparty.client_id,
    counterparty: {
      client_id: connInfo.client_id,
      connection_id: connInfo.id,
    },
    state: connInfo.state,
    transferChannel: {
      ...transferChannel,
      channelId: transferChannel.counterPartyChannelId,
      counterPartyChannelId: transferChannel.channelId,
      portId: transferChannel.counterPartyPortId,
      counterPartyPortId: transferChannel.portId,
    },
  });
};

/**
 * add channels going the other way
 *
 * @param chainInfo chainInfo, including connections, for some chains
 * @returns chainInfo with connections going the other way filled in
 */
const complementConnections = (chainInfo: Record<string, CosmosChainInfo>) => {
  const byChainId = fromEntries(
    entries(chainInfo).map(([name, info]) => {
      return [info.chainId, name];
    }),
  );
  let bidirectional: Record<string, CosmosChainInfo> = chainInfo;

  for (const [pName, pInfo] of entries(chainInfo)) {
    for (const [cChainId, connInfo] of entries(pInfo.connections || {})) {
      const rev = reverseConnInfo(connInfo);
      const cName = byChainId[cChainId];
      const cInfo = chainInfo[cName];
      const cConns = { ...cInfo.connections, [chainInfo[pName].chainId]: rev };
      bidirectional = {
        ...bidirectional,
        [cName]: { ...cInfo, connections: cConns },
      };
    }
  }

  return harden(bidirectional);
};

test('devnet assetInfo has USDC, BLD', t => {
  const bidirectional = complementConnections(chainInfoDevNet);
  const assetInfo = harden(fromEntries(makeAssetInfo(bidirectional, tokenMap)));

  t.like(assetInfo, {
    ubld: { baseName: 'agoric' },
    'ibc/75F84596DDE9EE93010620701FFED959F3FFA1D0979F6773DE994FFEEA7D32F3': {
      baseName: 'noble',
      baseDenom: 'uusdc',
    },
  });
});

const stubPowers = {
  agoricNames: Far('NameHub'),
  localchain: Far('LocalChain'),
  marshaller: Far('Marshaller'),
  orchestrationService: Far('OrchestrationService'),
  storageNode: Far('StorageNode'),
  timerService: Far('TimerService'),
};

test('devnet overrides match ymax privateArgsShape', t => {
  const bidirectional = complementConnections(chainInfoDevNet);
  const assetInfo = makeAssetInfo(bidirectional, tokenMap);

  /** include connection info */
  const chainInfo = { ...ethOverridesDevNet.chainInfo, ...bidirectional };
  const privateArgsData = { ...ethOverridesDevNet, chainInfo, assetInfo };
  t.notThrows(() =>
    mustMatch(harden({ ...stubPowers, ...privateArgsData }), privateArgsShape),
  );

  t.snapshot(
    JSON.stringify(privateArgsData, null, 2),
    'devnet privateArgs data',
  );
});
