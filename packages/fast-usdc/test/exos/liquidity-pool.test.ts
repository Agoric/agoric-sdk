import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { stateShape } from '../../src/exos/liquidity-pool.js';

test('stateShape', t => {
  t.snapshot(stateShape);
});
