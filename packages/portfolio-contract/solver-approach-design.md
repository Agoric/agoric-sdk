# Rebalance Solver Overview

This document describes the current balance rebalancing solver used in `plan-solve.ts` and the surrounding graph/diagnostics utilities.

## 1. Domain & Graph Structure
We model a multi-chain, multi-place asset distribution problem as a directed flow network.

Node (vertex) types (all implement `AssetPlaceRef`):
- Chain hubs: `@ChainName` (e.g. `@Arbitrum`, `@Avalanche`, `@Ethereum`, `@noble`, `@agoric`). A single hub per chain collects and redistributes flow for that chain.
- Protocol / pool leaves: `Protocol_Chain` identifiers (e.g. `Aave_Arbitrum`, `Beefy_re7_Avalanche`, `Compound_Ethereum`). Each is attached to exactly one hub (its chain).
- Local Agoric seats: `'<Cash>'`, `'<Deposit>'`, and `'+agoric'` – all leaves on the `@agoric` hub.

Notes:
- Pool-to-chain affiliation is sourced from PoolPlaces (typed map) at build time. Hubs are not auto-added from PoolPlaces; only pools whose hub is already present in the NetworkSpec are auto-included. When a pool id isn't found, `chainOf(x)` falls back to parsing the suffix of `Protocol_Chain`.
- `+agoric` is a staging account on `@agoric`, used to accumulate new deposits before distribution; for deposit planning it must end at 0 in the final targets.

Supply (net position) per node:
```
netSupply(node) = current[node] - target[node]
> 0 : surplus (must send out)
< 0 : deficit (must receive)
= 0 : balanced
```
Sum of all supplies must be zero for feasibility.

## 2. Edges
Two classes of directed edges:
1. Intra-chain (leaf <-> hub)
   - Always present for every non-hub leaf.
   - Attributes: `variableFee=1`, `fixedFee=0`, `timeFixed=1`, very large capacity.
2. Inter-chain (hub -> hub) links provided by `NetworkSpec.links`:
  - CCTP slow (EVM -> Noble): high latency (≈1080s), low/zero variable fee.
  - CCTP return (Noble -> EVM): low latency (≈20s).
  - FastUSDC (unidirectional EVM -> Noble): `variableFeeBps≈15` (≈0.15%), `timeSec≈45`.
  - Noble <-> Agoric IBC: `variableFeeBps≈200` (≈2.00%), `timeSec≈10`.
Each link is directional; reverse direction is added explicitly where needed.

Overrides:
- Explicit inter-hub links from the `NetworkSpec` supersede any auto-added base edge with the same `src -> dest`. This lets the definition supply real pricing/latency.

Edge attributes used by optimizer:
- `capacity` (numeric upper bound on flow) – large default for intra-chain.
- `variableFee` (linear cost coefficient per unit flow) – used in Cheapest mode. For inter-hub links this comes from `LinkSpec.variableFeeBps`.
- `fixedFee` (flat activation cost) – triggers binary var only if >0 in Cheapest mode (from `LinkSpec.flatFee` when provided).
- `timeFixed` (activation latency metric) – triggers binary var only if >0 in Fastest mode (from `LinkSpec.timeSec`).

## 3. Optimization Modes
Two primary objectives, with optional secondary tie-breaks:
- Cheapest (primary): Minimize Σ (fixedFee_e * y_e + variableFee_e * f_e)
- Fastest (primary): Minimize Σ (timeFixed_e * y_e)

Secondary (tie-break) options:
1) Two-pass lexicographic (not currently enabled):
   - Solve primary, fix the optimum within ±ε as a constraint, then re-solve minimizing the secondary.
2) Composite objective (implemented):
   - Minimize Primary + ε · Secondary, where ε is chosen dynamically small enough not to perturb the primary optimum.

Current behavior:
- In Cheapest mode, secondary prefers lower Σ(timeFixed_e · y_e).
- In Fastest mode, secondary prefers lower Σ(fixedFee_e · y_e + variableFee_e · f_e).

In both modes:
- Continuous flow variables: `f_e ≥ 0` for every edge.
- Linking constraint for edges with a binary: `f_e ≤ capacity_e * y_e`.

