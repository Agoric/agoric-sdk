import test from 'ava';
import {
  computePartialOrder,
  type SolvedEdgeFlow,
} from '../tools/plan-solve.js';
import type { FlowEdge } from '../tools/network/buildGraph.js';

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
    src,
    dest,
    capacity: flow * 2,
    variableFee: 0,
  } as FlowEdge,
  flow,
  used: true,
});

test('computePartialOrder - simple fan-out (step 0 -> steps 1,2)', t => {
  // Initial: @Noble has 0
  // Steps:
  //   0: @Agoric -> @Noble (100)
  //   1: @Noble -> @Arbitrum (50)
  //   2: @Noble -> @Optimism (50)
  // Expected: steps 1 and 2 both depend on step 0

  const flows = [
    makeFlow('@Agoric', '@Noble', 100),
    makeFlow('@Noble', '@Arbitrum', 50),
    makeFlow('@Noble', '@Optimism', 50),
  ];
  const initialSupplies = new Map([['@Agoric', 100]]);

  const { prioritized, order } = computePartialOrder(flows, initialSupplies);

  t.is(prioritized.length, 3);
  t.deepEqual(
    order,
    [
      [1, [0]], // step 1 depends on step 0
      [2, [0]], // step 2 depends on step 0
    ],
    'both outflows from @Noble depend on the inflow',
  );
});

test('computePartialOrder - withdraw and rebalance (design doc example)', t => {
  // This test corresponds to the "Withdraw and Rebalance" example in
  // services/ymax-planner/partial-order-design.md
  //
  // Initial: @Noble has 50 USDC, @Agoric has 100 USDC
  // Input flows:
  //   - @Noble -> <Cash> (50 USDC withdraw)
  //   - @Agoric -> @Noble (100 USDC)
  //   - @Noble -> @Arbitrum (100 USDC)
  //
  // The key insight: the 50 USDC withdraw uses @Noble's initial supply,
  // so it has NO dependencies and nothing depends on it.
  // The 100 USDC to @Arbitrum needs the inflow from @Agoric.
  //
  // After scheduling (sorted by edge ID: a < n-cash < n-out):
  //   Step 0: @Agoric -> @Noble (100)   <- uses initial supply at @Agoric, no deps
  //   Step 1: @Noble -> <Cash> (50)     <- uses initial supply at @Noble, no deps
  //   Step 2: @Noble -> @Arbitrum (100) <- needs inflow from step 0

  const flows = [
    makeFlow('@Noble', '<Cash>', 50, 'n-cash'),
    makeFlow('@Agoric', '@Noble', 100, 'a-noble'),
    makeFlow('@Noble', '@Arbitrum', 100, 'n-out'),
  ];
  const initialSupplies = new Map([
    ['@Noble', 50],
    ['@Agoric', 100],
  ]);

  const { prioritized, order } = computePartialOrder(flows, initialSupplies);

  t.is(prioritized.length, 3);

  // Verify the prioritized order (sorted by edge ID: a-noble < n-cash < n-out)
  t.is(prioritized[0].edge.id, 'a-noble', 'step 0 is @Agoric -> @Noble');
  t.is(prioritized[1].edge.id, 'n-cash', 'step 1 is @Noble -> <Cash>');
  t.is(prioritized[2].edge.id, 'n-out', 'step 2 is @Noble -> @Arbitrum');

  // Step 0 has no deps (uses initial supply at @Agoric)
  // Step 1 has no deps (uses initial supply at @Noble - the withdraw is independent!)
  // Step 2 needs 100 at @Noble: initial 50 was consumed by step 1, so needs all from step 0
  t.deepEqual(
    order,
    [[2, [0]]],
    'only step 2 depends on step 0; withdraw (step 1) is independent',
  );
});

test('computePartialOrder - multiple inflows to same node', t => {
  // Initial: @Noble has 0
  // Steps:
  //   0: @Agoric -> @Noble (50)
  //   1: @Optimism -> @Noble (50)
  //   2: @Noble -> @Arbitrum (100)  <- needs both inflows
  // Expected: step 2 depends on both steps 0 and 1

  const flows = [
    makeFlow('@Agoric', '@Noble', 50, 'agoric->noble'),
    makeFlow('@Optimism', '@Noble', 50, 'opt->noble'),
    makeFlow('@Noble', '@Arbitrum', 100, 'noble->arb'),
  ];
  const initialSupplies = new Map([
    ['@Agoric', 50],
    ['@Optimism', 50],
  ]);

  const { prioritized, order } = computePartialOrder(flows, initialSupplies);

  t.is(prioritized.length, 3);

  // Steps 0 and 1 can run in parallel (both have initial supply)
  // Step 2 needs both inflows
  t.deepEqual(order, [[2, [0, 1]]], 'step 2 depends on both inflows');
});

