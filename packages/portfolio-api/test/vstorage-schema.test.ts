import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { mustMatch } from '@agoric/internal';
import {
  FlowDetailShape,
  FlowStatusShape,
  FlowStepsShape,
  PortfolioStatusShapeExt,
  PoolPlaces,
  enumeratePortfolioPlaces,
  makeFlowPath,
  makePortfolioPath,
  makePositionPath,
  makeMockVstorageReaders,
  portfolioIdFromKey,
  portfolioIdOfPath,
  readPortfolioHistoryEntries,
  readPortfolioLatest,
  selectPendingFlows,
  type PortfolioLatestSnapshot,
} from '../src/vstorage-schema.js';
import type { StatusFor } from '../src/types.js';

const { brand: USDC } = makeIssuerKit('USDC');
const amount = AmountMath.make(USDC, 1n);

const makeHistoryReadAt = history => {
  const normalized = new Map(
    [...history.entries()].map(([path, entries]) => {
      const normalizedEntries = entries
        .map(entry => ({
          blockHeight: BigInt(entry.blockHeight),
          values: entry.values,
        }))
        .sort((a, b) => Number(a.blockHeight - b.blockHeight));
      return [path, normalizedEntries];
    }),
  );
  return async (path, height) => {
    const entriesForPath = normalized.get(path) || [];
    const heightBig =
      height === undefined ? undefined : typeof height === 'bigint' ? height : BigInt(height);
    const candidates = entriesForPath.filter(entry =>
      heightBig === undefined ? true : entry.blockHeight <= heightBig,
    );
    const entry = candidates.at(-1);
    if (!entry) {
      throw Error(`no history for ${path} <= ${height}`);
    }
    return entry;
  };
};

test('path helpers and parsers', t => {
  t.deepEqual(makePortfolioPath(3), ['portfolio3']);
  t.deepEqual(makePositionPath(2, 'USDN'), ['portfolio2', 'positions', 'USDN']);
  t.deepEqual(makeFlowPath(5, 7), ['portfolio5', 'flows', 'flow7']);
  t.is(portfolioIdFromKey('portfolio9'), 9);
  t.is(portfolioIdOfPath('published.ymax0.portfolios.portfolio4'), 4);
  t.is(
    portfolioIdOfPath(['published', 'ymax0', 'portfolios', 'portfolio8']),
    8,
  );
});

test('shapes validate portfolio and flow data', t => {
  const portfolioStatus: StatusFor['portfolio'] = harden({
    positionKeys: ['USDN'],
    flowCount: 1,
    accountIdByChain: { agoric: 'cosmos:agoric-3:agoric1abc' },
    policyVersion: 0,
    rebalanceCount: 0,
    flowsRunning: { flow1: { type: 'deposit', amount } },
  });
  t.notThrows(() => mustMatch(portfolioStatus, PortfolioStatusShapeExt));

  const flowStatus: StatusFor['flow'] = harden({
    state: 'run',
    step: 1,
    how: 'deposit',
    type: 'deposit',
    amount,
  });
  t.notThrows(() => mustMatch(flowStatus, FlowStatusShape));
  t.notThrows(() =>
    mustMatch(
      harden([{ how: 'deposit', amount, src: '<Deposit>', dest: '@noble' }]),
      FlowStepsShape,
    ),
  );
  t.notThrows(() =>
    mustMatch(harden({ type: 'withdraw', amount }), FlowDetailShape),
  );
});

