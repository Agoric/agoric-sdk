#! /usr/bin/env node
import '@endo/init';
import { createBundles } from '@agoric/internal/src/node/createBundles.js';
import url from 'url';

const dirname = url.fileURLToPath(new URL('.', import.meta.url));

const sourceToBundle = [[`../src/wallet.js`, `../bundles/bundle-wallet.js`]];

await createBundles(sourceToBundle, dirname);
