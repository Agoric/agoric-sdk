import test from 'ava';

import { evalBundles } from '@agoric/synthetic-chain';

const SUBMISSION_DIR = 'recorded-instances-submission';

test(`recorded instances in u18`, async t => {
  await evalBundles(SUBMISSION_DIR);
  t.pass('checked names');
});
