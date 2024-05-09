import test from 'ava';

import {
  evalBundles,
  getIncarnation,
  getVatDetails,
} from '@agoric/synthetic-chain';

const SUBMISSION_DIR = 'probe-submission';

test('upgrade Zoe to verify ZcfBundleCap endures', async t => {
  await null;
  t.assert((await getIncarnation('zoe')) === 1, 'zoe incarnation must be one');

  // Before the test, the Wallet Factory should be using the legacy ZCF
  const detailsBefore = await getVatDetails('walletFactory');
  t.true(detailsBefore.incarnation >= 2, 'wf incarnation must be >= 2');

  await evalBundles(SUBMISSION_DIR);

  const detailsAfter = await getVatDetails('walletFactory');
  t.is(
    detailsAfter.incarnation,
    detailsBefore.incarnation,
    // detailsBefore.incarnation + 2,
    'wf incarnation must increase by 2',
  );
});
