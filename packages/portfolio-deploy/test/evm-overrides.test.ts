import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { Far } from '@endo/pass-style';
import { privateArgsShape } from '@aglocal/portfolio-contract/src/portfolio.contract.js';
import { mustMatch } from '@agoric/internal';
import { type CosmosChainInfo } from '@agoric/orchestration';
import {
  axelarConfig,
  gmpAddresses as gmpAddressesByEnv,
} from '../src/axelar-configs.js';
import { makeAssetInfo } from '../src/chain-name-service.js';
import {
  chainInfoDevNet,
  chainInfoProposal100,
  instanceOverrides,
} from './chain-info.fixture.js';

const nodeRequire = createRequire(import.meta.url);
const asset = (spec: string) => readFile(nodeRequire.resolve(spec), 'utf8');

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

const computeOverrides = async (tag: string = 'ymax0') => {
  const { bytecode: walletBytecode } = JSON.parse(
    await asset('@aglocal/portfolio-deploy/tools/evm-orch/Wallet.json'),
  );
  let contracts = fromEntries(
    entries(axelarConfig).map(([name, config]) => [name, config.contracts]),
  );
  // Apply per-instance address overrides
  const overrides = (instanceOverrides as any)[tag];
  if (overrides) {
    contracts = fromEntries(
      entries(contracts).map(([name, addrs]) => [
        name,
        overrides[name]
          ? { ...(addrs as any), ...(overrides as any)[name] }
          : addrs,
      ]),
    );
  }
  const axelarIds = fromEntries(
    entries(axelarConfig).map(([name, config]) => [name, config.axelarId]),
  );
  const bidirectional = complementConnections(chainInfoProposal100);
  const chainInfo = {
    ...fromEntries(
      entries(axelarConfig).map(([name, config]) => [name, config.chainInfo]),
    ),
    ...bidirectional,
  };
  const assetInfo = harden(makeAssetInfo(bidirectional, tokenMap));
  return {
    axelarIds,
    contracts,
    chainInfo,
    assetInfo,
    gmpAddresses: gmpAddressesByEnv.mainnet,
    walletBytecode,
  };
};

const addStubPowers = (data: any) => harden({ ...stubPowers, ...data });

const checkContracts = (
  t: any,
  golden: any,
  computed: any,
  fields: string[],
  tag: string,
) => {
  for (const [chain, addrs] of Object.entries(golden.contracts || {})) {
    for (const field of fields) {
      const gv = (addrs as any)[field];
      if (gv === undefined) continue; // field not in golden, skip
      const cv = (computed.contracts as any)[chain]?.[field];
      t.is(cv, gv, `${tag} ${chain}.${field} matches golden`);
    }
  }
};

test('ymax0 computed overrides match shape', async t => {
  const computed = await computeOverrides('ymax0');
  t.notThrows(
    () => mustMatch(addStubPowers(computed), privateArgsShape),
    'ymax0 computed overrides match shape',
  );
});

test('ymax0 contract addresses match golden snapshot', async t => {
  const computed = await computeOverrides('ymax0');
  const golden = JSON.parse(await asset('./privateArgs-ymax0.json'));
  const shareFields = [
    'aavePool',
    'compound',
    'usdc',
    'permit2',
    'gateway',
    'gasService',
    'tokenMessenger',
    'tokenMessengerV2',
    'oneInchRouter',
  ];
  checkContracts(t, golden, computed, shareFields, 'ymax0');
});

test('ymax1 computed overrides match shape', async t => {
  const computed = await computeOverrides('ymax1');
  t.notThrows(
    () => mustMatch(addStubPowers(computed), privateArgsShape),
    'ymax1 computed overrides match shape',
  );
});

test('ymax1 contract addresses match golden snapshot', async t => {
  const computed = await computeOverrides('ymax1');
  const golden = JSON.parse(await asset('./privateArgs-ymax1.json'));
  const instanceFields = [
    'depositFactory',
    'remoteAccountFactory',
    'remoteAccountImplementation',
    'remoteAccountRouter',
  ];
  checkContracts(t, golden, computed, instanceFields, 'ymax1');
});

test('ymax0 overrides include cctpRelayer', async t => {
  const expected: any = JSON.parse(await asset('./privateArgs-ymax0.json'));
  for (const [chain, addrs] of Object.entries(expected.contracts || {})) {
    t.truthy((addrs as any).cctpRelayer, `ymax0 ${chain} has cctpRelayer`);
  }
});

test('ymax1 overrides include cctpRelayer', async t => {
  const expected: any = JSON.parse(await asset('./privateArgs-ymax1.json'));
  for (const [chain, addrs] of Object.entries(expected.contracts || {})) {
    t.truthy((addrs as any).cctpRelayer, `ymax1 ${chain} has cctpRelayer`);
  }
});
