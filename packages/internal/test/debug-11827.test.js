import test from '@endo/ses-ava/prepare-endo.js';
import { makeTracer } from '../src/debug.js';

// See https://github.com/Agoric/agoric-sdk/pull/11827
// Even though this test demonstrates a bug we have not fixed yet, we write
// it as `test`
// rather than `test.failing` because we want to document this exact buggy
// behavior until we fix it.

test('repro #11827 makeTracer breaks on null or undefined', t => {
  const trace = makeTracer('repro#11827');
  t.throws(() => trace(null, 'x'), {
    message: "Cannot read properties of null (reading 'log')",
  });
  t.throws(() => trace(undefined, 'x'), {
    message: "Cannot read properties of undefined (reading 'log')",
  });
});
