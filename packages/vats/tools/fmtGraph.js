// @ts-check

/**
 * @param {Set<GraphNode>} nodes
 * @param {Map<string, Set<{ id: string, style?: string }>>} neighbors
 * @yields { string }
 * @typedef {{
 *   id: string,
 *   cluster?: string,
 *   label: string,
 *   style?: string,
 * }} GraphNode
 */
export function* fmtGraph(nodes, neighbors) {
  const lit = txt => JSON.stringify(txt);
  const q = txt => JSON.stringify(txt.replace(/\./g, '_'));
  yield 'digraph G {\n';
  yield 'rankdir = LR;\n';
  const clusters = new Set(
    [...nodes].map(({ cluster }) => cluster).filter(c => !!c),
  );
  for (const subgraph of [...clusters, undefined]) {
    if (subgraph) {
      assert.typeof(subgraph, 'string');
      yield `subgraph cluster_${subgraph} {\n`;
      yield `label = "${subgraph}"\n`;
    }
    for (const { id, cluster, label, style } of nodes) {
      if (subgraph && cluster !== subgraph) continue;
      yield `${q(id)} [label=${lit(label)}${style ? `, ${style}` : ''}];\n`;
    }
    if (subgraph) {
      yield `}\n`;
    }
  }
  for (const [src, arcs] of neighbors.entries()) {
    for (const { id, style } of arcs) {
      yield `${q(src)} -> ${q(id)} [${style}]\n`;
    }
  }
  yield '}\n';
}
