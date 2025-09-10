# Rebalance Solver Overview

This document describes the current balance rebalancing solver used in `plan-solve.ts`.

## 1. Domain & Graph Structure
We model a multi-chain, multi-place asset distribution problem as a directed flow network.

Node (vertex) types (all implement `AssetPlaceRef`):
- Chain hubs: `@ChainName` (e.g. `@Arbitrum`, `@Avalanche`, `@Ethereum`, `@noble`, `@agoric`). A single hub per chain collects and redistributes flow for that chain.
- Protocol / pool leaves: `Protocol_Chain` identifiers (e.g. `Aave_Arbitrum`, `Beefy_re7_Avalanche`, `Compound_Ethereum`). Each is attached to exactly one hub (its chain).
- Local Agoric seats: `'<Cash>'`, `'<Deposit>'`, and `'+agoric'` – all leaves on the `@agoric` hub.

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
2. Inter-chain (hub -> hub) links added via NetworkDefinition:
   - CCTP slow (EVM -> Noble): high latency (1080s), low / zero variable fee.
   - CCTP return (Noble -> EVM): low latency (20s).
   - FastUSDC (unidirectional EVM -> Noble): `variableFee=0.0015`, `timeFixed=45s`.
   - Noble <-> Agoric IBC: `variableFee=2`, `timeFixed=10s`.
Each link is directional; reverse direction is added explicitly where needed.

Edge attributes used by optimizer:
- `capacity` (numeric upper bound on flow) – large default for intra-chain.
- `variableFee` (linear cost coefficient per unit flow) – used in Cheapest mode.
- `fixedFee` (flat activation cost) – triggers binary var only if >0 in Cheapest mode.
- `timeFixed` (activation latency metric) – triggers binary var only if >0 in Fastest mode.

## 3. Optimization Modes
Two mutually exclusive objectives:
- Cheapest: Minimize Σ (fixedFee_e * y_e + variableFee_e * f_e)
  - `y_e` (binary) only for edges with `fixedFee > 0`.
- Fastest: Minimize Σ (timeFixed_e * y_e)
  - `y_e` (binary) for any edge with `timeFixed > 0` so that using an edge counts its latency once.

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
After solving we extract active edges where `flow > ε` (ε=1e-6). Steps are ordered deterministically:
1. Leaf -> Hub
2. Hub -> Hub
3. Hub -> Leaf
Within a category, ascending edge id (creation order) for stable test assertions.
Each step is emitted as `MovementDesc { src, dest, amount }` with amount reconstructed as bigint (rounded from numeric flow).

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

## 10. Network Definition Schema & Validation

Schema Summary:
```
interface NetworkEdge {
  src: string;          // @Hub or leaf id
  dest: string;         // @Hub or leaf id
  variableFee: number;  // linear per-unit fee (cheapest mode)
  timeSec?: number;     // latency in seconds (fastest mode)
  fixedFee?: number;    // optional activation fee (cheapest mode)
  capacity?: number;    // optional capacity (default large)
  tags?: string[];      // metadata (e.g. ['cctp','fast'])
}
interface NetworkDefinition {
  nodes: string[];      // all node ids (hubs + leaves)
  edges: NetworkEdge[]; // directed edges
}
```

Edge translation to solver:
- `timeFixed = timeSec`
- default `capacity = Number.MAX_SAFE_INTEGER/4` if unspecified
- intra-chain leaf<->hub edges auto-added (variableFee=1, timeFixed=1) only if missing.

Determinism:
- Edge ids assigned in insertion order `e0..eN`: first intra-chain additions (stable set iteration) then user-specified edges in provided order.

Validation:
- A simple validator ensures well-formed nodes/edges and guards against duplicate edges unless explicitly intended (e.g., tagged variants).

---

## 11. Todo
Further items for solver
- support additions of dynamic constraints (e.g., when route price changes)
- add fee information and time to moves
- handle "no feasible plan"
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

Status as of 2025-09-10:
- Phase 1: Complete — types, builder, and prod/test configs added; `planRebalanceFlow` accepts a network.
- Phase 2: Complete — unit tests migrated to use the test network; legacy LINKS removed in this package.
- Phase 3: In progress — deposit routing is being refactored to derive paths via the generic graph; downstream services updated incrementally.
- Phase 4: Pending — finalize docs and remove remaining legacy references elsewhere.

Phases:
- Phase 3 next steps:
  - Refactor deposit and portfolio open flows to use solver outputs end-to-end (remove hardcoded paths).
  - Deprecate / remove `planTransfer` & `planTransferPath` after callers migrate.
- Phase 4:
  - Documentation updates: ensure this document reflects finalized schema and behavior.
  - Add/extend validation and tooling as needed; remove remaining legacy references in downstream packages.
