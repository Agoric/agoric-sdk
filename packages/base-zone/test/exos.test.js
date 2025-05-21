import test from 'ava';

import { makeHeapZone } from '../heap.js';
import { testFirstZoneIncarnation } from '../tools/testers.js';

test('heapZone', t => {
  const zone = makeHeapZone();
  testFirstZoneIncarnation(t, zone);
});
