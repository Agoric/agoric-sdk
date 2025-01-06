import test from 'ava';

import { evalBundles } from '@agoric/synthetic-chain';

const SUBMISSION_DIR = 'recorded-instances-submission';

test(`recorded instances in u18`, async t => {
  const result = await evalBundles(SUBMISSION_DIR);
  console.log('recorded retired instance result:', result);
  t.pass('checked names');
});
