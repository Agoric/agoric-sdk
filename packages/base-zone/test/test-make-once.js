import test from '@endo/ses-ava/prepare-endo.js';

import { makeHeapZone } from '../heap.js';
import { testMakeOnce } from '../tools/testers.js';

test('heapZone', t => {
  testMakeOnce(t, makeHeapZone());
});
