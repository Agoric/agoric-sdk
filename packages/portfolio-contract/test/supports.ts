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
import { makeNameHubKit } from '@agoric/vats';
import type { AssetInfo } from '@agoric/vats/src/vat-bank.js';
import { withAmountUtils } from '@agoric/zoe/tools/test-utils.js';
import { E } from '@endo/far';
import type { ExecutionContext } from 'ava';
import { encodeAbiParameters } from 'viem';
import { gmpAddresses } from './mocks.ts';

export const makeIncomingEVMEvent = ({
  sender = gmpAddresses.AXELAR_GMP,
  address = '0x126cf3AC9ea12794Ff50f56727C7C66E26D9C092',
  sourceChain,
  target = makeTestAddress(0), // agoric1q...p7zqht
}: {
  sender?: `${string}1${string}`;
  address?: `0x${string}`;
  sourceChain: string;
  target?: string;
}) => {
  const encodedAddress = encodeAbiParameters([{ type: 'address' }], [address]);

  const axelarConnections =
    fetchedChainInfo.agoric.connections['axelar-dojo-1'];

  const agoricChannel = axelarConnections.transferChannel.channelId;
  const axelarChannel = axelarConnections.transferChannel.counterPartyChannelId;

  const result = makeIncomingVTransferEvent({
    sender,
    sourceChannel: axelarChannel,
    destinationChannel: agoricChannel,
    target,
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
  return result;
};

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
    target: target,
    receiver,
    sourceChannel,
    destinationChannel,
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
  Base: {
    namespace: 'eip155',
    reference: '8453',
    cctpDestinationDomain: 6,
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
