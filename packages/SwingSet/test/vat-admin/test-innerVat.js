/* global __dirname */
import '@agoric/install-metering-and-ses';
import path from 'path';
import test from 'ava';
import bundleSource from '@agoric/bundle-source';
import { buildKernelBundles, buildVatController, loadBasedir } from '../../src';

function nonBundleFunction(_E) {
  return {};
}

test.before(async t => {
  const kernelBundles = await buildKernelBundles();
  const newVatBundle = await bundleSource(path.join(__dirname, 'new-vat.js'));
  const brokenVatBundle = await bundleSource(
    path.join(__dirname, 'broken-vat.js'),
  );
  const nonBundle = `${nonBundleFunction}`;
  const bundles = { newVatBundle, brokenVatBundle, nonBundle };
  t.context.data = { kernelBundles, bundles };
});

async function doTestSetup(t, mode) {
  const config = await loadBasedir(__dirname);
  const { bundles, kernelBundles } = t.context.data;
  const c = await buildVatController(config, [mode, bundles], {
    kernelBundles,
  });
  return c;
}

test('VatAdmin inner vat creation', async t => {
  const c = await doTestSetup(t, 'newVat');
  await c.run();
  t.deepEqual(c.dump().log, ['starting newVat test', '13']);
});

test('VatAdmin counter test', async t => {
  const c = await doTestSetup(t, 'counters');
  await c.run();
  await c.run();
  t.deepEqual(c.dump().log, ['starting counter test', '4', '9', '2']);
});

test('VatAdmin broken vat creation', async t => {
  const c = await doTestSetup(t, 'brokenVat');
  await c.run();
  const { log } = c.dump();
  t.is(log.length, 2);
  t.is(log[0], 'starting brokenVat test');
  t.regex(
    log[1],
    /^yay, rejected: Error: Vat Creation Error:.*ReferenceError.*missing/,
  );
});

test('error creating vat from non-bundle', async t => {
  const c = await doTestSetup(t, 'non-bundle');
  await c.run();
  t.deepEqual(c.dump().log, [
    'starting non-bundle test',
    'yay, rejected: Error: Vat Creation Error: TypeError: vat creation requires a bundle, not a plain string',
  ]);
  await c.run();
});

test('VatAdmin get vat stats', async t => {
  const c = await doTestSetup(t, 'vatStats');
  await c.run();
  t.deepEqual(c.dump().log, [
    'starting stats test',
    '{"deviceCount":0,"objectCount":0,"promiseCount":0,"transcriptCount":0}',
    '4',
    '{"deviceCount":0,"objectCount":0,"promiseCount":2,"transcriptCount":2}',
  ]);
  await c.run();
});
