import test from 'ava';

import {
  evalBundles,
  getIncarnation,
  getVatDetails,
} from '@agoric/synthetic-chain';

const SUBMISSION_DIR = 'probe-submission';

test('upgrade Zoe to verify ZcfBundleCap endures', async t => {
  await null;
  t.assert((await getIncarnation('zoe')) === 2, 'zoe incarnation must be one');

  // Before the test, the Wallet Factory should be using the legacy ZCF
  const detailsBefore = await getVatDetails('walletFactory');
  t.true(detailsBefore.incarnation >= 2, 'wf incarnation must be >= 2');

  await evalBundles(SUBMISSION_DIR);

  const detailsAfter = await getVatDetails('walletFactory');
  t.is(
    detailsAfter.incarnation,
    detailsBefore.incarnation + 2,
    'wf incarnation must increase by 2',
  );

  // The test restarts the WalletFactory, so it'll use the recently assigned
  // ZCF bundle. It then restarts Zoe, so it'll revert to whichever ZCF bundle
  // made it to persistent store. We then restart the Wallet Factory and see if
  // it's gone back to the ZCF that Zoe initially knew about. If we could get the
  // ZCF bundleID here from the probe, we'd explicitly check for that. Instead,
  // we have to be content that it did indeed use the newly assigned bundle in
  // manual tests.
  t.not(detailsAfter.bundleID, detailsBefore.bundleID);
});
