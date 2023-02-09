#! /usr/bin/env node
import '@endo/init';
import {
  createBundles,
  extractProposalBundles,
} from '@agoric/internal/src/createBundles.js';
import url from 'url';
import process from 'process';

import { defaultProposalBuilder } from './init-core.js';
import { defaultProposalBuilder as collateralProposalBuilder } from './add-collateral-core.js';

process.env.INTERCHAIN_ISSUER_BOARD_ID =
  'arbitrary value to prevent build error';

const dirname = url.fileURLToPath(new URL('.', import.meta.url));
await extractProposalBundles(
  [
    ['.', defaultProposalBuilder],
    ['.', collateralProposalBuilder],
  ],
  dirname,
);

await createBundles(
  [
    ['../src/psm/psm.js', '../bundles/bundle-psm.js'],
    [
      '../src/econCommitteeCharter.js',
      '../bundles/bundle-econCommitteeCharter.js',
    ],
    ['../src/price/fluxAggregator.js', '../bundles/bundle-fluxAggregator.js'],
  ],
  dirname,
);
