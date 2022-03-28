// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { assert } from '@agoric/assert';
import { provideHostStorage } from '../../src/controller/hostStorage.js';
import { initializeSwingset, makeSwingsetController } from '../../src/index.js';
import { capargs, capSlot, capdataOneSlot } from '../util.js';

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

  const mcd = await run('getMarker');
  t.is(mcd[0], 'fulfilled');
  const markerKref = mcd[1].slots[0]; // probably ko26
  t.deepEqual(mcd[1], capdataOneSlot(markerKref, 'marker'));
  const marker = capSlot(0, 'marker');

  // create initial version
  const [v1status, v1capdata] = await run('buildV1', []);
  t.is(v1status, 'fulfilled');
  t.deepEqual(JSON.parse(v1capdata.body), ['v1', { youAre: 'v1', marker }]);
  t.deepEqual(v1capdata.slots, [markerKref]);

  // upgrade should work
  const [v2status, v2capdata] = await run('upgradeV2', []);
  t.is(v2status, 'fulfilled');
  t.deepEqual(JSON.parse(v2capdata.body), ['v2', { youAre: 'v2', marker }]);
  t.deepEqual(v2capdata.slots, [markerKref]);
}

test('vat upgrade - local', async t => {
  return testUpgrade(t, 'local');
});

test('vat upgrade - xsnap', async t => {
  return testUpgrade(t, 'xs-worker');
});
