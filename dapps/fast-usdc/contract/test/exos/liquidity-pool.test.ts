import test from 'ava';

import '@agoric/swingset-liveslots/tools/prepare-test-env.js';

import { stateShape } from '../../src/exos/liquidity-pool.js';

// NB: We don't test more than this because the Exo has so many runtime dependencies
// for which we don't have viable mocks.
// The Exo is tested by fast-usdc.contract.test.js, but that doesn't appear in code coverage.
// We can solve that by getting code coverage for bundles https://github.com/Agoric/agoric-sdk/issues/1817
// or by testing without bundling https://github.com/Agoric/agoric-sdk/issues/10558

test('stateShape', t => {
  t.snapshot(stateShape);
});
