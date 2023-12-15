import test from 'ava';

import { waitForBlock } from '../commonUpgradeHelpers.js';

test.before(async () => {
  console.log('Wait for upgrade to settle');

  await waitForBlock(5);
});
