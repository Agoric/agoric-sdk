#! /usr/bin/env node
import '@endo/init';
import { createBundles } from '@agoric/internal/src/node/createBundles.js';
import url from 'url';

const dirname = url.fileURLToPath(new URL('.', import.meta.url));

// TODO end inter-package filesystem references https://github.com/Agoric/agoric-sdk/issues/8178

const sourceToBundle = [
  ['@agoric/vats/src/centralSupply.js', '../bundles/bundle-centralSupply.js'],
  ['@agoric/vats/src/mintHolder.js', '../bundles/bundle-mintHolder.js'],
  [
    '@agoric/inter-protocol/src/provisionPool.js',
    '../bundles/bundle-provisionPool.js',
  ],
];

await createBundles(sourceToBundle, dirname);
