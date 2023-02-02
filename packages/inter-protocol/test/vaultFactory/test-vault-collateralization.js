import { test as unknownTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeTracer } from '@agoric/internal';
import { makeDriverContext, makeManagerDriver } from './driver.js';

/** @typedef {import('./driver.js').DriverContext & {
 * }} Context */
/** @type {import('ava').TestFn<Context>} */
const test = unknownTest;

const trace = makeTracer('TestMCR');

test.before(async t => {
  t.context = await makeDriverContext();
  trace(t, 'CONTEXT', t.context.rates);
});

test('excessive loan', async t => {
  const { aeth, run } = t.context;
  const md = await makeManagerDriver(t);

  const threshold = 453n;
  await t.notThrowsAsync(
    md.makeVaultDriver(aeth.make(100n), run.make(threshold)),
  );

  await t.throwsAsync(
    md.makeVaultDriver(aeth.make(100n), run.make(threshold + 1n)),
    {
      message: /Proposed debt.*477n.*exceeds max.*476n.*for.*100n/,
    },
  );
});
