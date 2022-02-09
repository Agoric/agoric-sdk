// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';
// eslint-disable-next-line import/order
import bundleSource from '@endo/bundle-source';
import { parse } from '@endo/marshal';
import {
  buildKernelBundles,
  buildVatController,
  loadBasedir,
} from '../../src/index.js';
import { capargs } from '../util.js';

function nonBundleFunction(_E) {
  return {};
}

test.before(async t => {
  const kernelBundles = await buildKernelBundles();
  const vat13Bundle = await bundleSource(
    new URL('new-vat-13.js', import.meta.url).pathname,
  );
  const vat44Bundle = await bundleSource(
    new URL('new-vat-44.js', import.meta.url).pathname,
  );
  const brokenVatBundle = await bundleSource(
    new URL('broken-vat.js', import.meta.url).pathname,
  );
  const nonBundle = `${nonBundleFunction}`;
  const bundles = { vat13Bundle, vat44Bundle, brokenVatBundle, nonBundle };
  t.context.data = { kernelBundles, bundles };
});

async function doTestSetup(t) {
  const { bundles, kernelBundles } = t.context.data;
  const config = await loadBasedir(new URL('./', import.meta.url).pathname);
  config.bundles = {
    new13: { bundle: bundles.vat13Bundle },
    broken: { bundle: bundles.brokenVatBundle },
  };
  const c = await buildVatController(config, [], { kernelBundles });
  const id44 = await c.validateAndInstallBundle(bundles.vat44Bundle);
  c.pinVatRoot('bootstrap');
  await c.run();
  return { c, id44, vat13Bundle: bundles.vat13Bundle };
}

test('createVatByBundle', async t => {
  const { c, vat13Bundle } = await doTestSetup(t);
  const kpid = c.queueToVatRoot(
    'bootstrap',
    'byBundle',
    capargs([vat13Bundle]),
  );
  await c.run();
  t.deepEqual(JSON.parse(c.kpResolution(kpid).body), 13);
});

test('createVatByName', async t => {
  const { c } = await doTestSetup(t);
  const kpid = c.queueToVatRoot('bootstrap', 'byName', capargs(['new13']));
  await c.run();
  t.deepEqual(JSON.parse(c.kpResolution(kpid).body), 13);
});

test('createVat by named bundlecap', async t => {
  const { c } = await doTestSetup(t);
  const kpid = c.queueToVatRoot(
    'bootstrap',
    'byNamedBundleCap',
    capargs(['new13']),
  );
  await c.run();
  t.deepEqual(JSON.parse(c.kpResolution(kpid).body), 13);
});

test('createVat by ID', async t => {
  const { c, id44 } = await doTestSetup(t);
  const kpid = c.queueToVatRoot('bootstrap', 'byID', capargs([id44]));
  await c.run();
  t.deepEqual(JSON.parse(c.kpResolution(kpid).body), 44);
});

test('counter test', async t => {
  const { c } = await doTestSetup(t);
  const kpid = c.queueToVatRoot('bootstrap', 'counters', capargs(['new13']));
  await c.run();
  t.deepEqual(JSON.parse(c.kpResolution(kpid).body), [4, 9, 2]);
});

test('broken vat creation fails', async t => {
  const { c } = await doTestSetup(t);
  const kpid = c.queueToVatRoot('bootstrap', 'brokenVat', capargs(['broken']));
  await c.run();
  t.is(c.kpStatus(kpid), 'rejected');
  const res = parse(c.kpResolution(kpid).body);
  t.truthy(res instanceof Error);
  // 'Vat Creation Error: ReferenceError: missing is not defined' on node
  // 'Vat Creation Error: Error: setBundle failed: "ReferenceError":
  // "buildRootObject: get missing: undefined variable"' on XS
  t.regex(res.message, /Vat Creation Error/);
  t.regex(res.message, /ReferenceError/);
  t.regex(res.message, /missing/);
});

test('error creating vat from non-bundle', async t => {
  const { c } = await doTestSetup(t);
  const kpid = c.queueToVatRoot('bootstrap', 'nonBundleCap', capargs([]));
  await c.run();
  t.is(c.kpStatus(kpid), 'rejected');
  t.deepEqual(
    parse(c.kpResolution(kpid).body),
    Error('Vat Creation Error: createVat() requires a bundlecap'),
  );
});