## 4. Flow Conservation
For every node v:
```
Σ_out f_e - Σ_in f_e = netSupply(v)
```
A surplus node exports its excess; a deficit node imports exactly its shortfall.

## 5. Model Representation (javascript-lp-solver)
We build an LP/MIP object with:
- `variables`: one per flow variable `f_edgeId`, each holding coefficients into every node constraint and capacity constraint; plus binary usage vars `y_edgeId` when required.
- `constraints`:
  - Node equality constraints (one per node with any incident edges).
  - Capacity constraints `f_e ≤ capacity_e`.
  - Link constraints when binary present: `f_e - capacity_e * y_e ≤ 0`.
- `optimize`: synthetic key (e.g. `obj` internally then projected to `cost`).
- `opType`: `min`.
- `binaries` / `ints`: maps of binary / integer variables (only binaries used for now).
No scaling: amounts, fees, and times are used directly (inputs are within safe numeric ranges: amounts up to millions, fees up to ~0.2 variable or a few dollars fixed, latencies minutes/hours).

## 6. Solution Decoding
After solving we extract active edges where `flow > ε` (ε=1e-6). These positive-flow edges are then scheduled using the deterministic algorithm in Section 9 to produce an ordered list of executable steps. Each step is emitted as `MovementDesc { src, dest, amount }` with amount reconstructed as bigint (rounded from numeric flow).

## 7. Example (Conceptual)
If Aave_Arbitrum has surplus 30 and Beefy_re7_Avalanche has deficit 30, optimal Cheapest path may produce steps:
```
Aave_Arbitrum -> @Arbitrum -> @noble -> @Avalanche -> Beefy_re7_Avalanche
```
Reflected as four MovementDescs (one per edge used) with amount 30.

## 8. Extensibility Notes
- Additional cost dimensions (e.g. risk scores) can be integrated by augmenting objective coefficients.
- Scaling can be reintroduced if future magnitudes exceed safe integer precision.
- Multi-objective (lexicographic) could wrap two solves (first fastest then cheapest among fastest solutions) if required.

## 9. Execution Ordering (Deterministic Scheduling)
The emitted MovementDescs follow a dependency-based schedule ensuring every step is feasible with currently available funds:
1. Initialization: Any node with positive netSupply provides initial available liquidity.
2. Candidate selection loop:
   - At each iteration, consider unscheduled positive-flow edges whose source node currently has sufficient available units (>= flow).
   - If multiple candidates exist, prefer edges whose originating chain (derived from the source node) matches the chain of the previously scheduled edge (chain grouping heuristic). This groups sequential operations per chain, especially helpful for EVM-origin flows.
   - If still multiple, choose the edge with smallest numeric edge id (stable deterministic tiebreaker).
3. Availability update: After scheduling an edge (src->dest, flow f), decrease availability at src by f and increase availability at dest by f.
4. Deadlock fallback: If no edge is currently fundable (e.g. all remaining edges originate at intermediate hubs with zero temporary balance), schedule remaining edges in ascending edge id order, simulating availability updates to break the cycle.

Resulting guarantees:
- No step requires funds that have not yet been made available by a prior step (except in the explicit deadlock fallback case, which should only occur for purely cyclic zero-supply intermediate structures).
- Order is fully deterministic given the solved flows.
- Movements are naturally grouped by chain where possible, improving readability for execution planning.

---

## 10. NetworkSpec Schema & Validation

