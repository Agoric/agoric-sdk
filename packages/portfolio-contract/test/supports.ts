import { makeReceiveUpCallPayload } from '@aglocal/boot/tools/axelar-supports.ts';
import { encodeAddressHook } from '@agoric/cosmic-proto/address-hooks.js';
import { makeIssuerKit } from '@agoric/ertp';
import {
  denomHash,
  withChainCapabilities,
  type ChainInfo,
  type CosmosChainInfo,
  type Denom,
} from '@agoric/orchestration';
import { type DenomDetail } from '@agoric/orchestration/src/exos/chain-hub.js';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import { setupOrchestrationTest } from '@agoric/orchestration/tools/contract-tests.ts';
import { buildVTransferEvent } from '@agoric/orchestration/tools/ibc-mocks.ts';
import { makeTestAddress } from '@agoric/orchestration/tools/make-test-address.js';
import type { AssetInfo } from '@agoric/vats/src/vat-bank.js';
import { withAmountUtils } from '@agoric/zoe/tools/test-utils.js';
import { E } from '@endo/far';
import type { ExecutionContext } from 'ava';
import { encodeAbiParameters } from 'viem';

export const makeIncomingEVMEvent = ({
  address = '0x126cf3AC9ea12794Ff50f56727C7C66E26D9C092',
  sourceChain,
}: {
  address?: `0x${string}`;
  sourceChain: string;
}) => {
  const encodedAddress = encodeAbiParameters([{ type: 'address' }], [address]);

  const axelarConnections =
    fetchedChainInfo.agoric.connections['axelar-dojo-1'];

  const axelarToAgoricChannel = axelarConnections.transferChannel.channelId;
  const agoricToAxelarChannel =
    axelarConnections.transferChannel.counterPartyChannelId;

  return makeIncomingVTransferEvent({
    sourceChannel: axelarToAgoricChannel,
    destinationChannel: agoricToAxelarChannel,
    memo: JSON.stringify({
      source_chain: sourceChain,
      source_address: '0x19e71e7eE5c2b13eF6bd52b9E3b437bdCc7d43c8',
      payload: makeReceiveUpCallPayload({
        isContractCallResult: false,
        data: [
          {
            success: true,
            result: encodedAddress,
          },
        ],
      }),
      type: 1,
    }),
  });
};

export const makeIncomingVTransferEvent = ({
  sender = makeTestAddress(),
  sourcePort = 'transfer',
  sourceChannel = 'channel-1',
  destinationPort = 'transfer',
  destinationChannel = 'channel-2',
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
    target: target,
    receiver,
    source_port: sourcePort,
    source_channel: sourceChannel,
    destination_port: destinationPort,
    destination_channel: destinationChannel,
    memo,
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
 * @satisfies {Record<string, import('./orchestration-api').BaseChainInfo>}
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
  Polygon: {
    namespace: 'eip155',
    reference: '137',
    cctpDestinationDomain: 7,
  },
  Fantom: {
    namespace: 'eip155',
    reference: '250',
  },
  Binance: {
    namespace: 'eip155',
    reference: '56',
  },
};

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

  return {
    ...common,
    brands: { usdc: usdcSansMint, poc26, bld },
    commonPrivateArgs: {
      ...commonPrivateArgs,
      assetInfo,
    },
    utils: common.utils,
  };
};
