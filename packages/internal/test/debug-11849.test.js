import test from '@endo/ses-ava/prepare-endo.js';
import { makeTracer } from '../src/debug.js';

const testTracer = (tracer, ...args) => {
  let capturedKey = 'none';
  const allegedT = harden({
    log(key, ..._) {
      capturedKey = key;
    },
  });
  tracer(allegedT, ...args);
  return capturedKey;
};

// See https://github.com/Agoric/agoric-sdk/issues/11849
test('test makeTracer sub-tracers', t => {
  // Example from the original slack conversation.
  const trace = makeTracer('PortC');
  const trace2 = trace.sub('portfolio23');
  const trace3 = trace2.sub('flow3');
  t.is(testTracer(trace3), '----- PortC.portfolio23.flow3,3 ');

  const trace4 = trace2.sub('flow4');
  t.is(testTracer(trace4), '----- PortC.portfolio23.flow4,4 ');
  t.is(testTracer(trace2), '----- PortC.portfolio23,2 ');

  const trace5 = trace.sub('portfolio45', false);
  // `false` means nothing was reported, so testTracer returns `'none'`
  t.is(testTracer(trace5), 'none');

  const trace6 = trace5.sub('sub6');
  // `enable` defaults to parent, which is false, so nothing reported again
  t.is(testTracer(trace6), 'none');

  const trace7 = trace5.sub('sub7', true);
  t.is(testTracer(trace7), '----- PortC.portfolio45.sub7,7 ');

  const trace8 = trace5.sub('sub8', 'verbose');

  // `'verbose'` means report to `console.info`, not `allegedT`
  // You should see
  // ```
  // ----- PortC.portfolio45.sub8,8
  // ```
  // on the console output
  t.is(testTracer(trace8), 'none');
});
