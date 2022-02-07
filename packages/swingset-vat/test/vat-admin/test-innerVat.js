// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';
// eslint-disable-next-line import/order
import bundleSource from '@endo/bundle-source';
import {
  buildKernelBundles,
  buildVatController,
  loadBasedir,
} from '../../src/index.js';

function nonBundleFunction(_E) {
  return {};
}

test.before(async t => {
  const kernelBundles = await buildKernelBundles();
  const newVatBundle = await bundleSource(
    new URL('new-vat.js', import.meta.url).pathname,
  );
  const brokenVatBundle = await bundleSource(
    new URL('broken-vat.js', import.meta.url).pathname,
  );
  const nonBundle = `${nonBundleFunction}`;
  const bundles = { newVatBundle, brokenVatBundle, nonBundle };
  t.context.data = { kernelBundles, bundles };
});

async function doTestSetup(t, mode) {
  const config = await loadBasedir(new URL('./', import.meta.url).pathname);
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
