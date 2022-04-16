#! /usr/bin/env node
import '@endo/init';
import { extractProposalBundles } from '@agoric/deploy-script-support';
import url from 'url';

import { proposalBuilder } from './create-gov.js';

const dirname = url.fileURLToPath(new URL('.', import.meta.url));
extractProposalBundles([['.', proposalBuilder]], dirname);
