/* global __dirname */
// TODO Remove babel-standalone preinitialization
// https://github.com/endojs/endo/issues/768
import '@agoric/babel-standalone';
import '@agoric/install-metering-and-ses';
import test from 'ava';
import path from 'path';
import bundleSource from '@agoric/bundle-source';
import {
  buildKernelBundles,
  buildVatController,
  loadBasedir,
} from '@agoric/swingset-vat';

test.before(async t => {
  const kernelBundles = await buildKernelBundles();
  const trivialFn = path.resolve(__dirname, 'trivial.js');
  const trivialBundle = await bundleSource(trivialFn);
  t.context.data = { kernelBundles, trivialBundle };
});

async function main(t, mode) {
  const config = await loadBasedir(__dirname);
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
