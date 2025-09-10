import type { Amount } from '@agoric/ertp';
import type { RebalanceGraph, FlowEdge } from '../plan-solve.js';
import type { AssetPlaceRef, MovementDesc } from '../type-guards-steps.js';

/** Weight selector: cheapest => variableFee, fastest => timeFixed, default 1 */
const edgeWeight = (e: FlowEdge, mode: 'cheapest' | 'fastest') => {
  if (mode === 'cheapest') return e.variableFee ?? 0;
  if (mode === 'fastest') return e.timeFixed ?? 0;
  return 1;
};

/** Find shortest(weighted) path using Dijkstra (graph small so OK). */
export const findPath = (
  graph: RebalanceGraph,
  src: AssetPlaceRef,
  dest: AssetPlaceRef,
  mode: 'cheapest' | 'fastest' = 'cheapest',
): AssetPlaceRef[] => {
  if (src === dest) return [src];
  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  for (const n of graph.nodes) dist.set(n, Infinity);
  dist.set(src, 0);
  const q = new Set(graph.nodes);
  while (q.size) {
    // pick min dist
    let u: string | undefined;
    let best = Infinity;
    for (const n of q) {
      const d = dist.get(n as string) ?? Infinity;
      if (d < best) {
        best = d;
        u = n as string;
      }
    }
    if (!u) break;
    q.delete(u as AssetPlaceRef);
    if (u === dest) break;
    for (const e of graph.edges) {
      if (e.src !== u) continue;
      const w = edgeWeight(e, mode);
      const alt = best + w;
      const dv = dist.get(e.dest) ?? Infinity;
      if (alt < dv) {
        dist.set(e.dest, alt);
        prev.set(e.dest, u);
      }
    }
  }
  if (!prev.has(dest) && src !== dest) throw Error(`no path ${src} -> ${dest}`);
  const rev: string[] = [dest];
  let cur: string | undefined = dest;
  while (cur && cur !== src) {
    cur = prev.get(cur);
    if (!cur) break;
    rev.push(cur);
  }
  rev.reverse();
  if (rev[0] !== src)
    throw Error(`path reconstruction failed ${src} -> ${dest}`);
  return rev as AssetPlaceRef[];
};

export const pathToSteps = (
  path: AssetPlaceRef[],
  amount: Amount<'nat'>,
  _brand: Amount<'nat'>['brand'],
): MovementDesc[] => {
  if (path.length < 2) return [];
  const steps: MovementDesc[] = [];
  for (let i = 0; i < path.length - 1; i += 1) {
    steps.push({ src: path[i], dest: path[i + 1], amount });
  }
  return steps;
};
