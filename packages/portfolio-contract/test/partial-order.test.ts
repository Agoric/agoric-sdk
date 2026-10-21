import '@endo/init/debug.js';

import test from 'ava';
import type { AssetPlaceRef } from '../src/type-guards-steps.js';
import {
  computePartialOrder,
  type SolvedEdgeFlow,
} from '../tools/plan-solve.js';

/**
 * Helper to create test flows
 */
const makeFlow = (
  src: string,
  dest: string,
  flow: number,
  id?: string,
): SolvedEdgeFlow => ({
  edge: {
    id: id || `${src}->${dest}`,
    src: src as any,
    dest: dest as any,
    variableFeeBps: 0,
    timeSec: 0,
    capacity: BigInt(flow * 2),
    transfer: 'local',
  },
  flow,
  used: true,
});

test('computePartialOrder - simple fan-out (step 0 -> steps 1,2)', t => {
  const initialSupplies = new Map<AssetPlaceRef, number>([['@agoric', 100]]);
  const flows = [
    makeFlow('@agoric', '@noble', 100),
    makeFlow('@noble', '@Arbitrum', 50),
    makeFlow('@noble', '@Optimism', 50),
  ];
  const { prioritized, order } = computePartialOrder(flows, initialSupplies);

  t.deepEqual(
    prioritized,
    flows,
    '@agoric->@noble -> (@noble->@Arbitrum, @noble->@Optimism)',
  );
  t.deepEqual(
    order,
    [
      [1, [0]], // step 1 depends on step 0
      [2, [0]], // step 2 depends on step 0
    ],
    'both outflows from @noble depend on the inflow',
  );
});

test('computePartialOrder - withdraw and rebalance', t => {
  const initialSupplies = new Map<AssetPlaceRef, number>([
    ['@noble', 50],
    ['@agoric', 100],
  ]);
  const flows = [
    makeFlow('@noble', '<Cash>', 50, 'n-cash'),
    makeFlow('@agoric', '@noble', 100, 'a-noble'),
    makeFlow('@noble', '@Arbitrum', 100, 'n-out'),
  ];
  const { prioritized, order } = computePartialOrder(flows, initialSupplies);

  t.deepEqual(
    prioritized,
    [flows[1], flows[0], flows[2]],
    'a-noble, n-cash, n-out',
  );
  t.deepEqual(
    order,
    [[2, [0]]],
    'n-cash and a-noble consume initial supply, but n-out needs a-noble',
  );
});

test('computePartialOrder - multiple inflows to same node', t => {
  const initialSupplies = new Map<AssetPlaceRef, number>([
    ['@agoric', 50],
    ['@Optimism', 50],
  ]);
  const flows = [
    makeFlow('@agoric', '@noble', 50, 'agoric->noble'),
    makeFlow('@Optimism', '@noble', 50, 'opt->noble'),
    makeFlow('@noble', '@Arbitrum', 100, 'noble->arb'),
  ];
  const { prioritized, order } = computePartialOrder(flows, initialSupplies);

  // agoric->noble and opt->noble consume initial supply, but noble->arb needs
  // both inflows.
  t.deepEqual(prioritized, flows, '(agoric->noble, opt->noble) -> noble->arb');
  t.deepEqual(order, [[2, [0, 1]]], 'step 2 depends on both inflows');
});

test('computePartialOrder - independent arcs', t => {
  const initialSupplies = new Map<AssetPlaceRef, number>([
    ['@agoric', 100],
    ['@Optimism', 50],
  ]);
  const flows = [
    makeFlow('@agoric', '@noble', 100),
    makeFlow('@Optimism', '@Arbitrum', 50),
  ];
  const { prioritized, order } = computePartialOrder(flows, initialSupplies);

  t.is(prioritized.length, 2);
  t.deepEqual(order, [], 'no dependencies');
});

test('computePartialOrder - diamond pattern', t => {
  // Diamond: A -> B, A -> C, B -> D, C -> D
  //        A
  //       / \
  //      B   C
  //       \ /
  //        D
  const initialSupplies = new Map([['@A', 100]]) as unknown as Map<
    AssetPlaceRef,
    number
  >;
  const flows = [
    makeFlow('@A', '@B', 50, 'a->b'),
    makeFlow('@A', '@C', 50, 'a->c'),
    makeFlow('@B', '@D', 50, 'b->d'),
    makeFlow('@C', '@D', 50, 'c->d'),
  ];
  const { prioritized, order } = computePartialOrder(flows, initialSupplies);

  // a->b and a->c consume initial supply, but b->d needs a->b and c->d needs a->c.
  t.deepEqual(prioritized, flows, '(a->b, a->c), b->d, c->d');
  t.deepEqual(
    order,
    [
      [2, [0]],
      [3, [1]],
    ],
    'two mutually-independent paths',
  );
});

test('computePartialOrder - single linear path', t => {
  const initialSupplies = new Map([['@A', 100]]) as unknown as Map<
    AssetPlaceRef,
    number
  >;
  const flows = [
    makeFlow('@A', '@B', 100, 'a->b'),
    makeFlow('@B', '@C', 100, 'b->c'),
    makeFlow('@C', '@D', 100, 'c->d'),
  ];
  const { prioritized, order } = computePartialOrder(flows, initialSupplies);

  t.deepEqual(prioritized, flows, 'a->b -> b->c -> c->d');
  t.is(order, undefined, 'implicit trivial linear order is omitted');
});

test('computePartialOrder - partial initial supply', t => {
  // @noble has 30, needs to receive 70 more to send 100
  const initialSupplies = new Map<AssetPlaceRef, number>([
    ['@agoric', 70],
    ['@noble', 30],
  ]);
  const flows = [
    makeFlow('@agoric', '@noble', 70),
    makeFlow('@noble', '@Arbitrum', 100),
  ];
  const { prioritized, order } = computePartialOrder(flows, initialSupplies);

  t.deepEqual(prioritized, flows, '@agoric->@noble -> @noble->@Arbitrum');
  t.is(order, undefined, 'implicit trivial linear order is omitted');
});
