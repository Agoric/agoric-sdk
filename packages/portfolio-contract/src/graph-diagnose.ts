// Lightweight diagnostics for infeasible solver models.
// Extracted to a separate module to keep solver core lean and allow reuse.

import { Fail, q } from '@endo/errors';

import type { NatAmount } from '@agoric/ertp/src/types.js';
import { provideLazyMap } from '@agoric/internal/src/js-utils.js';
import type { NetworkDefinition } from './network/types.js';
import { PoolPlaces, type PoolKey, type PoolPlaceInfo } from './type-guards.js';

/**
 * Build human-readable diagnostics for infeasible models.
 * Heuristics only: checks supply balance and reachability of sinks from sources.
 *
 * Example output (when graph.debug is true):
 *   No feasible solution: nodes=7 edges=12 | supply: sum=0 pos=1500 neg=1500 (pos should equal neg; sum should be 0) | sources=2 sinks=2 | sources with no path to any sink (1): Aave_Arbitrum(800) | hubs present: @agoric, @noble, @Arbitrum | inter-hub edges: @agoric->@noble, @noble->@Arbitrum
 *
 * How to enable:
 *   - Set `debug: true` on the NetworkDefinition used to build the graph.
 */
export const diagnoseInfeasible = (
  graph: RebalanceGraph,
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

  const bfs = (start: string) => {
    const queue = [start];
    const seen = new Set(queue);
    while (queue.length) {
      const cur = queue.shift()!;
      const outs = adj.get(cur);
      for (const v of outs || []) {
        if (seen.has(v)) continue;
        seen.add(v);
        queue.push(v);
      }
    }
    return seen;
  };

  const stranded = [] as { node: string; supply: number }[];
  for (const s of sources) {
    const reach = bfs(s);
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
    `supply: sum=${sumSupply} pos=${posTotal} neg=${negTotal} (pos should equal neg; sum should be 0)`,
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
  network: NetworkDefinition,
  current: Partial<Record<string, NatAmount>>,
  target: Partial<Record<string, NatAmount>>,
) => {
  const keys = new Set<string>([
    ...Object.keys(current ?? {}),
    ...Object.keys(target ?? {}),
  ]);
  const vOf = (a?: NatAmount) => (a ? (a.value as bigint) : 0n);

  // Build hub-only adjacency
  const adj = new Map<string, string[]>();
  for (const e of network.edges) {
    if (e.src.startsWith('@') && e.dest.startsWith('@')) {
      (adj.get(e.src) ?? adj.set(e.src, []).get(e.src)!).push(e.dest);
    }
  }
  const bfs = (start: string) => {
    const seen = new Set<string>([start]);
    const queue = [start];
    while (queue.length) {
      const cur = queue.shift()!;
      for (const n of adj.get(cur) || [])
        if (!seen.has(n)) {
          seen.add(n);
          queue.push(n);
        }
    }
    return seen;
  };
  const reachFromAgoric = bfs('@agoric');

  const needsToAgoric = new Map<string, string[]>();
  const needsFromAgoric = new Map<string, string[]>();
  const declared = new Set(network.nodes);

  for (const k of keys) {
    if (k === '+agoric') continue;
    const cur = vOf(current[k]);
    const tgt = vOf(target[k]);
    if (cur === tgt) continue;

    const pp: PoolPlaceInfo | undefined = (
      PoolPlaces as Record<PoolKey, PoolPlaceInfo | undefined>
    )[k as PoolKey];
    if (!pp && !declared.has(k)) {
      throw Fail`Unsupported position key: ${q(k)}`;
    }
    const chain = pp?.chainName ?? k.replace(/^[^_]+_/, '');
    const hub = `@${chain}`;

    if (cur > tgt) {
      (
        needsToAgoric.get(chain) ?? needsToAgoric.set(chain, []).get(chain)!
      ).push(k);
    } else if (tgt > cur) {
      (
        needsFromAgoric.get(chain) ?? needsFromAgoric.set(chain, []).get(chain)!
      ).push(k);
      if (!reachFromAgoric.has(hub)) {
        const list = (needsFromAgoric.get(chain) || []).join(', ');
        throw Fail`No inter-hub path @agoric->${hub}; positions: ${q(list)}`;
      }
    }
  }

  for (const [chain, posKeys] of needsToAgoric.entries()) {
    const reach = bfs(`@${chain}`);
    if (!reach.has('@agoric')) {
      throw Fail`No inter-hub path @${chain}->@agoric; positions: ${q(posKeys.join(', '))}`;
    }
  }
};

/**
 * Explain why a given path would fail on this graph.
 * Returns { ok: true } if every hop exists and has positive capacity.
 */
export const explainPath = (
  graph: RebalanceGraph,
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
  for (const e of graph.edges)
    edgeMap.set(`${e.src}->${e.dest}`, { capacity: e.capacity });
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
export const diagnoseNearMisses = (graph: RebalanceGraph) => {
  const nodes = [...graph.nodes];
  const supplies = graph.supplies;
  const sources = nodes.filter(n => (supplies[n] || 0) > 0);
  const sinks = nodes.filter(n => (supplies[n] || 0) < 0);

  const adj = new Map<string, string[]>();
  const capAdj = new Map<string, string[]>();
  for (const e of graph.edges) {
    (adj.get(e.src) ?? adj.set(e.src, []).get(e.src)!).push(e.dest);
    if (e.capacity > 0)
      (capAdj.get(e.src) ?? capAdj.set(e.src, []).get(e.src)!).push(e.dest);
  }
  const bfs = (start: string, A: Map<string, string[]>) => {
    const seen = new Set<string>([start]);
    const queue = [start];
    while (queue.length) {
      const cur = queue.shift()!;
      for (const v of A.get(cur) || [])
        if (!seen.has(v)) {
          seen.add(v);
          queue.push(v);
        }
    }
    return seen;
  };

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
  graph: RebalanceGraph,
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
  graph: RebalanceGraph,
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
  graph: RebalanceGraph,
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
