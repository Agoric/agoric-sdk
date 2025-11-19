import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { mustMatch } from '@agoric/internal';
import {
  FlowDetailShape,
  FlowStatusShape,
  FlowStepsShape,
  PortfolioStatusShapeExt,
  PoolPlaces,
  makeFlowPath,
  makePortfolioPath,
  makePositionPath,
  portfolioIdFromKey,
  portfolioIdOfPath,
  readPortfolioLatest,
  type PortfolioLatestSnapshot,
} from '../src/vstorage-schema.js';
import type { StatusFor } from '../src/types.js';

const { brand: USDC } = makeIssuerKit('USDC');
const amount = AmountMath.make(USDC, 1n);

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
  t.notThrows(() => mustMatch(harden({ type: 'withdraw', amount }), FlowDetailShape));
});

test('readPortfolioLatest combines flowsRunning and flow nodes', async t => {
  const portfoliosPathPrefix = 'published.ymax0.portfolios';
  const portfolioKey = 'portfolio3' as const;
  const store = new Map<string, unknown>();
  const portfolioPath = `${portfoliosPathPrefix}.${portfolioKey}`;

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
  store.set(portfolioPath, status);
  store.set(`${portfolioPath}.flows.flow1`, {
    state: 'run',
    step: 1,
    how: 'deposit',
    type: 'deposit',
    amount,
  } satisfies StatusFor['flow']);

  const readLatest = async (path: string) => {
    if (!store.has(path)) throw Error(`missing ${path}`);
    return store.get(path);
  };
  const listChildren = async (path: string) => {
    const prefix = `${path}.`;
    const children = new Set<string>();
    for (const key of store.keys()) {
      if (!key.startsWith(prefix)) continue;
      children.add(key.slice(prefix.length).split('.')[0]!);
    }
    return [...children];
  };

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
