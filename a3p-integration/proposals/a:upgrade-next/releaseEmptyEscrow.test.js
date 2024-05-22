import test from 'ava';

import { evalBundles, getIncarnation } from '@agoric/synthetic-chain';
import { getVatObjectCount } from './sql-tools.js';

const SUBMISSION_DIR = 'release-empty-escrow';

test('release empty payments from Zoe Escrow', async t => {
  await null;

  t.assert((await getIncarnation('zoe')) === 2, 'zoe incarnation must be two');

  const n9 = await getVatObjectCount(`v9`);
  console.log('census v9', n9);

  await evalBundles(SUBMISSION_DIR);
});
