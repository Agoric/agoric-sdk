// eslint-disable-next-line import/order
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
// eslint-disable-next-line import/order
import path from 'path';
import bundleSource from '@endo/bundle-source';
import {
  buildKernelBundles,
  buildVatController,
  loadBasedir,
} from '@agoric/swingset-vat';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

test.before(async t => {
  const kernelBundles = await buildKernelBundles();
  const trivialFn = path.resolve(dirname, 'trivial.js');
  const trivialBundle = await bundleSource(trivialFn);
  t.context.data = { kernelBundles, trivialBundle };
});

async function main(t, mode) {
  const config = await loadBasedir(dirname);
  config.defaultManagerType = 'xs-worker';
  const { kernelBundles, trivialBundle } = t.context.data;
  const argv = [mode, trivialBundle];
  const controller = await buildVatController(config, argv, { kernelBundles });
  await controller.run();
  return controller.dump();
}

const contractTrivialGolden = [
  'starting trivialContractTest',
  'terms are: terms were: terms are provided',
  'eight is: 8',
  '++ DONE',
];
test('trivial', async t => {
  const dump = await main(t, 'trivial');
  t.deepEqual(dump.log, contractTrivialGolden);
});

const contractExhaustedGolden = [
  'starting exhaustedContractTest',
  'loop1 failed: Error: vat terminated',
  'loop2: spawned without error',
  'loop2 dead: Error: vat terminated',
];

test('exhaustion', async t => {
  const dump = await main(t, 'exhaust');
  t.deepEqual(dump.log, contractExhaustedGolden);
});

const farFailureGolden = [
  'starting farFailureContractTest',
  'send non-Far: Error: Remotables must be explicitly declared: {"failureArg":"[Function failureArg]"}',
  'far failure: Error: Remotables must be explicitly declared: {"failureReturn":"[Function failureReturn]"}',
  '++ DONE',
];

test('farFailure', async t => {
  const dump = await main(t, 'farFailure');
  t.deepEqual(dump.log, farFailureGolden);
});
