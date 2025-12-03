// Lightweight diagnostics for infeasible solver models.
// Extracted to a separate module to keep solver core lean and allow reuse.

import { Fail, q } from '@endo/errors';

import type { NatAmount } from '@agoric/ertp/src/types.js';
import { provideLazyMap, typedEntries } from '@agoric/internal/src/js-utils.js';
import { tryNow } from '@agoric/internal/src/ses-utils.js';
import { isInterChainAccountRef } from '@agoric/portfolio-api/src/type-guards.js';
import type {
  AssetPlaceRef,
  InterChainAccountRef,
} from '@agoric/portfolio-api';
import { chainOf } from './network/buildGraph.ts';

import {
  PoolPlaces,
  type PoolKey,
  type PoolPlaceInfo,
} from '../src/type-guards.js';
import type { FlowGraph } from './network/buildGraph.js';
import type { NetworkSpec } from './network/network-spec.js';
import type { LpModel } from './plan-solve.js';

const bfs = <T>(start: T, adj: Map<T, T[]>): Set<T> => {
  const queue = [start];
  const seen = new Set(queue);
  while (queue.length) {
    const cur = queue.shift()!;
    const arr = adj.get(cur);
    for (const node of arr || []) {
      if (seen.has(node)) continue;
      seen.add(node);
      queue.push(node);
    }
  }
  return seen;
};

/**
 * Build human-readable diagnostics for infeasible models.
 * Heuristics only: checks supply balance and reachability of sinks from sources.
 *
 * Example output (when graph.debug is true):
 *   No feasible solution: nodes=7 edges=12 | supply: sum=0 pos=1500 neg=1500 (pos should equal neg; sum should be 0) | sources=2 sinks=2 | sources with no path to any sink (1): Aave_Arbitrum(800) | hubs present: @agoric, @noble, @Arbitrum | inter-hub edges: @agoric->@noble, @noble->@Arbitrum
 *
 * How to enable:
 *   - Set `debug: true` on the NetworkSpec used to build the graph.
 */
export const diagnoseInfeasible = (
  graph: FlowGraph,
  _model: LpModel,
): string => {
  const nodes = [...graph.nodes];
  const supplies = graph.supplies;
  const edges = graph.edges;

  let sumSupply = 0;
  let posTotal = 0;
  let negTotal = 0;
  const sources: string[] = [];
  const sinksSet = new Set<string>();
  for (const n of nodes) {
    const s = supplies[n] || 0;
    sumSupply += s;
    if (s > 0) {
      sources.push(n);
      posTotal += s;
    } else if (s < 0) {
      sinksSet.add(n);
      negTotal += -s;
    }
  }

  // Adjacency for forward reachability
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    const srcAdj = provideLazyMap(adj, e.src, () => []);
    srcAdj.push(e.dest);
  }

  const stranded = [] as { node: string; supply: number }[];
  for (const s of sources) {
    const reach = bfs(s, adj);
    const canReachSink = [...reach].some(n => sinksSet.has(n));
    if (!canReachSink) stranded.push({ node: s, supply: supplies[s] });
  }

  const hubSet = new Set(nodes.filter(n => n.startsWith('@')));
  const hubEdges = edges
    .filter(e => e.src.startsWith('@') && e.dest.startsWith('@'))
    .map(e => `${e.src}->${e.dest}`);

  const lines: string[] = [];
  lines.push(`nodes=${nodes.length} edges=${edges.length}`);
  lines.push(
    `supply: pos ${posTotal} must equal neg ${negTotal} (diff ${sumSupply})`,
  );
  if (sumSupply !== 0) lines.push('WARN: total supply does not balance to 0');
  lines.push(`sources=${sources.length} sinks=${sinksSet.size}`);
  if (stranded.length) {
    const sample = stranded
      .slice(0, 6)
      .map(s => `${s.node}(${s.supply})`)
      .join(', ');
    lines.push(
      `sources with no path to any sink (${stranded.length}): ${sample}`,
    );
  }
  lines.push(`hubs present: ${[...hubSet].sort().join(', ')}`);
  lines.push(
    `inter-hub edges: ${hubEdges.length ? hubEdges.join(', ') : '(none)'}`,
  );
  return lines.join(' | ');
};

/**
 * Preflight validation: ensure that all referenced positions exist and that
 * the network provides inter-hub connectivity needed by the planned moves.
 * Throws Fail with a clear message on error.
 */
