// @ts-check
/* global Buffer */

const { entries } = Object;

/**
 * @param {Object} graph
 * @param { Set<string> } graph.nodes
 * @param { Array<{ src: string, dest: string}> } graph.edges
 * @yields { string }
 */
function* fmtGraph({ nodes, edges }) {
  yield 'digraph G {\n';
  for (const e of edges) {
    yield `${e.src} -> ${e.dest}\n`; // TODO quoting / escaping
  }
  yield '}\n';
}

/**
 *
 * @param {Record<string, Permit>} manifest
 * @typedef {{
 *   vatPowers?: Record<string, boolean>
 * }} Permit
 */
const manifest2graph = manifest => {
  const nodes = new Set();
  const edges = [];
  for (const [fnName, permit] of entries(manifest)) {
    nodes.add(fnName);
    if (permit.vatPowers) {
      for (const [powerName, status] of entries(permit.vatPowers)) {
        if (status) {
          nodes.add('vatPowers');
          nodes.add(powerName);
          edges.push({ src: 'vatPowers', dest: powerName });
          edges.push({ src: fnName, dest: powerName });
        }
      }
    }
  }
  return { nodes, edges };
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
