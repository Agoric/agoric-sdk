// Must be first to set up globals
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeHeapZone } from '@agoric/zone';
import { prepareTransactionFeedKit } from '../../src/exos/transaction-feed.js';

test('basics', t => {
  const zone = makeHeapZone();
  const kit = prepareTransactionFeedKit(zone);
  t.deepEqual(Object.values(kit), []);
});