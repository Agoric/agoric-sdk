#! /usr/bin/env node
import '@endo/init';
import { extractProposalBundles } from '@agoric/deploy-script-support';
import url from 'url';
import process from 'process';

import { defaultProposalBuilder } from './init-core.js';
import { defaultProposalBuilder as collateralProposalBuilder } from './add-collateral-core.js';

process.env.INTERCHAIN_DENOM = 'arbitrary value to prevent build error';

const dirname = url.fileURLToPath(new URL('.', import.meta.url));
extractProposalBundles(
  [
    ['.', defaultProposalBuilder],
    ['.', collateralProposalBuilder],
  ],
  dirname,
);