export const preflightValidateNetworkPlan = (
  network: NetworkSpec,
  current: Partial<Record<AssetPlaceRef, NatAmount>>,
  target: Partial<Record<AssetPlaceRef, NatAmount>>,
) => {
  const placeRefs = new Set(
    Object.keys({ ...current, ...target }) as AssetPlaceRef[],
  );

  // Build hub-only adjacency from NetworkSpec.links
  const hubAdj = new Map<InterChainAccountRef, InterChainAccountRef[]>();
  for (const link of network.links) {
    const { src, dest } = link;
    if (!isInterChainAccountRef(src) || !isInterChainAccountRef(dest)) continue;
    const srcAdj = provideLazyMap(hubAdj, src, () => []);
    srcAdj.push(dest);
  }
  const reachFromAgoric = bfs('@agoric', hubAdj);

  const needsToAgoric = new Map<InterChainAccountRef, AssetPlaceRef[]>();
  const needsFromAgoric = new Map<InterChainAccountRef, AssetPlaceRef[]>();
  const declared = new Set<AssetPlaceRef>([
    ...network.chains.map(c => `@${c.name}` as InterChainAccountRef),
    ...network.pools.map(p => p.pool),
    ...(network.localPlaces ?? []).map(lp => lp.id),
    ...(['<Deposit>', '<Cash>', '+agoric'] as AssetPlaceRef[]),
  ]);

  for (const k of placeRefs) {
    if (k === '+agoric') continue;
    const cur = current[k]?.value ?? 0n;
    const tgt = target[k]?.value ?? 0n;
    if (cur === tgt) continue;

    const placeInfo = PoolPlaces[k as PoolKey];
    placeInfo || declared.has(k) || Fail`Unsupported position key: ${q(k)}`;
    const chain = tryNow(
      () => chainOf(k),
      () => undefined,
    );

    // If chain is unknown, skip further checks so the issue resurfaces with
    // more context.
    if (!chain) continue;

    const hub = `@${chain}` as InterChainAccountRef;
    if (cur > tgt) {
      const hubSources = provideLazyMap(needsToAgoric, hub, () => []);
      hubSources.push(k);
    } else if (tgt > cur) {
      const hubSinks = provideLazyMap(needsFromAgoric, hub, () => []);
      hubSinks.push(k);
      if (!reachFromAgoric.has(hub)) {
        const list = needsFromAgoric.get(hub) || [];
        // Construct a string directly to avoid undesirable quoting of `Fail`.
        const msg = `No inter-hub path @agoric->${hub}; positions: ${q(list)}`;
        throw Error(msg);
      }
    }
  }

  for (const [hub, posKeys] of needsToAgoric.entries() as Iterable<
    [InterChainAccountRef, AssetPlaceRef[]]
  >) {
    const reach = bfs(hub, hubAdj);
    if (!reach.has('@agoric')) {
      // Construct a string directly to avoid undesirable quoting of `Fail`.
      const msg = `No inter-hub path ${hub}->@agoric; positions: ${q(posKeys.join(', '))}`;
      throw Error(msg);
    }
  }
};

/**
 * Explain why a given path would fail on this graph.
 *
 * Input format:
 * - `path` is an ordered list of node ids: `[n0, n1, ..., nk]`.
 * - Each hop is interpreted as the directed edge `n[i] -> n[i+1]`.
 * - Node id conventions used by the rebalance graph:
 *   - Hubs: `@{chain}` (e.g., `@agoric`, `@noble`, `@Arbitrum`).
 *   - Agoric-local seats: `<Deposit>`, `<Cash>`, `+agoric` (these live on `@agoric`).
 *   - Pools/positions: `{Pool}_{Chain}` (e.g., `Aave_Arbitrum`, `Compound_Arbitrum`).
 *   - Local places and dynamics use their declared `id` verbatim.
 *
 * Return format:
 * - `{ ok: true }` if every hop exists in the graph and has positive capacity.
 * - `{ ok: false, failAtIndex, src, dest, reason, suggestion? }` otherwise, where:
 *   - `failAtIndex` is the index `i` of the failing hop `path[i] -> path[i+1]`.
 *   - `reason` is one of: `missing-node`, `missing-edge`, `wrong-direction`, `capacity-zero`.
 *   - `suggestion` is a human hint such as `add node X`, `add edge A->B`, or `increase capacity on A->B`.
 *
 * Tips:
 * - Use `canonicalPathBetween(graph, src, dest)` to build a typical hub/leaf skeleton path
 *   before validating it with `explainPath`.
 */
