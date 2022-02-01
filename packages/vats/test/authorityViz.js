// @ts-check
import '@endo/init';
import * as manifests from '../src/core/manifest.js';

const { entries } = Object;

const styles = {
  vatPowers: 'shape=Mcircle',
  vats: 'shape=trapezium',
  devices: 'shape=box',
  space: 'shape=diamond',
};

/**
 * @param { Set<GraphNode> } nodes
 * @param {Map<string, Set<{ id: string, style?: string }>>} neighbors
 * @yields { string }
 * @typedef {{ id: string, label: string, style?: string }} GraphNode
 */
function* fmtGraph(nodes, neighbors) {
  const q = txt => JSON.stringify(txt.replace(/\./g, '_'));
  yield 'digraph G {\n';
  yield 'rankdir = LR;\n';
  for (const { id, label, style } of nodes) {
    yield `${q(id)} [label=${q(label)}${style ? `, ${style}` : ''}];\n`;
  }
  for (const [src, arcs] of neighbors.entries()) {
    for (const { id, style } of arcs) {
      yield `${q(src)} -> ${q(id)} [${style}]\n`;
    }
  }
  yield '}\n';
}

/**
 *
 * @param {Record<string, Permit>} manifest
 * @typedef {{
 *   vatPowers?: Record<string, boolean>
 *   vats?: Record<string, boolean>
 *   devices?: Record<string, boolean>
 *   produce?: Record<string, boolean>
 *   consume?: Record<string, boolean>
 * }} Permit
 */
const manifest2graph = manifest => {
  /** @type { Set<GraphNode> } */
  const nodes = new Set();
  const neighbors = new Map();

  /**
   * @param {string} src
   * @param {string} dest
   * @param {string=} style
   */
  const addEdge = (src, dest, style = '') => {
    if (!neighbors.has(src)) {
      neighbors.set(src, new Set());
    }
    neighbors.get(src).add({ id: dest, style });
  };

  /**
   * @param {string} src
   * @param {string} ty
   * @param {Record<string, boolean> | undefined} item
   * @param {boolean=} reverse
   */
  const level1 = (src, ty, item, reverse = false) => {
    if (item) {
      for (const [powerName, status] of entries(item)) {
        if (status) {
          // TODO: just powerName for label; use style for ty
          nodes.add({
            id: `${ty}.${powerName}`,
            label: powerName,
            style: styles[ty],
          });
          addEdge(src, `${ty}.${powerName}`, reverse ? 'dir=back' : '');
        }
      }
    }
  };

  for (const [fnName, permit] of entries(manifest)) {
    nodes.add({ id: fnName, label: fnName });

    level1(fnName, 'vatPowers', permit.vatPowers, true);
    level1(fnName, 'vats', permit.vats, true);
    level1(fnName, 'devices', permit.devices, true);
    level1(fnName, 'space', permit.produce);
    level1(fnName, 'space', permit.consume, true);
  }
  return { nodes, neighbors };
};

/**
 * @param { string[] } args
 * @param { Object } io
 * @param { typeof import('fs/promises').readFile } io.readFile
 * @param { typeof import('process').stdout } io.stdout
 */
const main = async (args, { readFile, stdout }) => {
  const [fn, ...opts] = args;
  if (!fn) throw Error('usage: authorityViz config.json');
  const txt = await readFile(fn, 'utf-8');
  const config = JSON.parse(txt);
  const {
    vats: {
      bootstrap: {
        parameters: { bootstrapManifest },
      },
    },
  } = config;
  const manifest =
    bootstrapManifest ||
    (opts.includes('--sim-chain')
      ? manifests.SIM_CHAIN_BOOTSTRAP_MANIFEST
      : manifests.CHAIN_BOOTSTRAP_MANIFEST);

  // console.log(JSON.stringify(bootstrapManifest, null, 2));
  const g = manifest2graph(manifest);
  for (const chunk of fmtGraph(g.nodes, g.neighbors)) {
    stdout.write(chunk);
  }
};

(async () => {
  const [process, fsp] = await Promise.all([
    import('process'),
    import('fs/promises'),
  ]);
  return main(process.argv.slice(2), {
    readFile: fsp.readFile,
    stdout: process.stdout,
  });
})().catch(console.error);
