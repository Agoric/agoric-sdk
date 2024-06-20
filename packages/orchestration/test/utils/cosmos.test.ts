import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { dateInSeconds } from '../../src/utils/cosmos.js';

test('dateInSeconds', t => {
  t.is(dateInSeconds(new Date(1)), 0n);
  t.is(dateInSeconds(new Date(999)), 0n);
  t.is(dateInSeconds(new Date(1000)), 1n);

  t.is(dateInSeconds(new Date('2025-12-17T12:23:45Z')), 1765974225n);
});
