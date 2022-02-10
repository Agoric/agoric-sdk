// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import fs from 'fs';
import bundleSource from '@endo/bundle-source';
import { assert } from '@agoric/assert';
import { parse } from '@endo/marshal';
import { provideHostStorage } from '../../src/hostStorage.js';
import { initializeSwingset, makeSwingsetController } from '../../src/index.js';
import { capargs } from '../util.js';

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
  const diskBundleFilename = bfile('disk-bundle'); // in .gitignore
  fs.writeFileSync(diskBundleFilename, JSON.stringify(diskBundle));

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

  const hostStorage = provideHostStorage();
  await initializeSwingset(config, [], hostStorage);
  const c = await makeSwingsetController(hostStorage);
  c.pinVatRoot('bootstrap');
  await c.run();

  async function run(name, args) {
    assert(Array.isArray(args));
    const kpid = c.queueToVatRoot('bootstrap', name, capargs(args));
    await c.run();
    const status = c.kpStatus(kpid);
    const capdata = c.kpResolution(kpid);
    return [status, capdata];
  }

  async function check(name, args, expectedResult) {
    const [status, capdata] = await run(name, args);
    const result = parse(capdata.body);
    t.deepEqual([status, result], ['fulfilled', expectedResult]);
  }

  async function checkRejects(name, args, expectedResult) {
    const [status, capdata] = await run(name, args);
    const result = parse(capdata.body);
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

  // D(devices.bundle).getBundleCap(invalidBundleID) should throw
  await checkRejects(
    'getBundleCap',
    [invalidBundleID],
    Error('syscall.callNow failed: device.invoke failed, see logs for details'),
  );
  // the logs would show "not a bundleID"

  // D(devices.bundle).getBundleCap(missingBundleID) should return undefined
  await check('getBundleCap', [missingBundleID], undefined);

  // install a vat bundle at runtime, make sure we can load it by ID
  const bid1 = await c.validateAndInstallBundle(installableVatBundle);
  t.regex(bid1, bundleIDRE);
  await check('vatFromID', [bid1, 'runtime'], ['installed']);

  // test importing a non-vat bundle, by ID
  const bid2 = await c.validateAndInstallBundle(installableNonVatBundle);
  await check('checkImportByID', [bid2], ['installable', true]);

  // test importing a named non-vat bundle
  await check('checkImportByName', ['importableNonVat'], ['importable', true]);

  // check the shape of a bundlecap
  const [s1, d1] = await run('getBundleCap', [bid2]);
  t.is(s1, 'fulfilled');
  const res1 = JSON.parse(d1.body);
  const dev1 = { '@qclass': 'slot', iface: 'Alleged: device node', index: 0 };
  t.deepEqual(res1, dev1);
  const slots1 = d1.slots;
  const dev1slot = slots1[0];
  t.regex(dev1slot, /^kd\d+$/);
  t.is(slots1[0], dev1slot);

  // and the shape of the bundle
  const [s2, d2] = await run('getBundle', [bid2]);
  // TODO: I want to treat the bundle as a string (really bytes, eventually),
  // but importBundle() requires an object, with moduleFormat: and
  // endoZipBase64:
  t.is(s2, 'fulfilled');
  const res2 = parse(d2.body);
  t.is(res2.moduleFormat, 'endoZipBase64');
  t.is(typeof res2.endoZipBase64, 'string');
});