test('readPortfolioLatest combines flowsRunning and flow nodes', async t => {
  const portfoliosPathPrefix = 'published.ymax0.portfolios';
  const portfolioKey = 'portfolio3' as const;
  const portfolioPath = `${portfoliosPathPrefix}.${portfolioKey}`;
  const mock = makeMockVstorageReaders();

  const status: StatusFor['portfolio'] = {
    positionKeys: [PoolPlaces.USDN.protocol],
    flowCount: 2,
    accountIdByChain: { agoric: 'cosmos:agoric-3:agoric1abc' },
    policyVersion: 1,
    rebalanceCount: 0,
    flowsRunning: {
      flow2: { type: 'deposit', amount },
    },
  };
  mock.writeLatest(portfolioPath, status);
  mock.writeLatest(`${portfolioPath}.flows.flow1`, {
    state: 'run',
    step: 1,
    how: 'deposit',
    type: 'deposit',
    amount,
  } satisfies StatusFor['flow']);
  const { readLatest, listChildren } = mock;

  const snapshot: PortfolioLatestSnapshot = await readPortfolioLatest({
    readLatest,
    listChildren,
    portfoliosPathPrefix,
    portfolioKey,
  });

  t.deepEqual(snapshot.status, status);
  t.deepEqual(Object.keys(snapshot.flows).sort(), ['flow1', 'flow2']);
  t.is(snapshot.flows.flow2.phase, 'init');
  t.is(snapshot.flows.flow2.detail?.type, 'deposit');
  t.is(snapshot.flows.flow1.phase, 'running');
  t.truthy(snapshot.flows.flow1.status);
});

test('readPortfolioLatest materializes positions and chains when requested', async t => {
  const portfoliosPathPrefix = 'published.ymax0.portfolios';
  const portfolioKey = 'portfolio5' as const;
  const portfolioPath = `${portfoliosPathPrefix}.${portfolioKey}`;
  const mock = makeMockVstorageReaders();

  const status: StatusFor['portfolio'] = {
    positionKeys: ['USDN', 'Aave_Ethereum', 'Compound_Base'],
    flowCount: 0,
    accountIdByChain: {
      noble: 'cosmos:noble-1:noble1def',
      Ethereum: 'eip155:1:0xabc',
      Base: 'eip155:8453:0xdef',
      agoric: 'cosmos:agoric-3:agoric1xyz',
    },
    policyVersion: 3,
    rebalanceCount: 1,
  };
  mock.writeLatest(portfolioPath, status);
  const usdPosition: StatusFor['position'] = {
    protocol: 'USDN',
    accountId: status.accountIdByChain.noble!,
    totalIn: amount,
    totalOut: amount,
  };
  const aavePosition: StatusFor['position'] = {
    protocol: 'Aave',
    accountId: status.accountIdByChain.Ethereum!,
    totalIn: amount,
    totalOut: amount,
  };
  mock.writeLatest(`${portfolioPath}.positions.USDN`, usdPosition);
  mock.writeLatest(`${portfolioPath}.positions.Aave_Ethereum`, aavePosition);
  const { readLatest, listChildren } = mock;

  const snapshot = await readPortfolioLatest({
    readLatest,
    listChildren,
    portfoliosPathPrefix,
    portfolioKey,
    includePositions: true,
  });

  t.truthy(snapshot.positions);
  const positions = snapshot.positions ?? {};
  const positionsByChain = snapshot.positionsByChain ?? {};
  t.deepEqual(Object.keys(positions).sort(), [
    'Aave_Ethereum',
    'Compound_Base',
    'USDN',
  ]);
  t.is(positions.USDN?.chainName, 'noble');
  t.is(positions.USDN?.accountId, status.accountIdByChain.noble);
  t.is(positions.Compound_Base?.status, undefined);
  t.is(positions.Compound_Base?.accountId, status.accountIdByChain.Base);
  t.is(positions.Aave_Ethereum?.status?.protocol, 'Aave');
  t.truthy(positionsByChain.Ethereum);
  t.is(positionsByChain.Base?.positions.length, 1);
  t.is(positionsByChain.Base?.positions[0]?.poolKey, 'Compound_Base');
  t.true(Array.isArray(positionsByChain.agoric?.positions));
  t.is(positionsByChain.agoric?.positions.length, 0);
});

