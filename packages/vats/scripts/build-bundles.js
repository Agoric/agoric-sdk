#! /usr/bin/env node
import '@endo/init';
import { createBundles } from '@agoric/internal/src/createBundles.js';
import url from 'url';

const dirname = url.fileURLToPath(new URL('.', import.meta.url));

const sourceToBundle = [
  [`../src/centralSupply.js`, `../bundles/bundle-centralSupply.js`],
  [`../src/mintHolder.js`, `../bundles/bundle-mintHolder.js`],
  [`../src/provisionPool.js`, `../bundles/bundle-provisionPool.js`],
];

await createBundles(sourceToBundle, dirname);
