import type { VstorageKit } from '@agoric/client-utils';
import { encodeAddressHook } from '@agoric/cosmic-proto/address-hooks.js';
import { makeIssuerKit } from '@agoric/ertp';
import {
  defaultMarshaller,
  defaultSerializer,
  type FakeStorageKit,
} from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import {
  denomHash,
  withChainCapabilities,
  type BaseChainInfo,
  type ChainInfo,
  type CosmosChainInfo,
  type Denom,
} from '@agoric/orchestration';
import { type DenomDetail } from '@agoric/orchestration/src/exos/chain-hub.js';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import {
  ROOT_STORAGE_PATH,
  setupOrchestrationTest,
} from '@agoric/orchestration/tools/contract-tests.js';
import { buildVTransferEvent } from '@agoric/orchestration/tools/ibc-mocks.js';
import { makeTestAddress } from '@agoric/orchestration/tools/make-test-address.js';
import { makeNameHubKit } from '@agoric/vats';
import type { AssetInfo } from '@agoric/vats/src/vat-bank.js';
import { withAmountUtils } from '@agoric/zoe/tools/test-utils.js';
import { E } from '@endo/far';
import type { ExecutionContext } from 'ava';
import type { StatusFor } from '../src/type-guards.ts';

export const makeIncomingVTransferEvent = ({
  sender = makeTestAddress(),
  sourceChannel = 'channel-1' as `channel-${number}`,
  destinationChannel = 'channel-2' as `channel-${number}`,
  target = 'agoric1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqp7zqht',
  hookQuery = {},
  receiver = encodeAddressHook(target, hookQuery),
  memo = '',
  amount = 1n,
  denom = 'uusdc',
} = {}) => {
  return buildVTransferEvent({
    sequence: '1',
    amount,
    denom,
    sender,
    target,
    receiver,
    sourceChannel,
    destinationChannel,
    memo,
  });
};

const vstoragePendingWrites = eventLoopIteration;

