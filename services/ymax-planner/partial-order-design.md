# Partial Order Step Generation

## Overview

This document describes how to generate `FundsFlowPlan` with partial order dependencies instead of a fully-ordered `MovementDesc[]`. The contract already supports partial order execution via `runJob` in `schedule-order.ts`; this design enables the planner to leverage that capability.

**TL;DR:** Compute a DAG from the solved graph flows (not from linearized steps) and emit `[target, prereqs[]][]` alongside `MovementDesc[]`, enabling concurrent execution of independent steps.

## Current State

1. **`planRebalanceFlow`** in [`packages/portfolio-contract/tools/plan-solve.ts`](../../packages/portfolio-contract/tools/plan-solve.ts) produces a fully-ordered `MovementDesc[]`
2. **`FundsFlowPlan`** in [`packages/portfolio-api/src/types.ts`](../../packages/portfolio-api/src/types.ts) already supports optional `order` field
3. **`runJob`** in [`packages/portfolio-contract/src/schedule-order.ts`](../../packages/portfolio-contract/src/schedule-order.ts) executes steps concurrently when dependencies allow
4. **`engine.ts`** currently passes only `steps` to `resolvePlan()`, so the contract defaults to `fullOrder()`

## Key Insight: Compute Order from Graph, Not Steps

The partial order must be computed from the **solved graph flows**, not reconstructed from the linearized steps. This is critical because:

1. **Multiple operations to/from the same node** may have separate dependencies
2. **Initial supplies** at a node can satisfy some outflows immediately
3. **Linearization loses information** about which specific inflow enables which outflow

### Example: Withdraw and Rebalance

Consider `@Noble` with 50 USDC initial balance and `@Agoric` with 100 USDC. A "withdraw and rebalance" operation might have these input flows:
- **Input 0:** `@Noble → <Cash>` (50 USDC withdraw)
- **Input 1:** `@Agoric → @Noble` (100 USDC)
- **Input 2:** `@Noble → @Arbitrum` (100 USDC)

The algorithm schedules flows in deterministic order (sorted by edge ID) while tracking initial supply consumption:
- **Step 0:** `@Agoric → @Noble` (scheduled first by edge ID) — no deps, uses initial supply at @Agoric
- **Step 1:** `@Noble → @Arbitrum` — depends on Step 0 (needs 50 from initial + 50 from inflow)
- **Step 2:** `@Noble → <Cash>` — depends on Step 0 (initial supply at @Noble exhausted by Step 1)

Note: The algorithm reorders flows for optimal scheduling. The key insight is that **remaining initial supply** is tracked as it's consumed, so each flow only depends on the inflows it actually needs.

## Design

### Step 1: Compute Dependencies from Solved Flows

During `rebalanceMinCostFlowSteps`, track which inflows satisfy which outflows:

```typescript
type StepOrder = [target: number, prereqs: number[]][];

/**
 * Compute partial order from solved flows and initial supplies.
 * 
 * For each node, we track available supply (initial + completed inflows).
 * An outflow step depends on the minimum set of inflow steps needed to
 * provide sufficient supply. Critically, we track *remaining* initial
 * supply as it's consumed by earlier-scheduled flows.
 */
const computePartialOrder = (
  flows: SolvedEdgeFlow[],
  initialSupplies: Map<string, number>,
): { prioritized: SolvedEdgeFlow[]; order: StepOrder } => {
  // Available supply at each node (starts with initial supplies)
  const available = new Map(initialSupplies);
  
  // Track remaining initial supply (decremented as consumed)
  const initialRemaining = new Map(initialSupplies);
  
  // For each node, track which step indices have deposited to it
  // Key: node, Value: array of { flowIx, amount }
  const inflows = new Map<string, { flowIx: number; amount: number }[]>();
  
  // Annotate flows with source chain for grouping heuristic
  const annotatedFlows = flows
    .filter(f => f.flow > FLOW_EPS)
    .map(f => ({ ...f, srcChain: chainOf(f.edge.src) }));
  
  const order: StepOrder = [];
  const prioritized: AnnotatedFlow[] = [];
  const scheduled = new Set<number>();
  let lastChain: string | undefined;  // for chain grouping heuristic
  
  while (scheduled.size < annotatedFlows.length) {
    // Find flows that can execute with current available supply
    const candidates: { ix: number; flow: AnnotatedFlow }[] = [];
    for (let ix = 0; ix < annotatedFlows.length; ix++) {
      if (scheduled.has(ix)) continue;
      const flow = annotatedFlows[ix];
      const avail = available.get(flow.edge.src) || 0;
      if (avail >= flow.flow) {
        candidates.push({ ix, flow });
      }
    }
    
    if (!candidates.length) {
      throw new Error('Scheduling deadlock');
    }
    
    // Prefer continuing with lastChain if possible, then sort by edge ID
    const fromSameChain = lastChain
      ? candidates.filter(c => c.flow.srcChain === lastChain)
      : undefined;
    const chosenGroup = fromSameChain?.length ? fromSameChain : candidates;
    chosenGroup.sort((a, b) => naturalCompare(a.flow.edge.id, b.flow.edge.id));
    const { ix: chosenIx, flow: chosen } = chosenGroup[0];
    
    // Compute prerequisites: which inflows provided the supply we're consuming?
    const prereqs: number[] = [];
    const srcInflows = inflows.get(chosen.edge.src) || [];
    const remainingInitial = initialRemaining.get(chosen.edge.src) || 0;
    
    // Use remaining initial supply first, then inflows
    let needed = chosen.flow;
    const usedFromInitial = Math.min(remainingInitial, needed);
    needed -= usedFromInitial;
    initialRemaining.set(chosen.edge.src, remainingInitial - usedFromInitial);
    
    for (const inflow of srcInflows) {
      if (needed <= 0) break;
      prereqs.push(inflow.flowIx);
      needed -= inflow.amount;
    }
    
    if (prereqs.length > 0) {
      order.push([prioritized.length, prereqs]);
    }
    
    // Update state
    available.set(chosen.edge.src, (available.get(chosen.edge.src) || 0) - chosen.flow);
    available.set(chosen.edge.dest, (available.get(chosen.edge.dest) || 0) + chosen.flow);
    
    // Record this as an inflow to dest (using prioritized index)
    const destInflows = inflows.get(chosen.edge.dest) || [];
    destInflows.push({ flowIx: prioritized.length, amount: chosen.flow });
    inflows.set(chosen.edge.dest, destInflows);
    
    prioritized.push(chosen);
    scheduled.add(chosenIx);
    lastChain = chosen.srcChain;
  }
  
  return { prioritized, order };
};
```