export const explainPath = (
  graph: FlowGraph,
  path: string[],
):
  | { ok: true }
  | {
      ok: false;
      failAtIndex: number; // index of the src in path where hop src->dest fails
      src: string;
      dest: string;
      reason:
        | 'missing-node'
        | 'missing-edge'
        | 'wrong-direction'
        | 'capacity-zero';
      suggestion?: string;
    } => {
  if (path.length < 2) return { ok: true };
  const nodes = graph.nodes;
  const edgeMap = new Map<string, { capacity: number }>();
  for (const e of graph.edges) {
    const capacity = Number(e.capacity ?? Infinity);
    edgeMap.set(`${e.src}->${e.dest}`, { capacity });
  }
  for (let i = 0; i < path.length - 1; i += 1) {
    const src = path[i];
    const dest = path[i + 1];
    if (!nodes.has(src as any))
      return {
        ok: false,
        failAtIndex: i,
        src,
        dest,
        reason: 'missing-node',
        suggestion: `add node ${src}`,
      };
    if (!nodes.has(dest as any))
      return {
        ok: false,
        failAtIndex: i,
        src,
        dest,
        reason: 'missing-node',
        suggestion: `add node ${dest}`,
      };
    const key = `${src}->${dest}`;
    const revKey = `${dest}->${src}`;
    const fwd = edgeMap.get(key);
    if (!fwd) {
      const rev = edgeMap.get(revKey);
      if (rev) {
        return {
          ok: false,
          failAtIndex: i,
          src,
          dest,
          reason: 'wrong-direction',
          suggestion: `add edge ${src}->${dest} (reverse exists)`,
        };
      }
      return {
        ok: false,
        failAtIndex: i,
        src,
        dest,
        reason: 'missing-edge',
        suggestion: `add edge ${src}->${dest}`,
      };
    }
    if (!(fwd.capacity > 0)) {
      return {
        ok: false,
        failAtIndex: i,
        src,
        dest,
        reason: 'capacity-zero',
        suggestion: `increase capacity on ${src}->${dest}`,
      };
    }
  }
  return { ok: true };
};

/**
 * Diagnose near-miss connectivity categories for each source (positive supply)
 * and sink (negative supply). Purely topological; ignores objective.
 */
export const diagnoseNearMisses = (graph: FlowGraph) => {
  const nodes = [...graph.nodes];
  const supplies = graph.supplies;
  const sources = nodes.filter(n => (supplies[n] || 0) > 0);
  const sinks = nodes.filter(n => (supplies[n] || 0) < 0);

  const adj = new Map<string, string[]>();
  const capAdj = new Map<string, string[]>();
  for (const e of graph.edges) {
    (adj.get(e.src) ?? adj.set(e.src, []).get(e.src)!).push(e.dest);
    if (e.capacity === undefined || e.capacity > 0)
      (capAdj.get(e.src) ?? capAdj.set(e.src, []).get(e.src)!).push(e.dest);
  }

  const interHubEdges = graph.edges
    .filter(e => e.src.startsWith('@') && e.dest.startsWith('@'))
    .map(e => `${e.src}->${e.dest}`);

  const missingPairs: Array<{
    src: string;
    dest: string;
    category: string;
    hint?: string;
  }> = [];

  for (const s of sources) {
    const reachDir = bfs(s, adj);
    const reachCap = bfs(s, capAdj);
    for (const t of sinks) {
      if (reachDir.has(t) && reachCap.has(t)) continue; // reachable
      // Try to see if a single inter-hub edge would unlock (only for hubs)
      let hint: string | undefined;
      if (s.startsWith('@') && t.startsWith('@')) {
        // if t not in reach from s, propose s->t if not present
        const cand = `${s}->${t}`;
        if (!interHubEdges.includes(cand))
          hint = `consider adding inter-hub ${cand}`;
      }
      // eslint-disable-next-line no-nested-ternary
      const category = !reachDir.has(t)
        ? 'no-directed-path'
        : !reachCap.has(t)
          ? 'capacity-blocked'
          : 'unknown';
      missingPairs.push({ src: s, dest: t, category, hint });
    }
  }

  return { missingPairs };
};

