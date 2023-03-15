// @ts-check
import '@endo/init';
import test from 'ava';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import ambientFs from 'fs';

import { ZipReader } from '@endo/zip';
import { decodeBase64 } from '@endo/base64';

import { fmtGraph } from '../tools/fmtGraph.js';
import bundleProvisionPool from '../bundles/bundle-provisionPool.js';

// import path, { join } from 'path';
// import url from 'url';
// import crypto from 'crypto';
// import { loadArchive, parseArchive } from '@endo/compartment-mapper';
// import { makeReadPowers } from '@endo/compartment-mapper/node-powers.js';
// const asset = ref => new URL(ref, import.meta.url).pathname;
// const bundles = { provisionPool: asset('../bundles/bundle-provisionPool.js') };

// #region test setup using ambient authority
test.before(t => {
  const { createWriteStream } = ambientFs;
  t.context = { createWriteStream };
  //   t.context = { readPowers: makeReadPowers({ fs, url, crypto }) };
});
// #endregion

const decoder = new TextDecoder();

const resolve = (spec, referer) =>
  spec.startsWith('.') ? join(referer, spec) : spec;

/**
 *
 * @param {EndoZipBase64Bundle} bundle
 * @returns {Graph}
 *
 * @typedef {import('../tools/fmtGraph').GraphNode} GraphNode
 * @typedef {Set<{ id: string, style: string}>} Neighbors
 * @typedef {{
 *   nodes: Set<GraphNode>,
 *   neighbors: Map<string, Neighbors>,
 * }} Graph
 */
const makeDepGraph = bundle => {
  const { endoZipBase64 } = bundle;
  const bytes = decodeBase64(endoZipBase64);
  const zar = new ZipReader(bytes);

  const parse = bs => JSON.parse(decoder.decode(bs));
  const map = parse(zar.read('compartment-map.json'));
  const { entry } = map; // TODO: highlight entry node

  const moduleNames = new Set();
  moduleNames.add(resolve(entry.module, entry.compartment));

  /** @type {Map<string, Neighbors>} */
  const deps = new Map();
  for (const [name, item] of zar.files) {
    if (name === 'compartment-map.json') continue;
    /** @type {import('@endo/static-module-record').StaticModuleRecord} */
    const minfo = parse(item.content);
    /** @type {Neighbors} */
    const neighbors = new Set();
    for (const spec of minfo.imports) {
      const fullName = resolve(spec, name);
      console.log(name, '->', spec, fullName);
      neighbors.add({ id: fullName, style: '' });
      moduleNames.add(fullName);
    }
    deps.set(name, neighbors);
    // moduleNames.add(name);
  }
  return {
    nodes: new Set([...moduleNames].map(n => ({ id: n, label: n }))),
    neighbors: deps,
  };
};

test('explore bundle module graph', async t => {
  const { createWriteStream } = t.context;
  //   const { readPowers } = t.context;
  //   const arch = await loadArchive(readPowers, bundles.provisionPool);

  const bundle = bundleProvisionPool;
  if (bundle.moduleFormat !== 'endoZipBase64') throw Error(bundle.moduleFormat);
  // @ts-expect-error string vs. 'endoZipBase64'?
  const dg = makeDepGraph(bundle);

  const set2list = (k, v) =>
    v instanceof Set ? [...v] : v instanceof Map ? [...v.entries()] : v;
  await pipeline(
    [JSON.stringify(dg, set2list, 2)],
    createWriteStream(',out.json'),
  );
  const out = createWriteStream(',out.dot');

  await t.notThrowsAsync(pipeline(fmtGraph(dg.nodes, dg.neighbors), out));
});
