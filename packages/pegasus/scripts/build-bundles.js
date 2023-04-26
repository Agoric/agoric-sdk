#! /usr/bin/env node
import '@endo/init';
import { extractProposalBundles } from '@agoric/deploy-script-support';
import url from 'url';

import { defaultProposalBuilder } from './init-core.js';

const dirname = url.fileURLToPath(new URL('.', import.meta.url));
extractProposalBundles([['.', defaultProposalBuilder]], dirname);