Schema Summary (TypeScript interfaces):
```
// Chains (hubs)
interface ChainSpec {
  name: SupportedChain;           // e.g., 'agoric' | 'noble' | 'Arbitrum'
  chainId?: string;               // cosmos chain-id or network id
  evmChainId?: number;            // EVM numeric chain id if applicable
  bech32Prefix?: string;          // for Cosmos chains
  axelarKey?: AxelarChain;        // Axelar registry key if differs from name
  feeDenom?: string;              // e.g., 'ubld', 'uusdc'
  gasDenom?: string;              // if distinct from feeDenom
  control: 'ibc' | 'axelar' | 'local'; // how Agoric reaches this chain
}

// Pools (leaves)
interface PoolSpec {
  pool: PoolKey;                  // 'Aave_Arbitrum', 'USDNVault', ...
  chain: SupportedChain;          // host chain of the pool
  protocol: YieldProtocol;        // protocol identifier
}

// Local places: seats (<Deposit>, <Cash>) and local accounts (+agoric)
interface LocalPlaceSpec {
  id: AssetPlaceRef;              // '<Deposit>' | '<Cash>' | '+agoric' | PoolKey
  chain: SupportedChain;          // typically 'agoric'
  variableFeeBps?: number;        // optional local edge variable fee (bps)
  flatFee?: NatValue;             // optional flat fee in local units
  timeSec?: number;               // optional local latency
  capacity?: NatValue;            // optional local capacity
  enabled?: boolean;
}

// Directed inter-hub link
interface LinkSpec {
  src: SupportedChain;            // source chain
  dest: SupportedChain;           // destination chain
  transfer: 'ibc' | 'fastusdc' | 'cctpReturn' | 'cctpSlow';
  variableFeeBps: number;         // variable fee in basis points of amount
  timeSec: number;                // latency in seconds
  flatFee?: NatValue;             // optional fixed fee (minor units)
  capacity?: NatValue;            // optional throughput cap
  min?: NatValue;                 // optional minimum transfer size
  priority?: number;              // optional tie-break hint
  enabled?: boolean;              // admin toggle
}

interface NetworkSpec {
  debug?: boolean;                // enable extra diagnostics/debug
  environment?: 'dev' | 'test' | 'prod';
  chains: ChainSpec[];
  pools: PoolSpec[];
  localPlaces?: LocalPlaceSpec[];
  links: LinkSpec[];              // inter-hub links only
}
```

Builder & translation to solver:
- Hubs come from `spec.chains`. Hubs are not auto-added from PoolPlaces.
- Leaves include `spec.pools`, `spec.localPlaces.id`, known PoolPlaces whose hub is present, and any nodes mentioned in `current`/`target` (validated to avoid implicitly adding hubs).
- Intra-chain leaf<->hub edges are auto-added with large capacity and base costs (`variableFee=1`, `timeFixed=1`).
- Agoric-local overrides: `+agoric`, `<Cash>`, and `<Deposit>` have zero-fee/zero-time edges to/from `@agoric` and between each other.
- Inter-hub links from `spec.links` are added hub->hub. If an auto-added edge exists with the same `src -> dest`, the explicit link replaces it (override precedence). Mapping to solver fields: `variableFee = variableFeeBps`, `timeFixed = timeSec`, `fixedFee = flatFee`, `via = transfer`.

Determinism:
- After applying all edges, edge IDs are normalized to `e0..eN` in insertion order to stabilize solver behavior and tests.

Validation:
- Minimal validation ensures link `src`/`dest` chains are declared in `spec.chains`.
- Dynamic nodes (from `current`/`target`) must not introduce undeclared hubs; known pools require their host hub to be present.
- Additional post-failure checks are performed by `preflightValidateNetworkPlan` (see below).

### 10.1 PoolPlaces integration and chain inference
- PoolPlaces provides the canonical mapping from pool ids to chain hubs used by the builder. Hubs are not implicitly added from this mapping.
- `chainOf(x)` resolves a node's chain via PoolPlaces; if not found and `x` matches `Protocol_Chain`, it falls back to using the `_Chain` suffix.

### 10.2 Diagnostics and failure analysis
Error handling on infeasible solves is designed for clarity with minimal overhead when things work:
- Normal operation: on success, no extra diagnostics are computed.
- On solver infeasibility: if `graph.debug` is true (from `NetworkSpec.debug`), the solver emits a concise error plus diagnostic details to aid triage. Otherwise, it throws a terse error message.
- After any infeasible solve, a post-failure preflight validator runs: it checks for unsupported position keys and missing inter-hub reachability required by the requested flows. If it finds a clearer root cause, it throws a targeted error explaining the issue.

