import test from 'ava';

import { makeHeapZone } from '../heap.js';
import { testMakeOnce } from '../tools/testers.js';

test('heapZone', t => {
  testMakeOnce(t, makeHeapZone());
});
