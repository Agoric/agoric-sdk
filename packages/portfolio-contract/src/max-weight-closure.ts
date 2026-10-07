/** @file Maximum-weight closure for bigint-weighted dependency graphs. */

/**
 * Find the maximum total weight of a dependency-closed subset of nodes.
 *
 * A subset is closed when including a node also includes all of its
 * dependencies. The empty subset is always available, so the result is
 * non-negative.
 *
 * Uses an Edmonds-Karp maximum-flow reduction: O(V E^2) time and O(V^2)
 * space, excluding bigint arithmetic costs. Here V includes the supplied
 * nodes plus the source and sink, and E includes their weight and dependency
 * edges.
 *
 * @throws {Error} if `nodes` contains a duplicate
 * @throws {Error} if `dependenciesOf` returns a value absent from `nodes`
 */
export const maxWeightClosure = <Node>(
  nodes: Iterable<Node>,
  weightOf: (node: Node) => bigint,
  dependenciesOf: (node: Node) => Iterable<Node>,
): bigint => {
  const nodeList = [...nodes];
  const indexByNode = new Map<Node, number>();
  for (const [index, node] of nodeList.entries()) {
    if (indexByNode.has(node)) throw Error('duplicate closure node');
    indexByNode.set(node, index);
  }

  const source = nodeList.length;
  const sink = source + 1;
  const vertexCount = sink + 1;
  const residual = Array.from({ length: vertexCount }, () =>
    Array<bigint>(vertexCount).fill(0n),
  );
  const neighbors = Array.from(
    { length: vertexCount },
    () => new Set<number>(),
  );
  const addEdge = (from: number, to: number, capacity: bigint) => {
    residual[from]![to]! += capacity;
    neighbors[from]!.add(to);
    neighbors[to]!.add(from);
  };

  const weights = nodeList.map(weightOf);
  const totalMagnitude = weights.reduce(
    (total, weight) => total + (weight < 0n ? -weight : weight),
    0n,
  );
  const dependencyCapacity = totalMagnitude + 1n;
  let positiveWeight = 0n;
  for (const [index, weight] of weights.entries()) {
    if (weight > 0n) {
      addEdge(source, index, weight);
      positiveWeight += weight;
    } else if (weight < 0n) {
      addEdge(index, sink, -weight);
    }
  }
  for (const [index, node] of nodeList.entries()) {
    for (const dependency of dependenciesOf(node)) {
      const dependencyIndex = indexByNode.get(dependency);
      if (dependencyIndex === undefined) {
        throw Error('closure dependency is not a node');
      }
      addEdge(index, dependencyIndex, dependencyCapacity);
    }
  }

  let flow = 0n;
  for (;;) {
    const parent: Array<number | undefined> =
      Array(vertexCount).fill(undefined);
    parent[source] = source;
    const queue = [source];
    for (let head = 0; head < queue.length; head += 1) {
      const from = queue[head]!;
      for (const to of neighbors[from]!) {
        if (parent[to] !== undefined || residual[from]![to]! === 0n) continue;
        parent[to] = from;
        queue.push(to);
      }
    }
    if (parent[sink] === undefined) break;

    let increment: bigint | undefined;
    for (let to = sink; to !== source; ) {
      const from = parent[to]!;
      const capacity = residual[from]![to]!;
      increment =
        increment === undefined || capacity < increment ? capacity : increment;
      to = from;
    }
    if (increment === undefined) throw Error('empty augmenting path');
    for (let to = sink; to !== source; ) {
      const from = parent[to]!;
      residual[from]![to]! -= increment;
      residual[to]![from]! += increment;
      to = from;
    }
    flow += increment;
  }

  return positiveWeight - flow;
};
harden(maxWeightClosure);
