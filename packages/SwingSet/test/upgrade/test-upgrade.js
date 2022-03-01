// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { assert } from '@agoric/assert';
import { parse } from '@endo/marshal';
import { provideHostStorage } from '../../src/controller/hostStorage.js';
import { initializeSwingset, makeSwingsetController } from '../../src/index.js';
import { capargs } from '../util.js';

function bfile(name) {
  return new URL(name, import.meta.url).pathname;
}

async function testUpgrade(t, defaultManagerType) {
  const config = {
    defaultManagerType,
    bootstrap: 'bootstrap',
    defaultReapInterval: 'never',
    vats: {
      bootstrap: { sourceSpec: bfile('bootstrap-upgrade.js') },
    },
    bundles: {
      ulrik1: { sourceSpec: bfile('vat-ulrik-1.js') },
      ulrik2: { sourceSpec: bfile('vat-ulrik-2.js') },
    },
  };

  const hostStorage = provideHostStorage();
  await initializeSwingset(config, [], hostStorage);
  const c = await makeSwingsetController(hostStorage);
  c.pinVatRoot('bootstrap');
  await c.run();

  async function run(name, args = []) {
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

  // create initial version
  await check('buildV1', [], ['v1', { youAre: 'v1' }]);

  // upgrade should work
  // await check('upgradeV2', [], ['v2', { youAre: 'v2' }]);

  // but for now, upgrade is just a stub
  await checkRejects('upgradeV2', [], { error: 'not implemented' });

  // await checkRejects(
  //   'getBundleCap',
  //   [invalidBundleID],
  //   Error('syscall.callNow failed: device.invoke failed, see logs for details'),
  // );
}

test('vat upgrade - local', async t => {
  return testUpgrade(t, 'local');
});

test('vat upgrade - xsnap', async t => {
  return testUpgrade(t, 'xs-worker');
});
