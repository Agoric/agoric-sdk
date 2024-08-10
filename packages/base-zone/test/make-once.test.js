import { test } from './prepare-test-env-ava.js';

import { makeHeapZone } from '../heap.js';
import { testMakeOnce } from '../tools/testers.js';

test('heapZone', t => {
  testMakeOnce(t, makeHeapZone());
});
