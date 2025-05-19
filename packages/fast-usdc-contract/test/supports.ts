import { makeIssuerKit } from '@agoric/ertp';
import type {
  CctpTxEvidence,
  FeeConfig,
  TransactionRecord,
} from '@agoric/fast-usdc/src/types.ts';
import {
  makeFeeTools,
  type RepayAmountKWR,
} from '@agoric/fast-usdc/src/utils/fees.js';
import {
  denomHash,
  type CosmosChainInfo,
  type Denom,
} from '@agoric/orchestration';
import { type DenomDetail } from '@agoric/orchestration/src/exos/chain-hub.js';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import { setupOrchestrationTest } from '@agoric/orchestration/tools/contract-tests.ts';
import { reincarnate } from '@agoric/swingset-liveslots/tools/setup-vat-data.js';
import type { AssetInfo } from '@agoric/vats/src/vat-bank.js';
import { withAmountUtils } from '@agoric/zoe/tools/test-utils.js';
import { type Zone } from '@agoric/zone';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { E } from '@endo/far';
import type { ExecutionContext } from 'ava';
import { makeTestFeeConfig } from './mocks.js';

export {
  makeFakeLocalchainBridge,
  makeFakeTransferBridge,
} from '@agoric/vats/tools/fake-bridge.js';

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

/**
 * Reincarnate without relaxDurabilityRules and provide a durable zone in the incarnation.
 * @param key
 */
export const provideDurableZone = (key: string): Zone => {
  const { fakeVomKit } = reincarnate({ relaxDurabilityRules: false });
  const root = fakeVomKit.cm.provideBaggage();
  const zone = makeDurableZone(root);
  return zone.subZone(key);
};

/** Setup with mocks common to Fast USDC contract tests. */
export const setupFastUsdcTest = async ({
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
    assetOn('uusdc', 'noble', 'osmosis', fetchedChainInfo),
  ]);

  /** Read the deserialized transaction status from storage */
  const readTxnRecord = ({
    txHash,
  }: {
    txHash: string;
  }): TransactionRecord[] => {
    return common.bootstrap.storage.getDeserialized(
      `orchtest.txns.${txHash}`,
    ) as TransactionRecord[];
  };

  const { chainHub } = common.facadeServices;
  const testFeeConfig = makeTestFeeConfig(usdc);

  /** calculate fee split for evidence */
  const splitFromEvidence = (
    evidence: CctpTxEvidence,
    feeConfig: FeeConfig = testFeeConfig,
  ): RepayAmountKWR => {
    return makeFeeTools(feeConfig).calculateSplit(
      usdc.make(evidence.tx.amount),
      chainHub.resolveAccountId(evidence.aux.recipientAddress),
    );
  };

  return {
    ...common,
    brands: {
      usdc: usdcSansMint,
    },
    commonPrivateArgs: {
      ...common.commonPrivateArgs,
      feeConfig: testFeeConfig,
      assetInfo,
    },
    utils: {
      ...common.utils,
      splitFromEvidence,
    },
    readTxnRecord,
  };
};
