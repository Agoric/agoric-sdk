#! /usr/bin/env node
import '@endo/init';
import { createBundles } from '@agoric/internal/src/node/createBundles.js';
import url from 'url';

const dirname = url.fileURLToPath(new URL('.', import.meta.url));

const sourceToBundle = [
  [`../src/vat-spawned.js`, `../bundles/bundle-spawn.js`],
];

await createBundles(sourceToBundle, dirname);
