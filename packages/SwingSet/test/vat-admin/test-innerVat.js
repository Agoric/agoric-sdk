/* global __dirname */
import '@agoric/install-metering-and-ses';
import path from 'path';
import test from 'ava';
import bundleSource from '@agoric/bundle-source';
import { buildVatController, loadBasedir } from '../../src';

function nonBundleFunction(_E) {
  return {};
}

async function doTestSetup(mode) {
  const config = await loadBasedir(__dirname);
  const newVatBundle = await bundleSource(path.join(__dirname, 'new-vat.js'));
  const brokenVatBundle = await bundleSource(
    path.join(__dirname, 'broken-vat.js'),
  );
  const nonBundle = `${nonBundleFunction}`;
  const bundles = { newVatBundle, brokenVatBundle, nonBundle };
  const c = await buildVatController(config, [mode, bundles]);
  return c;
}

test('VatAdmin inner vat creation', async t => {
  const c = await doTestSetup('newVat');
  for (let i = 0; i < 9; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await c.step();
  }
  t.deepEqual(c.dump().log, ['starting newVat test', '13']);
});

test('VatAdmin counter test', async t => {
  const c = await doTestSetup('counters');
  await c.run();
  await c.run();
  t.deepEqual(c.dump().log, ['starting counter test', '4', '9', '2']);
});

test('VatAdmin broken vat creation', async t => {
  const c = await doTestSetup('brokenVat');
  await c.run();
  t.deepEqual(c.dump().log, [
    'starting brokenVat test',
    'yay, rejected: Error: Vat Creation Error: ReferenceError: missing is not defined',
  ]);
});

test('error creating vat from non-bundle', async t => {
  const c = await doTestSetup('non-bundle');
  await c.run();
  t.deepEqual(c.dump().log, [
    'starting non-bundle test',
    'yay, rejected: Error: Vat Creation Error: TypeError: vat creation requires a bundle, not a plain string',
  ]);
  await c.run();
});

test('VatAdmin get vat stats', async t => {
  const c = await doTestSetup('vatStats');
  await c.run();
  t.deepEqual(c.dump().log, [
    'starting stats test',
    '{"deviceCount":0,"objectCount":0,"promiseCount":0,"transcriptCount":0}',
    '4',
    '{"deviceCount":0,"objectCount":0,"promiseCount":2,"transcriptCount":2}',
  ]);
  await c.run();
});
