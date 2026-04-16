import test from '@endo/ses-ava/prepare-endo.js';
import { makeTracer } from '../src/debug.js';

// See https://github.com/Agoric/agoric-sdk/pull/11847

test('fix #11847 makeTracer accepts null or undefined', t => {
  const trace = makeTracer('repro#11827');
  trace(null, 'just tracing null');
  trace(undefined, 'just tracing undefined');
  t.pass();
});
