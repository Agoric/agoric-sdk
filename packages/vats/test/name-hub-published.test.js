import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { makePromiseSpaceForNameHub } from '../src/core/utils.js';
import { makeNameHubKit } from '../src/nameHub.js';

// This suite used to also test publishAgoricNames but that code wasn't used
// anywhere so the test was removed. Its replacement,
// publishAgoricNamesToChainStorage, requires more more context so it's tested
// through integration instead of as a unit test.

test('promise space reserves non-well-known names', async t => {
  const { nameHub, nameAdmin } = makeNameHubKit();
  const remoteAdmin = Promise.resolve(nameAdmin);
  const space = makePromiseSpaceForNameHub(remoteAdmin);

  const thing1 = space.consume.thing1;
  space.produce.thing1.resolve(true);
  t.is(await thing1, true);

  t.is(await nameHub.lookup('thing1'), true);
});
