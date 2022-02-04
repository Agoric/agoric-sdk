// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import bundleSource from '@endo/bundle-source';
import { buildVatController } from '../../src/index.js';
import { computeBundleID } from '../../src/validate-archive.js';

test('install bundle', async t => {
  const config = {};
  const controller = await buildVatController(config);
  await controller.run();

  const bundleFile = new URL('./bootstrap-bundles.js', import.meta.url)
    .pathname;
  const bundle = await bundleSource(bundleFile);
  const bundleID = await computeBundleID(bundle);

  const bid2 = await controller.validateAndInstallBundle(bundle, bundleID);
  t.is(bid2, bundleID);

  // installing the same bundle twice is a NOP
  const bid3 = await controller.validateAndInstallBundle(bundle, bundleID);
  t.is(bid3, bundleID);
});

test('install bundle without ID', async t => {
  const config = {};
  const controller = await buildVatController(config);
  await controller.run();

  const bundleFile = new URL('./bootstrap-bundles.js', import.meta.url)
    .pathname;
  const bundle = await bundleSource(bundleFile);
  const bundleID = await computeBundleID(bundle);

  const bid2 = await controller.validateAndInstallBundle(bundle);
  t.is(bid2, bundleID);
});

test('install invalid bundle fails', async t => {
  const config = {};
  const controller = await buildVatController(config);
  await controller.run();

  const bundleFile = new URL('./bootstrap-bundles.js', import.meta.url)
    .pathname;
  const bundle = await bundleSource(bundleFile);
  const wrong =
    'b1-00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
  await t.throwsAsync(
    () => controller.validateAndInstallBundle(bundle, wrong),
    {
      message:
        /alleged bundleID b1-[0-9a-f]{128} does not match actual b1-[0-9a-f]{128}/,
    },
  );
});
