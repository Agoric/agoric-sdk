import test from 'ava';

import { boardSlottingMarshaller } from '@agoric/client-utils';
import {
  AmountMath,
  type Brand,
  type DisplayInfo,
  type Issuer,
} from '@agoric/ertp';
import type {
  FlowDetail,
  StatusFor,
} from '@aglocal/portfolio-contract/src/type-guards.ts';
import type { MovementDesc } from '@aglocal/portfolio-contract/src/type-guards-steps.js';
import type { AssetInfo } from '@agoric/vats/src/vat-bank.js';
import { Far } from '@endo/pass-style';
import { pickBalance, processPortfolioEvents } from '../src/engine.ts';

const mockDepositAsset = (name: string, assetKind: 'nat') => {
  // avoid VatData but provide boardSlottingMarshaller-friendly brands
  const brand = Far(`${name} brand`, {
    getBoardId: () => `${name}-brand-slot`,
  }) as unknown as Brand<'nat'>;
  const issuer = Far(`${name} issuer`) as Issuer<'nat'>;
  const displayInfo: DisplayInfo = harden({ assetKind, decimalPlaces: 6 });
  const denom = 'ibc/123';
  const depositAsset: AssetInfo = harden({
    brand,
    denom,
    issuer,
    displayInfo,
    issuerName: name,
    proposedName: name,
  });
  return depositAsset;
};

test('ignore additional balances', t => {
  const usdc = mockDepositAsset('USDC', 'nat');
  const { denom, brand } = usdc;

  const balances = [
    { amount: '50', denom },
    { amount: '123', denom: 'ubld' },
  ];

  const actual = pickBalance(balances, usdc);
  t.deepEqual(actual, { brand, value: 50n });
});

test('processPortfolioEvents only resolves flows for new portfolio states', async t => {
  const depositAsset = mockDepositAsset('USDC', 'nat');
  const feeAsset = mockDepositAsset('Fee', 'nat');
  const depositBrand = depositAsset.brand as Brand<'nat'>;
  const feeBrand = feeAsset.brand as Brand<'nat'>;
  const slotRegistry = new Map([
    ['USDC-brand-slot', depositBrand],
    ['Fee-brand-slot', feeBrand],
  ]);
  const marshaller = boardSlottingMarshaller(slot => {
    const value = slotRegistry.get(slot as string);
    if (!value) {
      throw Error(`Unknown slot ${slot}`);
    }
    return value;
  });
  const flowKey = 'flow1';
  const flowDetail: FlowDetail = harden({
    type: 'deposit',
    amount: AmountMath.make(depositBrand, 1_000_000n),
  });

  const portfolioKey = 'portfolio5';
  const portfoliosPathPrefix = 'published.ymaxTest.portfolios';
  const pendingTxPathPrefix = 'published.ymaxTest.pendingTxs';
  const portfolioStatus: StatusFor['portfolio'] = harden({
    positionKeys: ['USDN'],
    flowCount: 1,
    accountIdByChain: {
      noble: 'cosmos:noble:noble1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq',
    },
    policyVersion: 1,
    rebalanceCount: 0,
    targetAllocation: {
      USDN: 1n,
    },
    flowsRunning: { [flowKey]: flowDetail },
  });
  const streamCellJson = JSON.stringify({
    blockHeight: '10',
    values: [JSON.stringify(marshaller.toCapData(portfolioStatus))],
  });

  const simulatedBlockHeight = 40n;
  const vstorage = {
    async readStorageMeta(
      _path: string,
      { kind }: { kind: 'data' | 'children' },
    ) {
      if (kind === 'data') {
        return {
          blockHeight: simulatedBlockHeight,
          result: { value: streamCellJson },
        };
      }
      if (kind === 'children') {
        return { blockHeight: simulatedBlockHeight, result: { children: [] } };
      }
      throw Error(`Unexpected readStorageMeta kind ${kind}`);
    },
  };
  const signingSmartWalletKit = {
    marshaller,
    query: { vstorage },
  };

  const recordedSteps: MovementDesc[][] = [];
  const planner = {
    async resolvePlan(
      portfolioId: number,
      flowId: number,
      steps: MovementDesc[],
    ) {
      recordedSteps.push(steps);
      return {
        tx: { hash: `${portfolioId}-${flowId}` },
        id: `msg-${recordedSteps.length}`,
      };
    },
  };
  const walletStore = {
    get: () => planner,
  };

  const memory: any = { deferrals: [] as any[] };
  const portfolioKeyForDepositAddr = new Map();
  const cosmosRest = {
    async getAccountBalance(
      _chain: string,
      _address: string,
      denom: string,
    ) {
      return { amount: '0', denom };
    },
  };
  const gasEstimator = {
    async getWalletEstimate() {
      return 1n;
    },
    async getFactoryContractEstimate() {
      return 1n;
    },
    async getReturnFeeEstimate() {
      return 1n;
    },
  };
  const powers: any = {
    isDryRun: true,
    cosmosRest,
    spectrum: {},
    spectrumBlockchain: undefined,
    spectrumPools: undefined,
    spectrumChainIds: {},
    spectrumPoolIds: {},
    signingSmartWalletKit,
    walletStore,
    getWalletInvocationUpdate: () => Promise.resolve(),
    gasEstimator,
    depositBrand,
    feeBrand,
    portfolioKeyForDepositAddr,
    usdcTokensByChain: {},
    vstoragePathPrefixes: { portfoliosPathPrefix, pendingTxPathPrefix },
  };

  const makeEvents = (
    blockHeight: bigint,
  ): Parameters<typeof processPortfolioEvents>[0] => [
    {
      path: `${portfoliosPathPrefix}.${portfolioKey}`,
      value: streamCellJson,
      eventRecord: {
        blockHeight,
        type: 'kvstore' as const,
        event: { type: 'state_change', attributes: [] },
      },
    },
  ];

  await processPortfolioEvents(makeEvents(30n), 30n, memory, powers);
  await processPortfolioEvents(makeEvents(31n), 31n, memory, powers);

  t.is(recordedSteps.length, 1, 'planner invoked exactly once');
  t.true(recordedSteps[0]!.length > 0, 'planner receives non-empty steps');
  t.is(memory.snapshots?.get(portfolioKey)?.repeats, 1);
  t.is(powers.portfolioKeyForDepositAddr.size, 0);
});