const getCapDataStructure = cell => {
  const { body, slots } = JSON.parse(cell);
  const structure = JSON.parse(body.replace(/^#/, ''));
  return { structure, slots };
};

export const makeStorageTools = (storage: FakeStorageKit) => {
  const readPublished = (async path => {
    await vstoragePendingWrites();
    return defaultMarshaller.fromCapData(
      JSON.parse(
        storage.getValues(`${ROOT_STORAGE_PATH}.${path}`).at(-1) || '',
      ),
    );
  }) as VstorageKit['readPublished'];

  const readLegible = async (path: string) => {
    await vstoragePendingWrites();
    return getCapDataStructure(storage.getValues(path).at(-1));
  };

  const getDeserialized = (path: string): unknown[] => {
    return storage.getValues(path).map(defaultSerializer.parse);
  };

  const getPortfolioStatus = async (pId: number) => {
    await vstoragePendingWrites();
    return getDeserialized(`published.ymax0.portfolios.portfolio${pId}`).at(
      -1,
    ) as StatusFor['portfolio'];
  };

  const getFlowHistory = async (pId: number, fId: number) => {
    await vstoragePendingWrites();
    return getDeserialized(
      `published.ymax0.portfolios.portfolio${pId}.flows.flow${fId}`,
    ) as StatusFor['flow'][];
  };

  const getFlowStatus = async (pId: number, fId: number) =>
    getFlowHistory(pId, fId).then(xs => xs.at(-1));

  return harden({
    readPublished,
    readLegible,
    getPortfolioStatus,
    getFlowHistory,
    getFlowStatus,
  });
};

export {
  makeFakeLocalchainBridge,
  makeFakeTransferBridge,
} from '@agoric/vats/tools/fake-bridge.js';

/**
 * Mainnet chains only.
 *
 * Sourced from:
 *
 * - https://developers.circle.com/stablecoins/supported-domains
 * - https://chainlist.org/
 * - https://docs.simplehash.com/reference/supported-chains-testnets (accessed on
 *   4 July 2025)
 *
 *
 */
export const axelarCCTPConfig = {
  Ethereum: {
    namespace: 'eip155',
    reference: '1',
    cctpDestinationDomain: 0,
  },
  Avalanche: {
    namespace: 'eip155',
    reference: '43114',
    cctpDestinationDomain: 1,
  },
  Optimism: {
    namespace: 'eip155',
    reference: '10',
    cctpDestinationDomain: 2,
  },
  Arbitrum: {
    namespace: 'eip155',
    reference: '42161',
    cctpDestinationDomain: 3,
  },
  Base: {
    namespace: 'eip155',
    reference: '8453',
    cctpDestinationDomain: 6,
  },
} satisfies Record<string, BaseChainInfo>;

export const chainInfoWithCCTP = {
  ...withChainCapabilities(fetchedChainInfo),
  ...axelarCCTPConfig,
};

const assetOn = (
  baseDenom: Denom,
  baseName: string,
  chainName?: string,
  infoOf?: Record<string, CosmosChainInfo>,
  brandKey?: string,
): [string, DenomDetail & { brandKey?: string }] => {
  if (!chainName) {
    return [baseDenom, { baseName, chainName: baseName, baseDenom }];
  }
  if (!infoOf) throw Error(`must provide infoOf`);
  const issuerInfo = infoOf[baseName];
  const holdingInfo = infoOf[chainName];
  if (!holdingInfo) throw Error(`${chainName} missing`);
  if (!holdingInfo.connections)
    throw Error(`connections missing for ${chainName}`);
  const { channelId } =
    holdingInfo.connections[issuerInfo.chainId].transferChannel;
  const denom = `ibc/${denomHash({ denom: baseDenom, channelId })}`;
  return [denom, { baseName, chainName, baseDenom, brandKey }];
};

export const [uusdcOnAgoric, agUSDCDetail] = assetOn(
  'uusdc',
  'noble',
  'agoric',
  fetchedChainInfo,
  'USDC',
);

export const setupPortfolioTest = async ({
  log,
}: {
  log: ExecutionContext<any>['log'];
}) => {
  const axelarChains = axelarCCTPConfig;
  const essentialChains = Object.fromEntries(
    ['agoric', 'axelar', 'noble'].map(n => [n, fetchedChainInfo[n]]),
  );
  const chains = harden({
    ...withChainCapabilities(essentialChains),
    ...axelarChains,
  }) as Record<string, ChainInfo>;

  const common = await setupOrchestrationTest({ log, chains });
  const {
    bootstrap: { agoricNamesAdmin, bankManager },
  } = common;
  const usdc = withAmountUtils(makeIssuerKit('USDC'));
  const bld = withAmountUtils(makeIssuerKit('BLD'));
  const poc26 = withAmountUtils(makeIssuerKit('Poc26'));
  await E(bankManager).addAsset(
    uusdcOnAgoric,
    'USDC',
    'USD Circle Stablecoin',
    usdc.issuerKit,
  );
  await E(bankManager).addAsset('ubld', 'BLD', 'BLD', bld.issuerKit);
  await E(bankManager).addAsset(
    'upoc26',
    'Poc26',
    'Proof of Concept Access',
    poc26.issuerKit,
  );

  // These mints no longer stay in sync with bankManager.
  // Use pourPayment() for IST.
  const { mint: _i, ...usdcSansMint } = usdc;
  await E(E(agoricNamesAdmin).lookupAdmin('vbankAsset')).update(
    uusdcOnAgoric,
    harden({
      brand: usdc.brand,
      issuer: usdc.issuer,
      issuerName: 'USDC',
      denom: 'uusdc',
      proposedName: 'USDC',
      displayInfo: { assetKind: 'nat', IOU: true },
    }) as AssetInfo,
  );

  const bldDetail = {
    baseDenom: 'ubld',
    baseName: 'agoric',
    chainName: 'agoric',
    brand: bld.brand,
  };
  const assetInfo: [Denom, DenomDetail & { brandKey?: string }][] = harden([
    assetOn('uusdc', 'noble'),
    [uusdcOnAgoric, agUSDCDetail],
    ['ubld', bldDetail],
    assetOn('uusdc', 'noble', 'osmosis', fetchedChainInfo),
  ]);

  // XXX poolMetricsNode is fastUsdc-specific
  const { poolMetricsNode: _p, ...commonPrivateArgs } =
    common.commonPrivateArgs;

  const { nameHub: namesByAddress, nameAdmin: namesByAddressAdmin } =
    makeNameHubKit();
  const bootstrap = {
    ...common.bootstrap,
    namesByAddress,
    namesByAddressAdmin,
  };
  return {
    ...common,
    bootstrap,
    brands: { usdc: usdcSansMint, poc26, bld },
    commonPrivateArgs: {
      ...commonPrivateArgs,
      assetInfo,
    },
    utils: common.utils,
  };
};