/** Build a canonical leaf/hub -> hub/leaf path skeleton between two nodes. */
export const canonicalPathBetween = (
  graph: FlowGraph,
  src: string,
  dest: string,
): string[] => {
  if (src === dest) return [src];
  const hubOf = (n: string) => {
    if (n.startsWith('@')) return n;
    // Seats live on agoric
    if (n === '<Cash>' || n === '<Deposit>' || n === '+agoric')
      return '@agoric';
    const pp = (PoolPlaces as Record<string, PoolPlaceInfo | undefined>)[
      n as PoolKey
    ];
    if (pp) return `@${pp.chainName}`;
    const m = /^([A-Za-z0-9]+)_([A-Za-z0-9-]+)$/.exec(n);
    if (m) return `@${m[2]}`;
    // Fallback: if node exists and is not a hub, assume @agoric
    return '@agoric';
  };
  const srcHub = hubOf(src);
  const destHub = hubOf(dest);
  const path: string[] = [];
  if (src !== srcHub) path.push(src, srcHub);
  else path.push(srcHub);
  if (srcHub !== destHub) path.push(destHub);
  if (dest !== destHub) path.push(dest);
  return path;
};

/** Build an example path explanation for a pair of nodes. */
export const examplePathExplain = (
  graph: FlowGraph,
  src: string,
  dest: string,
) => {
  const path = canonicalPathBetween(graph, src, dest);
  const report = explainPath(graph, path);
  return { path, report };
};

/**
 * Build a compact, human-readable message describing why a model is infeasible.
 * Includes supply/reachability summary, near-miss pairs, and an example path explanation.
 */
export const formatInfeasibleDiagnostics = (
  graph: FlowGraph,
  model: LpModel,
): string => {
  const diag = diagnoseInfeasible(graph, model);
  const near = diagnoseNearMisses(graph);
  const nearStr = near.missingPairs.length
    ? ` | near-misses: ${near.missingPairs
        .slice(0, 6)
        .map(
          m =>
            `${m.src}->${m.dest}(${m.category}${m.hint ? `:${m.hint}` : ''})`,
        )
        .join(', ')}`
    : '';
  let example = '';
  if (near.missingPairs.length) {
    const m = near.missingPairs[0];
    const ex = examplePathExplain(graph, m.src, m.dest);
    if (ex.report.ok) {
      example = ` | example: ${ex.path.join('->')} ok`;
    } else {
      const r = ex.report;
      example = ` | example: ${ex.path.join('->')} fails at ${r.src}->${r.dest} (${r.reason}${r.suggestion ? `; ${r.suggestion}` : ''})`;
    }
  }
  return `${diag}${nearStr}${example}`;
};

/**
 * Validate solved flows for consistency.
 * Checks:
 * 1. Total supply sums to 0 (conservation)
 * 2. Each flow has sufficient supply at its source
 * 3. Hub chains end with zero balance (proper routing)
 *
 * @param graph - The rebalance graph with initial supplies
 * @param flows - Solved flows from the optimizer
 * @returns Validation result with ok flag and details
 */
export const validateSolvedFlows = (
  graph: FlowGraph,
  flows: Array<{
    edge: { src: string; dest: string; id: string };
    flow: number;
  }>,
): {
  ok: boolean;
  errors: string[];
  warnings: string[];
  finalBalances: Map<string, number>;
} => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check 1: Total supply sums to 0
  let totalSupply = 0;
  for (const node of graph.nodes) {
    totalSupply += graph.supplies[node] || 0;
  }
  if (totalSupply !== 0) {
    errors.push(
      `Supply conservation violated: total supply = ${totalSupply}, expected 0`,
    );
  }

  // Check 2: Simulate flow execution to verify supply sufficiency
  const balances = new Map(typedEntries(graph.supplies));
  for (const { edge, flow } of flows) {
    const srcBalance = balances.get(edge.src) || 0;

    // Check if source has sufficient balance
    if (srcBalance < flow) {
      errors.push(
        `Flow ${edge.id}: insufficient balance at ${edge.src}. ` +
          `Need ${flow}, have ${srcBalance} (shortage: ${flow - srcBalance})`,
      );
    }

    // Update balances
    balances.set(edge.src, srcBalance - flow);
    const destBalance = balances.get(edge.dest) || 0;
    balances.set(edge.dest, destBalance + flow);
  }

  // Check 3: Hub chains should end with 0 balance
  for (const hub of graph.nodes) {
    if (!hub.startsWith('@')) continue;
    const finalBalance = balances.get(hub) || 0;
    if (finalBalance !== 0) {
      warnings.push(`Hub ${hub} has non-zero final balance: ${finalBalance}`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    finalBalances: balances,
  };
};
