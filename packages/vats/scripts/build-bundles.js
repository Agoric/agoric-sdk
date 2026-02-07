#! /usr/bin/env node
import '@endo/init';
import { createBundles } from '@agoric/internal/src/node/createBundles.js';
import url from 'url';

const dirname = url.fileURLToPath(new URL('.', import.meta.url));

const sourceToBundle = [
  ['@agoric/vats/src/centralSupply.js', '../bundles/bundle-centralSupply.js'],
  ['@agoric/vats/src/mintHolder.js', '../bundles/bundle-mintHolder.js'],
  // NB: vats/bundles/bundle-provisionPool.js is built by inter-protocol for
  // proper package layering but we keep this output to avoid breaking existing references
];

await createBundles(sourceToBundle, dirname);
