#! /usr/bin/env node
// @jessie-check

import '@endo/init';
import { createBundles } from '@agoric/internal/src/node/createBundles.js';
import url from 'url';

const dirname = url.fileURLToPath(new URL('.', import.meta.url));

const sourceToBundle = [
  ['../src/contractFacet/vatRoot.js', '../bundles/bundle-contractFacet.js'],
];

await createBundles(sourceToBundle, dirname);
