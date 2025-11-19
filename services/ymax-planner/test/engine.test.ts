/* eslint-disable @jessie.js/safe-await-separator */
import test from 'ava';

import { Fail } from '@endo/errors';

import type { PortfolioPlanner } from '@aglocal/portfolio-contract/src/planner.exo.ts';
import type { MovementDesc } from '@aglocal/portfolio-contract/src/type-guards-steps.js';
import type { StatusFor } from '@agoric/portfolio-api';
import type {
  QueryChildrenMetaResponse,
  QueryDataMetaResponse,
  VStorage,
} from '@agoric/client-utils';
import { boardSlottingMarshaller } from '@agoric/client-utils';
import {
  AmountMath,
  type Brand,
  type DisplayInfo,
  type Issuer,
} from '@agoric/ertp';
import type { AssetInfo } from '@agoric/vats/src/vat-bank.js';
import { Far } from '@endo/pass-style';
import type { CosmosRestClient } from '../src/cosmos-rest-client.ts';
import { pickBalance, processPortfolioEvents } from '../src/engine.ts';
import { setLogTarget } from '../src/logger.ts';
import { createMockEnginePowers, mockGasEstimator } from './mocks.ts';

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

  /** Updated as the test progresses. */
  let currentBlockHeight = 30n;
  const portfolioStatus: StatusFor['portfolio'] = {
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
  };
  const portfolioDataKey = `${portfoliosPathPrefix}.${portfolioKey} data`;
  const vstorageData: Record<string, string[] | string> = {
    [portfolioDataKey]: '<uninitialized>',
    [`${portfoliosPathPrefix}.${portfolioKey}.flows children`]: [],
  };
  const advanceBlock = () => {
    currentBlockHeight += 1n;
    portfolioStatus.rebalanceCount += 1;
    const newStatus = harden({ ...portfolioStatus });
    const newStreamCell = {
      blockHeight: `${currentBlockHeight}`,
      values: [JSON.stringify(marshaller.toCapData(newStatus))],
    };
    vstorageData[portfolioDataKey] = JSON.stringify(newStreamCell);
  };

  const readStorageMeta: VStorage['readStorageMeta'] = async (
    path,
    { kind } = {},
  ) => {
    const data =
      (vstorageData[`${path} ${kind}`] as any) ||
      Fail`Unexpected vstorage query: ${path} ${kind}`;

    const base = { blockHeight: currentBlockHeight };
    let resp: QueryChildrenMetaResponse | QueryDataMetaResponse | undefined;
    if (kind === 'children') resp = { ...base, result: { children: data } };
    if (kind === 'data') resp = { ...base, result: { value: data } };
    return (resp as any) || Fail`Unreachable`;
  };
  const sswkQuery = { vstorage: { readStorageMeta } };

  const signingSmartWalletKit = { marshaller, query: sswkQuery } as any;

  const recordedSteps: MovementDesc[][] = [];
  const planner: PortfolioPlanner = {
    ...({} as any),
    resolvePlan: (_portfolioId, _flowId, steps) => {
      recordedSteps.push(steps as MovementDesc[]);
      return { tx: { mock: true }, id: 'tx-recorded' };
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

  const memory: any = { deferrals: [] as any[] };
  const processNextBlock = async () => {
    advanceBlock();
    const event = {
      path: `${portfoliosPathPrefix}.${portfolioKey}`,
      value: vstorageData[portfolioDataKey] as string,
      eventRecord: {
        blockHeight: currentBlockHeight,
        type: 'kvstore' as const,
        event: { type: 'state_change', attributes: [] },
      },
    };
    await processPortfolioEvents([event], currentBlockHeight, memory, powers);
  };
  await processNextBlock();
  await processNextBlock();

  t.is(recordedSteps.length, 1, 'planner invoked exactly once');
  t.true(recordedSteps[0]!.length > 0, 'planner receives non-empty steps');
  t.is(memory.snapshots?.get(portfolioKey)?.repeats, 1);
  t.is(powers.portfolioKeyForDepositAddr.size, 0);
});

test('startFlow logs include traceId prefix', async t => {
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
  const portfolioKey = 'portfolio6';
  const flowKey = 'flow2';
  const tracePrefix = `[${portfolioKey}.${flowKey}] `;

  const currentBlockHeight = 10n;
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
      [flowKey]: {
        type: 'deposit',
        amount: AmountMath.make(depositBrand, 1_000_000n),
      },
    },
  });
  const portfolioDataKey = `${portfoliosPathPrefix}.${portfolioKey} data`;
  const streamCell = {
    blockHeight: `${currentBlockHeight}`,
    values: [JSON.stringify(marshaller.toCapData(portfolioStatus))],
  };
  const vstorageData: Record<string, string[] | string> = {
    [portfolioDataKey]: JSON.stringify(streamCell),
    [`${portfoliosPathPrefix}.${portfolioKey}.flows children`]: [],
  };

  // @ts-expect-error mock
  const readStorageMeta: VStorage['readStorageMeta'] = async (
    path,
    { kind } = {},
  ) => {
    const data =
      (vstorageData[`${path} ${kind}`] as any) ||
      Fail`Unexpected vstorage query: ${path} ${kind}`;

    const base = { blockHeight: currentBlockHeight };
    if (kind === 'children') return { ...base, result: { children: data } };
    if (kind === 'data') return { ...base, result: { value: data } };
    throw Fail`Unreachable`;
  };
  const sswkQuery = { vstorage: { readStorageMeta } };

  const signingSmartWalletKit = { marshaller, query: sswkQuery } as any;

  const planner: PortfolioPlanner = {
    ...({} as any),
    resolvePlan: async () => ({
      tx: { mock: true },
      id: 'tx1',
    }),
  };

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
    portfolioKeyForDepositAddr: new Map(),
    vstoragePathPrefixes: { portfoliosPathPrefix },
  };

  const captured: Array<{ level: 'debug' | 'info'; args: any[] }> = [];
  const originalLogTarget = console;
  try {
    setLogTarget({
      ...console,
      debug: (...args: any[]) => captured.push({ level: 'debug', args }),
      info: (...args: any[]) => captured.push({ level: 'info', args }),
    });

    await processPortfolioEvents(
      [
        {
          path: `${portfoliosPathPrefix}.${portfolioKey}`,
          value: vstorageData[portfolioDataKey] as string,
          eventRecord: {
            blockHeight: currentBlockHeight,
            type: 'kvstore' as const,
            event: { type: 'state_change', attributes: [] },
          },
        },
      ],
      currentBlockHeight,
      { deferrals: [] },
      powers,
    );
  } finally {
    setLogTarget(originalLogTarget);
  }

  const tracedLogs = captured.filter(
    ({ level, args }) =>
      ['debug', 'info'].includes(level) && args[0] === tracePrefix,
  );
  t.true(tracedLogs.length >= 2, 'captured start and completion logs');
  t.true(
    tracedLogs.every(entry => entry.args[0] === tracePrefix),
    'all traced logs include the trace prefix',
  );
});