test('enumeratePortfolioPlaces joins account and position metadata', t => {
  const status: StatusFor['portfolio'] = {
    positionKeys: ['USDN', 'Aave_Ethereum'],
    accountIdByChain: {
      noble: 'cosmos:noble-1:noble1def',
      Ethereum: 'eip155:1:0xabc',
    },
    flowCount: 0,
    policyVersion: 0,
    rebalanceCount: 0,
  } as StatusFor['portfolio'];

  const places = enumeratePortfolioPlaces({ status });
  t.is(places.chainAccounts.length, 2);
  t.deepEqual(places.chainAccounts.map(({ chainName }) => chainName).sort(), [
    'Ethereum',
    'noble',
  ]);
  const [usdPlace] = places.positions.filter(p => p.poolKey === 'USDN');
  t.is(usdPlace?.chainName, 'noble');
  t.is(usdPlace?.accountId, status.accountIdByChain.noble);
  const aavePlace = places.positions.find(p => p.poolKey === 'Aave_Ethereum');
  t.truthy(aavePlace?.pool?.protocol);
});

test('readPortfolioHistoryEntries collects chronological events', async t => {
  const portfoliosPathPrefix = 'published.ymax0.portfolios';
  const portfolioKey = 'portfolio1' as const;
  const portfolioPath = `${portfoliosPathPrefix}.${portfolioKey}`;
  const statusA: StatusFor['portfolio'] = {
    positionKeys: ['USDN'],
    flowCount: 0,
    accountIdByChain: {},
    policyVersion: 1,
    rebalanceCount: 0,
  } as StatusFor['portfolio'];
  const statusB: StatusFor['portfolio'] = {
    ...statusA,
    policyVersion: 2,
    flowsRunning: { flow1: { type: 'deposit', amount } },
  };
  const flowStatus: StatusFor['flow'] = {
    state: 'run',
    step: 1,
    how: 'deposit',
    type: 'deposit',
    amount,
  };
  const history = new Map([
    [
      portfolioPath,
      [
        { blockHeight: 12n, values: [statusB] },
        { blockHeight: 8n, values: [statusA] },
      ],
    ],
    [
      `${portfolioPath}.flows.flow1`,
      [{ blockHeight: 10n, values: [flowStatus] }],
    ],
    [
      `${portfolioPath}.positions.USDN`,
      [
        {
          blockHeight: 11n,
          values: [
            {
              protocol: 'USDN',
              accountId: statusA.accountIdByChain?.noble,
              totalIn: AmountMath.make(USDC, 10n),
              totalOut: AmountMath.make(USDC, 1n),
            } satisfies StatusFor['position'],
          ],
        },
      ],
    ],
  ]);
  const readAt = makeHistoryReadAt(history);
  const listChildren = async path => {
    if (path.endsWith('.flows')) return ['flow1'];
    if (path.endsWith('.positions')) return ['USDN'];
    return [];
  };
  const events = await readPortfolioHistoryEntries({
    readAt,
    listChildren,
    portfoliosPathPrefix,
    portfolioKey,
    decodeValue: value => value,
  });

  t.deepEqual(
    events.map(entry => [entry.kind, entry.blockHeight]),
    [
      ['portfolio', 8n],
      ['flow', 10n],
      ['position', 11n],
      ['portfolio', 12n],
    ],
  );
});

test('selectPendingFlows filters flows without nodes', async t => {
  const snapshot: PortfolioLatestSnapshot = {
    portfolioKey: 'portfolio7',
    status: /** @type {StatusFor['portfolio']} */ {
      positionKeys: [],
      flowCount: 0,
      accountIdByChain: {},
      policyVersion: 0,
      rebalanceCount: 0,
      flowsRunning: {},
    },
    flows: {
      flow1: {
        flowKey: 'flow1',
        detail: { type: 'deposit', amount },
        status: undefined,
        steps: undefined,
        order: undefined,
        phase: 'init',
      },
      flow2: {
        flowKey: 'flow2',
        detail: { type: 'withdraw', amount },
        status: {
          state: 'run',
          step: 1,
          how: 'withdraw',
          type: 'withdraw',
          amount,
        } as StatusFor['flow'],
        steps: undefined,
        order: undefined,
        phase: 'running',
      },
    },
  } as any;

  const pending = selectPendingFlows(snapshot);
  t.is(pending.length, 1);
  t.is(pending[0]?.flowKey, 'flow1');
});
