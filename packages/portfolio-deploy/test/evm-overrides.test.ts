import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { privateArgsShape } from '@aglocal/portfolio-contract/src/portfolio.contract.js';
import { mustMatch } from '@agoric/internal';
import { type CosmosChainInfo } from '@agoric/orchestration';
import { Far } from '@endo/pass-style';
import { makeAssetInfo } from '../src/chain-name-service.js';
import {
  chainInfoDevNet,
  chainInfoProposal100,
  ethOverridesDevNet,
  ethOverridesMainNet,
} from './chain-info.fixture.js';

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
      if (!cInfo) continue;
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

test('mainnet assetInfo has USDC, BLD', t => {
  const bidirectional = complementConnections(chainInfoProposal100);
  const assetInfo = harden(fromEntries(makeAssetInfo(bidirectional, tokenMap)));

  // t.log(assetInfo);
  t.like(
    assetInfo,
    {
      ubld: {
        baseName: 'agoric',
        brandKey: 'BLD',
        baseDenom: 'ubld',
      },
      'ibc/FE98AAD68F02F03565E9FA39A5E627946699B2B07115889ED812D8BA639576A9': {
        baseName: 'noble',
        baseDenom: 'uusdc',
        brandKey: 'USDC',
        chainName: 'agoric',
      },
    },
    'assetInfo has correct denom for USDC on Agoric',
  );
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

test('mainnet overrides match ymax privateArgsShape', t => {
  const bidirectional = complementConnections(chainInfoProposal100);
  const assetInfo = makeAssetInfo(bidirectional, tokenMap);

  /** include connection info */
  const chainInfo = { ...ethOverridesMainNet.chainInfo, ...bidirectional };
  const privateArgsData = { ...ethOverridesMainNet, chainInfo, assetInfo };
  t.notThrows(() =>
    mustMatch(harden({ ...stubPowers, ...privateArgsData }), privateArgsShape),
  );

  t.snapshot(
    JSON.stringify(privateArgsData, null, 2),
    'mainnet privateArgs data',
  );
});