test('computePartialOrder - independent chains', t => {
  // Two completely independent transfer chains
  // Chain A: @Agoric -> @Noble (100)
  // Chain B: @Optimism -> @Arbitrum (50)
  // Expected: no dependencies at all

  const flows = [
    makeFlow('@Agoric', '@Noble', 100),
    makeFlow('@Optimism', '@Arbitrum', 50),
  ];
  const initialSupplies = new Map([
    ['@Agoric', 100],
    ['@Optimism', 50],
  ]);

  const { prioritized, order } = computePartialOrder(flows, initialSupplies);

  t.is(prioritized.length, 2);
  t.deepEqual(order, [], 'no dependencies between independent chains');
});

test('computePartialOrder - diamond pattern', t => {
  // Diamond: A -> B, A -> C, B -> D, C -> D
  //        A
  //       / \
  //      B   C
  //       \ /
  //        D
  // Steps:
  //   0: @A -> @B (50)
  //   1: @A -> @C (50)
  //   2: @B -> @D (50)
  //   3: @C -> @D (50)
  // Expected: 2 depends on 0, 3 depends on 1

  const flows = [
    makeFlow('@A', '@B', 50, 'a->b'),
    makeFlow('@A', '@C', 50, 'a->c'),
    makeFlow('@B', '@D', 50, 'b->d'),
    makeFlow('@C', '@D', 50, 'c->d'),
  ];
  const initialSupplies = new Map([['@A', 100]]);

  const { prioritized, order } = computePartialOrder(flows, initialSupplies);

  t.is(prioritized.length, 4);

  // Steps 0 and 1 can run in parallel (both from @A with initial supply)
  // Step 2 depends on step 0 (needs @B supply)
  // Step 3 depends on step 1 (needs @C supply)
  // The actual indices depend on execution order, but the pattern should be:
  // two steps with no deps, two steps each depending on one of the first two
  const deps0 = order.filter(([_, prereqs]) => prereqs.length === 0);
  const deps1 = order.filter(([_, prereqs]) => prereqs.length === 1);

  t.is(deps0.length, 0, 'first two steps have no deps (not in order array)');
  t.is(deps1.length, 2, 'last two steps each have one dep');
});

test('computePartialOrder - sequential chain', t => {
  // Linear: A -> B -> C -> D
  // Steps:
  //   0: @A -> @B (100)
  //   1: @B -> @C (100)
  //   2: @C -> @D (100)
  // Expected: full sequential dependency - but since execution defaults to
  // full order, the order property is omitted entirely

  const flows = [
    makeFlow('@A', '@B', 100, 'a->b'),
    makeFlow('@B', '@C', 100, 'b->c'),
    makeFlow('@C', '@D', 100, 'c->d'),
  ];
  const initialSupplies = new Map([['@A', 100]]);

  const result = computePartialOrder(flows, initialSupplies);

  t.is(result.prioritized.length, 3);
  t.is(
    result.order,
    undefined,
    'full sequential order is omitted (execution defaults to it)',
  );
});

test('computePartialOrder - partial initial supply', t => {
  // @Noble has 30, needs to receive 70 more to send 100
  // Steps:
  //   0: @Agoric -> @Noble (70)
  //   1: @Noble -> @Arbitrum (100)
  // Step 1 depends on step 0 (even though @Noble has some supply), but since
  // this is equivalent to full sequential order, the order property is omitted.

  const flows = [
    makeFlow('@Agoric', '@Noble', 70),
    makeFlow('@Noble', '@Arbitrum', 100),
  ];
  const initialSupplies = new Map([
    ['@Agoric', 70],
    ['@Noble', 30],
  ]);

  const result = computePartialOrder(flows, initialSupplies);

  t.is(result.prioritized.length, 2);
  t.is(
    result.order,
    undefined,
    'full sequential order is omitted (execution defaults to it)',
  );
});
