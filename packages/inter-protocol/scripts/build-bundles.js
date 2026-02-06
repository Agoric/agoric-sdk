#! /usr/bin/env node
import '@endo/init';

import { createBundles } from '@agoric/internal/src/node/createBundles.js';
import url from 'url';

const dirname = url.fileURLToPath(new URL('.', import.meta.url));

await createBundles(
  [
    ['@agoric/inter-protocol/src/psm/psm.js', '../bundles/bundle-psm.js'],
    [
      '@agoric/inter-protocol/src/econCommitteeCharter.js',
      '../bundles/bundle-econCommitteeCharter.js',
    ],
    [
      '@agoric/inter-protocol/src/price/fluxAggregatorContract.js',
      '../bundles/bundle-fluxAggregatorKit.js',
    ],
    // TODO end inter-package filesystem references https://github.com/Agoric/agoric-sdk/issues/8178
    [
      '@agoric/inter-protocol/src/provisionPool.js',
      '../../vats/bundles/bundle-provisionPool.js',
    ],
  ],
  dirname,
);
