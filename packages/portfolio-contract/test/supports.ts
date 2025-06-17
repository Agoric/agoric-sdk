import { makeIssuerKit } from '@agoric/ertp';
import { deepCopyJsonable } from '@agoric/internal';
import {
  denomHash,
  type CosmosChainInfo,
  type Denom,
} from '@agoric/orchestration';
import { type DenomDetail } from '@agoric/orchestration/src/exos/chain-hub.js';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import { setupOrchestrationTest } from '@agoric/orchestration/tools/contract-tests.ts';
import type { AssetInfo } from '@agoric/vats/src/vat-bank.js';
import { withAmountUtils } from '@agoric/zoe/tools/test-utils.js';
import { E } from '@endo/far';
import type { ExecutionContext } from 'ava';

export {
  makeFakeLocalchainBridge,
  makeFakeTransferBridge,
} from '@agoric/vats/tools/fake-bridge.js';

// Deep clone fetchedChainInfo for test patching
const testChainInfo = deepCopyJsonable(fetchedChainInfo);
// Patch noble.connections to add axelar-dojo-1 for test
testChainInfo.noble.connections['axelar-dojo-1'] = {
  id: 'connection-mock',
  client_id: '07-tendermint-mock',
  counterparty: {
    client_id: '07-tendermint-mock',
    connection_id: 'connection-mock',
  },
  state: 3,
  transferChannel: {
    channelId: 'channel-mock',
    portId: 'transfer',
    counterPartyChannelId: 'channel-mock',
    counterPartyPortId: 'transfer',
    ordering: 0,
    state: 3,
    version: 'ics20-1',
  },
};

// Enable PFM on noble for tests
testChainInfo.noble.features = ['pfm'];
testChainInfo.noble.pfmEnabled = true;

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
  testChainInfo,
  'USDC',
);

export const setupPortfolioTest = async ({
  log,
}: {
  log: ExecutionContext<any>['log'];
}) => {
  const common = await setupOrchestrationTest({ log });
  const {
    bootstrap: { agoricNamesAdmin, bankManager },
  } = common;
  const usdc = withAmountUtils(makeIssuerKit('USDC'));
  await E(bankManager).addAsset(
    uusdcOnAgoric,
    'USDC',
    'USD Circle Stablecoin',
    usdc.issuerKit,
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

  const assetInfo: [Denom, DenomDetail & { brandKey?: string }][] = harden([
    assetOn('uusdc', 'noble'),
    [uusdcOnAgoric, agUSDCDetail],
    assetOn('uusdc', 'noble', 'osmosis', testChainInfo),
    ['uusdc', { baseName: 'noble', chainName: 'agoric', baseDenom: 'uusdc' }],
  ]);

  return {
    ...common,
    brands: { usdc: usdcSansMint },
    commonPrivateArgs: {
      ...common.commonPrivateArgs,
      assetInfo,
    },
    utils: common.utils,
  };
};

export { testChainInfo };
