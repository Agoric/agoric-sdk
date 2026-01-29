# Rebalance Solver Overview

This document describes the current balance rebalancing solver used in **[plan-solve.ts](../portfolio-contract/tools/plan-solve.ts)** and the surrounding graph/diagnostics utilities.

## Domain & Graph Structure
We model a multi-chain, multi-place asset distribution problem as a directed flow network, starting with static information from [`PROD_NETWORK`](../portfolio-contract/tools/network/prod-network.ts) or some other NetworkSpec and dynamically adding information specific to the balances and targets of a single portfolio.

## Graph Nodes
Each node (vertex) is an [AssetPlaceRef](../portfolio-api/src/types.ts):
Node (vertex) types (all implement AssetPlaceRef):
- Chain hubs: `@${chainName}` (e.g. `@Arbitrum`, `@Avalanche`, `@Ethereum`, `@noble`, `@agoric`). A single hub per chain collects and redistributes flow for that chain.
- Per-instrument leaves: `${yieldProtocol}_${chainName}` identifiers (e.g. `Aave_Arbitrum`, `Beefy_re7_Avalanche`, `Compound_Ethereum`). Each is attached to exactly one hub (its chain).
- Places not under system control (`+${chainName}` for deposit sources, `-${chainName}` for withdrawal targets).
- Local Agoric contract seats and accounts (until [#12309](https://github.com/Agoric/agoric-sdk/issues/12309)): `<Deposit>` [deposit source seat], `<Cash>` [withdrawal target seat], and `+agoric` [originally a staging account used to accumulate new deposits before deployment, now unused]. Each is a leaf on the `@agoric` hub.

Instrument-to-chain affiliation is sourced from [`PoolPlaces`](../portfolio-contract/src/type-guards.ts) at build time. Hubs are not auto-added from PoolPlaces; only pools whose hub is already present in the NetworkSpec are auto-included. When a pool id isn't found, `chainOf(x)` falls back to parsing the suffix of `${yieldProtocol}_${chainName}`.

### Supplies
Each node has "supply" data indicating the amount by which its current balance exceeds its target balance (negative if it is a net receiver, positive if it is a net supplier).

Upstream data prep clears any balance at or below
[`ACCOUNT_DUST_EPSILON`](../portfolio-api/src/constants.js) (currently 100 uusdc = 0.0001 USDC)
via [`getNonDustBalances`](../../services/ymax-planner/src/plan-deposit.ts) so the solver
never sees dust-only balances. But there is no additional epsilon trimming inside the solver.

**Conservation rule**: total supplies must sum to zero.

## Edges
There are two classes of directed edges:
* Intra-chain (leaf <-> hub)
  - Always present for every non-hub leaf, bidirectional for instruments but unidirectional for deposit/withdrawal-dedicated places (`+${chainName}`, `-${chainName}`, `<Cash>`, `<Deposit>`).
  - Attributes: `variableFeeBps=1`, `flatFee=0`, `timeSec=1`, very large capacity.
* Inter-chain (hub -> hub)
  - CCTP to Noble [from EVM]: high latency (≈1080s), low/zero variable fee.
  - CCTP from Noble [to EVM]: low latency (≈20s).
  - FastUSDC (EVM -> Noble): latency ≈ 45s, 15 bps fee (0.15%).
  - IBC (Noble <-> Agoric): latency ≈ 10s, 200 bps fee (2%).

Edge attributes used by optimizer:
- `min` (lower bound on flow).
- `capacity` (upper bound on flow) – large default for intra-chain.
- `variableFeeBps` (cost per major unit [e.g., per USDC] in basis points).
- `flatFee` (flat activation cost).
- `timeSec` (expected latency).

Each edge is given an id `e0` through `e${n}` in insertion order (to stabilize solver behavior and tests), normalized to fixed-width with leading zeros for readability.

## Optimization Modes
Two primary objectives, with optional secondary tie-breaks:
- Cheapest: Minimize Σ (flatFee_e + variableFeeBps_e * through_e) over picked edges
- Fastest: Minimize Σ timeSec_e over picked edges

Secondary optimization is implemented as a composite objective Primary + ε × Secondary, where ε is chosen dynamically small enough to not perturb the primary optimum.
But it should also be possible to use a two-pass approach, re-solving against the secondary objective with the primary optimum is treated as a ±ε constraint.

## Constraints
For every edge e:
- through_e ≥ min_e (default 0)
- through_e ≤ capacity_e (default infinite)
- allow_e ≥ 0
- allow_e ≠ 0 if and only if through_id ≠ 0

Flow conservation for every node v:
```
Σ_out through_e - Σ_in through_e = netSupply(v)
```
A supply node exports exactly its excess; a sink node imports exactly its shortfall.

## Model Representation and Solver (javascript-lp-solver)
We build an LP/MIP object with:
- `variables`: one per flow variable `via_edgeId`, each holding coefficients into every node constraint and capacity constraint; plus binary usage vars `pick_edgeId` when required.
- `constraints`:
  - Node equality constraints: netOut_nodeId = netSupply(nodeId).
  - Throughput constraints: through_edgeId ≥ min_edgeId and through_edgeId ≤ capacity_edgeId.
  - Coupling constraints: ensure that each via_edgeId > 0 requires activation of pick_edgeId.
- `optimize`: `"weight"` (combining primary and secondary objectives).
- `opType`: `"min"`.
- `binaries` / `ints`: maps of binary / integer variables (both used).

### Solver Implementation
The model is solved using [javascript-lp-solver](https://www.npmjs.com/package/javascript-lp-solver), a pure JavaScript Mixed Integer Programming solver:
- Input: Standard LP/MIP model object (as described above)
- Output: Object containing:
  - `feasible`: boolean indicating solution feasibility
  - `result`: objective function value
  - Variable values (e.g., `via_e00`, `pick_e01`) as properties on the result object
- Flow extraction: Values from `via_edgeId` variables are rounded to nearest integer (jsLPSolver returns floating-point values)
- Filtering: Only flows > FLOW_EPS (1e-6) are included in the final solution

[`solveRebalance`](../portfolio-contract/tools/plan-solve.ts) performs two passes (dodging some IEEE 754 rounding issues):
1. Solve against an initial model using major-unit floating-point amount values to identify selected edges.
2. Solve against a clone of that model after pruning away unused edges and updating to minor-unit *integer* amount values to identify exact flow values.

Finally, it rounds flow values to the nearest integer as a normalization guarantee.

### Diagnostics and failure analysis
Error handling on infeasible solves is designed for clarity with minimal overhead when things work:
- Normal operation: on success, no extra diagnostics are computed.
- On solver infeasibility: if `graph.debug` is true, the solver emits a concise error plus diagnostic details to aid triage. Otherwise, it throws a terse error message.
- After any infeasible solve, a [`preflightValidateNetworkPlan`](../portfolio-contract/tools/graph-diagnose.ts) is run to check for unsupported position keys and missing inter-hub reachability required by the requested flows. If it finds a clearer root cause, it throws a targeted error explaining the issue.

Implementation notes:
- Diagnostics live in **[graph-diagnose.ts](../portfolio-contract/tools/graph-diagnose.ts)** (`diagnoseInfeasible`, `preflightValidateNetworkPlan`).
- Enable by setting `debug: true` in the NetworkSpec.
- Typical diagnostic output includes: supply balance summary, stranded sources/sinks, hub connectivity and inter-hub links, and a suggested set of missing edges.

### Path explanations and near-miss analysis
When a particular route is suspected to be viable but the solver reports infeasible, it helps to check a candidate path hop-by-hop and to summarize “almost works” pairs. Two helpers are available in **[graph-diagnose.ts](../portfolio-contract/tools/graph-diagnose.ts)**:

- `explainPath(graph, path: string[])`
  - Validates each hop in the given path array (e.g., `['<Deposit>', '@agoric', '@noble', 'USDNVault']`).
  - Returns `{ ok: true }` if every hop exists and has positive capacity; otherwise returns the first failing hop with a reason and suggestion:
    - `missing-node`: node isn’t in `graph.nodes`.
    - `missing-edge`: no `src -> dest` edge exists.
    - `wrong-direction`: reverse edge exists but forward is missing (suggest adding forward edge).
    - `capacity-zero`: edge exists but has no positive capacity.

- `diagnoseNearMisses(graph)`
  - Looks at all positive-supply sources to negative-supply sinks and classifies why each unreachable pair fails.
  - Categories include `no-directed-path` and `capacity-blocked`, with an optional hint (e.g., “consider adding inter-hub @agoric->@Avalanche”).
  - This runs automatically (and is appended to the thrown message) when `debug` is true and the solver returns infeasible.

Example usage (TypeScript):

```ts
import '@endo/init/debug.js';
import { Far } from '@endo/far';
import { AmountMath } from '@agoric/ertp';
import type { Brand, NatAmount } from '@agoric/ertp';
import { makeGraphFromDefinition } from '@aglocal/portfolio-contract/src/network/buildGraph.js';
import { PROD_NETWORK } from '@aglocal/portfolio-contract/src/network/prod-network.js';
import type { LinkSpec } from '@aglocal/portfolio-contract/src/network/network-spec.js';
import type { AssetPlaceRef } from '@aglocal/portfolio-contract/src/type-guards-steps.js';
import {
  explainPath,
  diagnoseNearMisses,
} from '@aglocal/portfolio-contract/src/graph-diagnose.js';

// Define a small scenario.
const USDC = Far('USDC Brand') as Brand<'nat'>;
const deposit = AmountMath.make(USDC, 50_000_000n);
const zero = AmountMath.make(USDC, 0n);
const current: Partial<Record<AssetPlaceRef, NatAmount>> = {
  '+agoric': deposit,
};
const target: Partial<Record<AssetPlaceRef, NatAmount>> = {
  '+agoric': zero,
  USDNVault: deposit,
};

// Build an incomplete graph.
const network = JSON.parse(JSON.stringify(PROD_NETWORK)) as typeof PROD_NETWORK;
const agoricToNoble = network.links.find(
  link => link.src === 'agoric' && link.dest === 'noble',
) as LinkSpec;
network.links = network.links.filter(link => link !== agoricToNoble);
const incomplete = makeGraphFromDefinition(network, current, target, USDC);

// 1) Summarize near-misses between sources and destinations.
const near = diagnoseNearMisses(incomplete);
console.log(near);
// => { missingPairs: [
//   { src: '+agoric', dest: 'USDNVault', category: 'no-directed-path', hint: undefined } ]

// 2) Explain a candidate path
const path = ['+agoric', '@agoric', '@noble', 'USDNVault'];
const pathReport = explainPath(incomplete, path);
console.log(pathReport);
// => { ok: false, failAtIndex: 1, src: '@agoric', dest: '@noble', reason: 'wrong-direction',
//   suggestion: 'add edge @agoric->@noble (reverse exists)' }

// 3) Apply the suggestion and retry.
network.links.push(agoricToNoble);
const complete = makeGraphFromDefinition(network, current, target, USDC);
console.log(diagnoseNearMisses(complete));
// => { missingPairs: [] }
console.log(explainPath(complete, path));
// => { ok: true }
```

Notes:
- These checks are purely topological/capacity-driven and independent of the optimize mode (cheapest/fastest).
- They’re inexpensive (BFS over a small graph) and run only when requested or when `debug` is enabled and the solve is infeasible.

## Execution Ordering (Deterministic Scheduling)
[`rebalanceMinCostFlowSteps`](../portfolio-contract/tools/plan-solve.ts) deterministically schedules the unordered flows into a sequence of [MovementDesc](../portfolio-api/src/types.ts) steps with corresponding dependency information defining a partial order (i.e., supporting parallel execution).

1. **Initialization**: Any node with positive netSupply provides initial available liquidity.

2. **Candidate selection loop**:
   - At each iteration, consider unscheduled positive-flow edges whose source node currently has sufficient available units.
   - If multiple candidates exist, prefer edges whose originating chain (derived from the source node) matches the chain of the previously scheduled edge (chain affinity grouping heuristic). This groups sequential operations per chain, especially helpful for EVM-origin flows.
   - If still multiple, choose the edge with smallest numeric edge id (stable deterministic tiebreaker).
   - If no candidates exist, throw an error describing the deadlock with diagnostics showing all remaining flows and their shortages.

3. **Partial ordering**: Identify which inflows to consume (partially or completely), marking as a prerequisite any inflow contributing to the selected edge and updating the unclaimed amount of each relevant inflow.

4. **Availability update**: After scheduling an edge (`src`->`dest` with flow amount `x`), decrease available supply at `src` by `x` and increase available supply at `dest` by `x`.

Resulting guarantees:
- No step requires funds that have not yet been made available by a prior step.
- Order is fully deterministic given the solved flows.
- Movements are naturally grouped by chain where possible, improving readability for execution planning.
- Any true deadlock (circular dependency or solver bug) is detected and reported with full diagnostics.

### Post-Solve Validation
When `graph.debug` is enabled, an optional validation pass runs after scheduling to verify solution consistency:
- **Supply Conservation**: Verifies total supply sums to 0 (all sources and sinks balance)
- **Flow Execution**: Simulates executing all flows in scheduled order to ensure:
  - Each flow has sufficient balance at its source when executed
  - No scheduling deadlocks occur
- **Hub Balance**: Warns if hub chains don't end at ~0 balance (indicating routing issues)

Validation complexity: O(N+F) where N = number of nodes, F = number of flows.

The validation runs after scheduling but before returning the final steps, catching any inconsistencies that might arise from floating-point rounding or solver quirks.

## Future work
This last section is the living plan. As details are settled (schemas, invariants, design choices), they should be promoted into the relevant sections above, keeping this section focused on the remaining work and sequencing.

Further items for solver
- support additions of dynamic constraints (e.g., when route price changes)
- add fee information and time to moves
- rename "timeSec" to "time"?

Further non-planner items
- add withdraw offer handling
  - is it just "adjust"?
- support operations without a supplied plan (where planner provides)
- maintain a shared graph in memory that gets updated on new graph
- support multiple assets
- sanity check the step list

Renames
- NetworkSpec → NetworkDesc, and probably likewise for ChainSpec/PoolSpec/LocalPlaceSpec/LinkSpec (since we generally use "spec" to describe a string specifier)
- `src`/`dest` if acceptable alphabetical synonyms can be found (e.g., `source`/`target` or `fromPlace`/`toPlace`)

Later
- add the method to the move operations (CCTP vs. Fast USDC)
- re-plan after some steps have already happened?
  - provide the expected balances after each step, then plan form there
- split transactions under limits

Future things to try:
- enable disabling/enabling some links (e.g., if they go down) and replanning 
- add liquidity pool
- optimize withdraw for "fastest money to destination"
  - accelerate withdraw with a liquidity pool
- add operation (like `supply`) so that we can have actual gwei estimates associated with them in the graph
- support multiple currencies explicitly

## Appendix A: Solver History and HiGHS Experience

### Initial Implementation with HiGHS
The initial solver implementation used **HiGHS**, a state-of-the-art open-source optimization solver for large-scale linear programming (LP), mixed-integer programming (MIP), and quadratic programming (QP) problems, via npm package [highs](https://www.npmjs.com/package/highs) exposing a JavaScript API for its WebAssembly compilation of C++ source code.

**Advantages of HiGHS:**
- Industrial-strength performance and accuracy
- Extensive configuration options for tolerances and presolve
- Not constrained by JavaScript performance
- Well-suited for large, complex optimization problems

**Implementation approach:**
- Models were translated to CPLEX LP format using [`toCplexLpText`](https://github.com/Agoric/agoric-sdk/blob/6f98cc5ddb6bdf297840d84ef05d7d0394f90a3e/packages/portfolio-contract/tools/plan-solve.ts#L287)
- Flow amounts were extracted from the `Columns[varName].Primal` field

### Precision Issues Encountered
During testing, we discovered that **HiGHS returns floating-point flow values with insufficient precision** for our use case:

**Problem:** 
- Flow values like `29999999.999999996` instead of `30000000`
- These values failed the `Number.isSafeInteger()` check before BigInt conversion
- The fractional parts (e.g., `.999999996`) were artifacts of floating-point arithmetic, not meaningful fractions

**Root cause:**
- HiGHS optimizes in floating-point arithmetic
- Even with tight feasibility tolerances (1e-8), the solver may return values with small floating-point errors
- Our domain requires exact integer amounts (USDC has 6 decimals, so values are in micro-USDC)

**Impact:**
- Tests would fail with errors like: `"flow 29999999.999999996 for edge {...} is not a safe integer"`
- Rounding would be needed anyway, making the high-precision solver less valuable

### Migration to javascript-lp-solver
Given the precision issues and the need for integer rounding regardless of solver choice, we migrated to **javascript-lp-solver**:

**Advantages:**
- Pure JavaScript implementation (no WebAssembly compilation required)
- Simpler integration and debugging
- Returns results in the same format, just with different property names
- Adequate performance for our problem sizes (typically <100 variables)
- Easier to understand and modify if needed

**Migration changes:**
- Removed CPLEX LP format conversion (no longer needed)
- Changed result extraction from `matrixResult.Columns[varName].Primal` to `solution[varName]`
- Added explicit rounding: `Math.round(rawFlow)` to convert float to integer
- Adjusted feasibility checking (jsLPSolver uses `feasible` boolean property)

**Outcome:**
- 28 out of 29 rebalance tests pass
- The one failing test (`solver differentiates cheapest vs. fastest`) exercises variation that is not currently needed, and was ultimately fixed by the two-pass approach described in [Solver Implementation](#solver-implementation)
- Solutions are deterministic and correct
- Simpler codebase without external binary dependencies

### Lessons Learned
1. **Integer domains require explicit rounding** regardless of solver precision
2. **Solver precision doesn't eliminate the need for tolerance handling** in scheduling
3. **Pure JavaScript solvers are often sufficient** for medium-scale optimization problems
4. **Simpler tools can be more maintainable** than industrial-strength alternatives when performance isn't the bottleneck
