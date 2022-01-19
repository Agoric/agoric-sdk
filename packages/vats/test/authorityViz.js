// @ts-check
/* global Buffer */

const { entries } = Object;

/**
 * @param {Map<string, Set<string>>} neighbors
 * @yields { string }
 */
function* fmtGraph(neighbors) {
  const q = txt => JSON.stringify(txt.replace(/\./g, '_'));
  yield 'digraph G {\n';
  yield 'rankdir = LR;';
  for (const [src, arcs] of neighbors.entries()) {
    for (const dest of arcs) {
      yield `${q(src)} -> ${q(dest)}\n`;
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
  const nodes = new Set();
  const neighbors = new Map();

  const addEdge = (src, dest) => {
    if (!neighbors.has(src)) {
      neighbors.set(src, new Set());
    }
    neighbors.get(src).add(dest);
  };

  const level1 = (src, ty, item) => {
    if (item) {
      for (const [powerName, status] of entries(item)) {
        if (status) {
          nodes.add(ty);
          // TODO: just powerName for label; use style for ty
          nodes.add(`${ty}.${powerName}`);
          addEdge(`${ty}.${powerName}`, ty);
          addEdge(src, `${ty}.${powerName}`);
        }
      }
    }
  };

  for (const [fnName, permit] of entries(manifest)) {
    nodes.add(fnName);

    level1(fnName, 'vatPowers', permit.vatPowers);
    level1(fnName, 'vats', permit.vats);
    level1(fnName, 'devices', permit.devices);
    level1(fnName, 'space', permit.produce); // TODO: different styles for produce / consume
    level1(fnName, 'space', permit.consume);
  }
  return neighbors;
};

/**
 * @param { string[] } args
 * @param { Object } io
 * @param { typeof import('fs/promises').readFile } io.readFile
 * @param { typeof import('process').stdout } io.stdout
 */
const main = async (args, { readFile, stdout }) => {
  const [fn] = args;
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

  // console.log(JSON.stringify(bootstrapManifest, null, 2));
  const g = manifest2graph(bootstrapManifest);
  for (const chunk of fmtGraph(g)) {
    stdout.write(chunk);
  }
};

/* global process */
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