### Step 2: Update `rebalanceMinCostFlowSteps`

Replace the current scheduling loop with `computePartialOrder`:

```typescript
export const rebalanceMinCostFlowSteps = async (
  flows: SolvedEdgeFlow[],
  graph: RebalanceGraph,
  gasEstimator: GasEstimator,
): Promise<{ steps: MovementDesc[]; order: StepOrder }> => {
  const initialSupplies = new Map(
    typedEntries(graph.supplies).filter(([_, amount]) => amount > 0),
  );
  
  const { prioritized, order } = computePartialOrder(flows, initialSupplies);
  
  // ... rest of fee estimation logic using prioritized order ...
  
  return { steps, order };
};
```

### Step 3: Update `planRebalanceFlow` Return Type

```typescript
// Before
return harden({ graph, model, flows, steps, detail });

// After  
const { steps, order } = await rebalanceMinCostFlowSteps(flows, graph, gasEstimator);
return harden({ 
  graph, 
  model, 
  flows, 
  plan: { flow: steps, order }, 
  detail 
});
```

### Step 4: Update ymax-planner to Pass Full Plan

In [`services/ymax-planner/src/engine.ts`](./src/engine.ts):

```typescript
// Before
const { tx, id } = await planner.resolvePlan(
  portfolioId, flowId, steps, policyVersion, rebalanceCount
);

// After
const { tx, id } = await planner.resolvePlan(
  portfolioId, flowId, plan, policyVersion, rebalanceCount
);
```

## Implementation Steps

- [ ] **Add `computePartialOrder` function** to `plan-solve.ts` implementing the graph-based dependency algorithm
- [ ] **Update `rebalanceMinCostFlowSteps`** to return `{ steps, order }` instead of just `steps`
- [ ] **Update `planRebalanceFlow`** signature to return `FundsFlowPlan` with both `flow` and `order`
- [ ] **Update `plan-deposit.ts`** functions to return `FundsFlowPlan` instead of `MovementDesc[]`
- [ ] **Update `engine.ts`** to pass the full `FundsFlowPlan` to `resolvePlan()`
- [ ] **Add tests** for `computePartialOrder`:
  - Diamond patterns (fan-out from one node, fan-in to another)
  - Initial supply satisfying immediate outflows
  - Mixed initial supply + inflow scenarios
  - Independent chains (no dependencies)

## Examples

### Example 1: Simple Fan-Out

```
Initial: @Noble has 0 USDC
Steps:
  0: @Agoric → @Noble (100)
  1: @Noble → @Arbitrum (50)
  2: @Noble → @Optimism (50)

Order: [[1, [0]], [2, [0]]]
```
Steps 1 and 2 can run concurrently after step 0 completes.

### Example 2: Initial Supply Enables Parallelism

```
Initial: @Noble has 50 USDC
Steps:
  0: @Noble → <Cash> (50)      ← uses initial supply
  1: @Agoric → @Noble (100)    ← independent
  2: @Noble → @Arbitrum (100)  ← depends on step 1

Order: [[2, [1]]]
```
Steps 0 and 1 can run concurrently! Step 0 uses initial supply, step 1 is an independent inflow.

### Example 3: Multiple Inflows to Same Node

```
Initial: @Noble has 0 USDC
Steps:
  0: @Agoric → @Noble (50)
  1: @Optimism → @Noble (50)
  2: @Noble → @Arbitrum (100)  ← needs both inflows

Order: [[2, [0, 1]]]
```
Steps 0 and 1 run concurrently; step 2 waits for both.

## Open Questions

1. **Same-chain grouping** — Should steps on the same chain remain sequential, or allow parallelism when accessing different pools?
   - **Recommendation:** Allow parallelism; add explicit edges only if account serialization is required.

2. **Backward compatibility** — Always emit explicit `order`, or only when it differs from full order?
   - **Recommendation:** Always emit; makes behavior explicit and simplifies debugging.

3. **Transitive reduction** — Should we minimize the order by removing redundant edges?
   - **Recommendation:** Not initially; the scheduler handles transitive deps efficiently.

## Related Files

- [`packages/portfolio-contract/tools/plan-solve.ts`](../../packages/portfolio-contract/tools/plan-solve.ts) - solver and step generation
- [`packages/portfolio-api/src/types.ts`](../../packages/portfolio-api/src/types.ts) - `FundsFlowPlan` type
- [`packages/portfolio-contract/src/schedule-order.ts`](../../packages/portfolio-contract/src/schedule-order.ts) - partial order executor
- [`services/ymax-planner/src/engine.ts`](./src/engine.ts) - planner integration
- [`services/ymax-planner/src/plan-deposit.ts`](./src/plan-deposit.ts) - planning functions
