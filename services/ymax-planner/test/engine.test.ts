import test from 'ava';

import { Fail } from '@endo/errors';

import { boardSlottingMarshaller } from '@agoric/client-utils';
import type { VStorage } from '@agoric/client-utils';
import {
  AmountMath,
  type Brand,
  type DisplayInfo,
  type Issuer,
} from '@agoric/ertp';
import { objectMap } from '@agoric/internal';
import type { PortfolioPlanner } from '@aglocal/portfolio-contract/src/planner.exo.ts';
import type {
  FlowDetail,
  StatusFor,
} from '@aglocal/portfolio-contract/src/type-guards.ts';
import type { MovementDesc } from '@aglocal/portfolio-contract/src/type-guards-steps.js';
import type { AssetInfo } from '@agoric/vats/src/vat-bank.js';
import { Far } from '@endo/pass-style';
import type { CosmosRestClient } from '../src/cosmos-rest-client.ts';
import { pickBalance, processPortfolioEvents } from '../src/engine.ts';
import {
  createMockEnginePowers,
  createMockCosmosRestClient,
  mockGasEstimator,
} from './mocks.ts';

let lastIbcId = 100;
const mockAsset = (
  name: string,
): AssetInfo & { brand: Brand<'nat'>; boardId: string } => {
  // avoid VatData but provide boardSlottingMarshaller-friendly brands
  const boardId = `${name}-brand-slot`;
  const brand = Far(`${name} brand`, {
    getBoardId: () => boardId,
  }) as unknown as Brand<'nat'>;
  const issuer = Far(`${name} issuer`) as Issuer<'nat'>;
  const displayInfo: DisplayInfo = harden({
    assetKind: 'nat',
    decimalPlaces: 6,
  });
  const denom = `ibc/${++lastIbcId}`;
  return harden({
    brand,
    denom,
    issuer,
    displayInfo,
    issuerName: name,
    proposedName: name,

    boardId,
  });
};

test('ignore additional balances', t => {
  const usdc = mockAsset('USDC');
  const { denom, brand } = usdc;

  const balances = [
    { amount: '50', denom },
    { amount: '123', denom: 'ubld' },
  ];

  const actual = pickBalance(balances, usdc);
  t.deepEqual(actual, { brand, value: 50n });
});

test('processPortfolioEvents only resolves flows for new portfolio states', async t => {
  const { brand: depositBrand, boardId: depositBoardId } = mockAsset('USDC');
  const { brand: feeBrand, boardId: feeBoardId } = mockAsset('Fee');
  const slotRegistry = new Map([
    [depositBoardId, depositBrand],
    [feeBoardId, feeBrand],
  ]);
  const marshaller = boardSlottingMarshaller(
    slot => slotRegistry.get(slot as string) || Fail`Unknown slot ${slot}`,
  );

  const portfoliosPathPrefix = 'published.ymaxTest.portfolios';
  const portfolioKey = 'portfolio5';
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
    flowsRunning: {
      flow1: {
        type: 'deposit',
        amount: AmountMath.make(depositBrand, 1_000_000n),
      },
    },
  });
  const portfolioStreamCellJson = JSON.stringify({
    blockHeight: '10',
    values: [JSON.stringify(marshaller.toCapData(portfolioStatus))],
  });

  const vstorageData: Record<string, string[] | string> = {
    [`${portfoliosPathPrefix}.${portfolioKey} data`]: portfolioStreamCellJson,
    [`${portfoliosPathPrefix}.${portfolioKey}.flows children`]: [],
  };
  const readStorageMetaResponses = objectMap(vstorageData, (data, key) => {
    const base = { blockHeight: 40n };
    if (key.endsWith(' children')) {
      return { ...base, result: { children: data } };
    } else if (key.endsWith(' data')) {
      return { ...base, result: { value: data } };
    }
    Fail`Invalid vstorage query: ${key}`;
  });
  const readStorageMeta: VStorage['readStorageMeta'] = async (
    path,
    { kind } = {},
  ) =>
    (readStorageMetaResponses[`${path} ${kind}`] as any) ||
    Fail`Unexpected vstorage query: ${path} ${kind}`;
  const sswkQuery = { vstorage: { readStorageMeta } };

  const signingSmartWalletKit = { marshaller, query: sswkQuery } as any;

  const recordedSteps: MovementDesc[][] = [];
  const planner: PortfolioPlanner = {
    ...({} as any),
    resolvePlan: (_portfolioId, _flowId, steps) => {
      recordedSteps.push(steps as MovementDesc[]);
    },
  };

  const portfolioKeyForDepositAddr = new Map();
  const getAccountBalance: CosmosRestClient['getAccountBalance'] = async (
    _chainKey,
    _address,
    denom,
  ) => ({ amount: '0', denom });
  const powers = {
    ...createMockEnginePowers(),
    cosmosRest: { getAccountBalance } as any,
    signingSmartWalletKit,
    walletStore: { get: () => planner } as any,
    gasEstimator: mockGasEstimator,
    isDryRun: true,
    depositBrand,
    feeBrand,
    portfolioKeyForDepositAddr,
    vstoragePathPrefixes: { portfoliosPathPrefix },
  };

  const makeEvents = (
    blockHeight: bigint,
  ): Parameters<typeof processPortfolioEvents>[0] => [
    {
      path: `${portfoliosPathPrefix}.${portfolioKey}`,
      value: portfolioStreamCellJson,
      eventRecord: {
        blockHeight,
        type: 'kvstore' as const,
        event: { type: 'state_change', attributes: [] },
      },
    },
  ];

  const memory: any = { deferrals: [] as any[] };
  await processPortfolioEvents(makeEvents(30n), 30n, memory, powers);
  await processPortfolioEvents(makeEvents(31n), 31n, memory, powers);

  t.is(recordedSteps.length, 1, 'planner invoked exactly once');
  t.true(recordedSteps[0]!.length > 0, 'planner receives non-empty steps');
  t.is(memory.snapshots?.get(portfolioKey)?.repeats, 1);
  t.is(powers.portfolioKeyForDepositAddr.size, 0);
});
