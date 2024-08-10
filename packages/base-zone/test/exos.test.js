import { test } from './prepare-test-env-ava.js';

import { makeHeapZone } from '../heap.js';
import { testFirstZoneIncarnation } from '../tools/testers.js';

test('heapZone', t => {
  const zone = makeHeapZone();
  testFirstZoneIncarnation(t, zone);
});