Implementation notes:
- Diagnostics live in `graph-diagnose.ts` (`diagnoseInfeasible`, `preflightValidateNetworkPlan`).
- Enable by setting `debug: true` in your `NetworkSpec`.
- Typical diagnostic output includes: supply balance summary, stranded sources/sinks, hub connectivity and inter-hub links, and a suggested set of missing edges.

---

### 10.3 Path explanations and near-miss analysis

When a particular route is suspected to be viable but the solver reports infeasible, it helps to check a candidate path hop-by-hop and to summarize “almost works” pairs. Two helpers are available in `graph-diagnose.ts`:

- `explainPath(graph, path: string[])`
  - Validates each hop in the given path array (e.g., `['+agoric', '@agoric', '@noble', 'USDNVault']`).
  - Returns `{ ok: true }` if every hop exists and has positive capacity; otherwise returns the first failing hop with a reason and suggestion:
    - `missing-node`: node isn’t in `graph.nodes`.
    - `missing-edge`: no `src -> dest` edge exists.
    - `wrong-direction`: reverse edge exists but forward is missing (suggest adding forward edge).
    - `capacity-zero`: edge exists but has no positive capacity.

- `diagnoseNearMisses(graph)`
  - Looks at all positive-supply sources to negative-supply sinks and classifies why each unreachable pair fails.
  - Categories include `no-directed-path` and `capacity-blocked`, with an optional hint (e.g., “consider adding inter-hub @agoric->@Avalanche”).
  - This runs automatically (and is appended to the thrown message) when `NetworkDefinition.debug` is true and the solver returns infeasible.

Example usage (TypeScript):

```ts
import '@endo/init/debug.js';
import { Far } from '@endo/far';
import { AmountMath } from '@agoric/ertp';
import type { Brand, NatAmount } from '@agoric/ertp';
import { makeGraphFromDefinition } from '@aglocal/portfolio-contract/src/network/buildGraph.js';
import { PROD_NETWORK } from '@aglocal/portfolio-contract/src/network/network.prod.js';
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


## 11. Todo
Critical
- Typed Node/Edge aliases to enforce pool↔hub pairing at compile time.
- add USDN and USDNVault to PROD_NETWORK; override the fee
- use teh fee to compute 


Further items for solver
- support additions of dynamic constraints (e.g., when route price changes)
- add fee information and time to moves
- add minimimums to links
- add capacity limits to links
  - test them
- rename "timeSec" to "time"?
- add details.evmGas

Further non-planner items
- add withdraw offer handling
  - is it just "adjust"?
- support operations without a supplied plan (where planner provides)
- maintain a shared graph in memory that gets updated on new graph
- support multiple assets
- sanity check the step list

Renames
- cctpSlow → cctpToNoble and cctpReturn → cctpFromNoble
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
- optimize withdraw for "fastest money to <Cash> seat.
  - accelerate withdraw with a liquidity pool
- add operation (like `supply`) so that we can have actual gwei estimates associated with them in the graph
- support multiple currencies explicitly

## 12. Current Plan
This last section is the living plan. As details are settled (schemas, invariants, design choices), they should be promoted into the relevant sections above, keeping this section focused on the remaining work and sequencing.

Status as of 2025-09-14:
- Phase 1: Complete — types, builder, and prod/test configs added; `planRebalanceFlow` accepts a network.
- Phase 2: Complete — unit tests migrated to use the test network; legacy LINKS removed in this package.
- Phase 3: Complete — deposit routing is being refactored to derive paths via the generic graph; downstream services updated incrementally. Post-failure preflight validation and solver diagnostics are integrated and controlled by `graph.debug`. Composite objective for secondary tie-breaks implemented.
- Phase 4: Pending — finalize docs and remove remaining legacy references elsewhere.

Phases:
- Phase 3 next steps:
  - Deprecate / remove `planTransfer` & `planTransferPath` after callers migrate.
- Phase 4:
  - Documentation updates: ensure this document reflects finalized schema and behavior (this doc now includes PoolPlaces integration, edge override precedence, and diagnostics flow).
  - Add/extend validation and tooling as needed; remove remaining legacy references in downstream packages.
