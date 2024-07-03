// @ts-nocheck
// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

import fs from 'fs';
import bundleSource from '@endo/bundle-source';
import { assert } from '@endo/errors';
import { kunser, krefOf } from '@agoric/kmarshal';
import { initSwingStore } from '@agoric/swing-store';
import { initializeSwingset, makeSwingsetController } from '../../src/index.js';

function bfile(name) {
  return new URL(name, import.meta.url).pathname;
}

// bundle IDs are hex SHA512, so this must be 128 characters long (plus the
// 'b1-' version prefix)
const missingBundleID =
  'b1-00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
const invalidBundleID = 'b0-xx';
const bundleIDRE = new RegExp('^b1-[0-9a-f]{128}$');

// We want to test all four ways of passing a bundle into the config object:
// * .bundle: bundle object included verbatim in config
// * .bundleSpec: filename of pre-generated bundle on disk
// * .sourceSpec: filename of entry point on disk, needing to be bundled
// * .bundleName: pointer into config.bundles.NAME

// We also want to test that named bundles are available at runtime, both for
// creating vats and for evaluating within userspace.

test('bundles', async t => {
  // we provide the bootstrap vat as a pre-made bundle, to exercise
  // config.vats.NAME.bundle
  const bootstrapBundle = await bundleSource(bfile('bootstrap-bundles.js'));

  // This bundle is not a vat, it exports 'runTheCheck()', and is imported by
  // userspace. It exercises config.bundles.NAME.sourceSpec
  const importableNonVatBundleFilename = bfile('nonvat-importable.js');

  // This one (with 'hi()') provides a named vat bundle, for a static vat,
  // exercising config.vats.NAME.bundleName . We also build dynamic vats to
  // test D(devices.bundle).getNamedBundleCap and E(vatAdmin).createVatByName
  const namedBundleFilename = bfile('vat-named.js');

  // We save this vat bundle (with 'disk()') to disk, to exercise
  // config.bundles.NAME.bundleSpec
  const diskBundle = await bundleSource(bfile('vat-disk.js'));
  const diskBundleID = `b1-${diskBundle.endoZipBase64Sha512}`;
  const diskBundleFilename = bfile('bundle-disk.bundle');
  fs.writeFileSync(diskBundleFilename, JSON.stringify(diskBundle));
  t.teardown(() => fs.unlinkSync(diskBundleFilename));

  // We install this vat bundle at runtime, it provides 'runtime()'
  const installableVatBundle = await bundleSource(bfile('vat-install.js'));

  // We install this non-vat bundle at runtime, it exports 'runTheCheck()'
  const installableNonVatBundle = await bundleSource(
    bfile('nonvat-install.js'),
  );

  const config = {
    bootstrap: 'bootstrap',
    defaultReapInterval: 'never',
    vats: {
      bootstrap: {
        bundle: bootstrapBundle,
      },
      named: {
        bundleName: 'named',
      },
    },
    bundles: {
      named: {
        sourceSpec: namedBundleFilename,
      },
      disk: {
        bundleSpec: diskBundleFilename,
      },
      importableNonVat: {
        sourceSpec: importableNonVatBundleFilename,
      },
    },
  };

  const kernelStorage = initSwingStore().kernelStorage;
  await initializeSwingset(config, [], kernelStorage);
  const c = await makeSwingsetController(kernelStorage);
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');
  await c.run();

  async function run(method, args) {
    assert(Array.isArray(args));
    const kpid = c.queueToVatRoot('bootstrap', method, args);
    await c.run();
    const status = c.kpStatus(kpid);
    const result = c.kpResolution(kpid);
    return [status, kunser(result)];
  }

  async function check(name, args, expectedResult) {
    const [status, result] = await run(name, args);
    t.deepEqual([status, result], ['fulfilled', expectedResult]);
  }

  async function checkRejects(name, args, expectedResult) {
    const [status, result] = await run(name, args);
    t.deepEqual([status, result], ['rejected', expectedResult]);
  }

  // all config.vats should work
  await check('checkConfiguredVats', [undefined], ['hello']);

  // create dynamic vats from a named bundle created at config file
  await check('vatFromNamedBundleCap', ['named', 'hi'], ['hello']);

  // pre-made bundles can be loaded from disk, via a named bundle
  await check('vatFromNamedBundleCap', ['disk', 'disk'], ['otech']);

  // vatAdminService~.createVatByName() still works, TODO until we remove it
  await check('vatByName', ['named', 'hi'], ['hello']);

  await check('idByName', ['disk'], diskBundleID);

  // prints "unregistered bundle name 'missing'" to log
  await checkRejects(
    'idByName',
    ['missing'],
    Error('syscall.callNow failed: device.invoke failed, see logs for details'),
  );

  // vatAdminService~.getBundleCap(invalidBundleID) should reject
  await checkRejects(
    'getBundleCap',
    [invalidBundleID],
    Error('syscall.callNow failed: device.invoke failed, see logs for details'),
  );
  // the logs would show "not a bundleID"

  // vatAdminService~.getBundleCap(missingBundleID) should reject
  await checkRejects(
    'getBundleCap',
    [missingBundleID],
    Error(`bundleID not yet installed: ${missingBundleID}`),
  );

  const bid1 = `b1-${installableVatBundle.endoZipBase64Sha512}`;

  // vatAdminService~.getBundleCap(bid1) should reject: not installed yet
  await checkRejects(
    'getBundleCap',
    [bid1],
    Error(`bundleID not yet installed: ${bid1}`),
  );

  // vatAdminService~.waitForBundleCap(bid1) should hang until installed
  const waitKPID = c.queueToVatRoot('bootstrap', 'waitForBundleCap', [bid1]);
  await c.run();
  t.is(c.kpStatus(waitKPID), 'unresolved');

  // install a vat bundle at runtime
  const bid1a = await c.validateAndInstallBundle(installableVatBundle);
  t.is(bid1a, bid1);
  t.regex(bid1, bundleIDRE);
  await c.run();

  // so now the waitForBundleCap should be done
  t.is(c.kpStatus(waitKPID), 'fulfilled');

  // check the shape of the waitForBundleCap bundlecap
  const d1 = c.kpResolution(waitKPID);
  const res1 = kunser(d1);
  const dev1slot = krefOf(res1);
  t.regex(dev1slot, /^kd\d+$/);

  // and make sure we can load it by ID
  await check('vatFromID', [bid1, 'runtime'], ['installed']);

  // test importing a non-vat bundle, by ID
  const bid2 = await c.validateAndInstallBundle(installableNonVatBundle);
  await check('checkImportByID', [bid2], ['installable', true]);

  // test importing a named non-vat bundle
  await check('checkImportByName', ['importableNonVat'], ['importable', true]);

  // check the shape of the getBundleCap bundlecap
  const [s2, d2] = await run('getBundleCap', [bid2]);
  t.is(s2, 'fulfilled');
  const dev2slot = krefOf(d2);
  t.regex(dev2slot, /^kd\d+$/);

  // and the shape of the bundle
  const [s3, d3] = await run('getBundle', [bid2]);
  // TODO: I want to treat the bundle as a string (really bytes, eventually),
  // but importBundle() requires an object, with moduleFormat: and
  // endoZipBase64:
  t.is(s3, 'fulfilled');
  t.is(d3.moduleFormat, 'endoZipBase64');
  t.is(typeof d3.endoZipBase64, 'string');
});
