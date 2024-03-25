// eslint-disable-next-line import/order
import test from '@endo/ses-ava/prepare-endo.js';

import { makeHeapZone } from '../heap.js';
import { testFirstZoneIncarnation } from '../tools/testers.js';

test('heapZone', t => {
  const zone = makeHeapZone();
  testFirstZoneIncarnation(t, zone);
});
