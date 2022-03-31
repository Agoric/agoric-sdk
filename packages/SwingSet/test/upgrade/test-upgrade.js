// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { assert } from '@agoric/assert';
import { provideHostStorage } from '../../src/controller/hostStorage.js';
import { initializeSwingset, makeSwingsetController } from '../../src/index.js';
import { capargs, capdataOneSlot } from '../util.js';

function bfile(name) {
  return new URL(name, import.meta.url).pathname;
}

function get(capdata, propname) {
  const body = JSON.parse(capdata.body);
  const value = body[propname];
  if (typeof value === 'object' && value['@qclass'] === 'slot') {
    return ['slot', capdata.slots[value.index]];
  }
  return value;
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

  // create initial version
  const [v1status, v1capdata] = await run('buildV1', []);
  t.is(v1status, 'fulfilled');
  t.deepEqual(get(v1capdata, 'version'), 'v1');
  t.deepEqual(get(v1capdata, 'youAre'), 'v1');
  t.deepEqual(get(v1capdata, 'marker'), ['slot', markerKref]);
  t.deepEqual(get(v1capdata, 'data'), ['some', 'data']);
  // grab the promises that should be rejected
  t.is(get(v1capdata, 'p1')[0], 'slot');
  const v1p1Kref = get(v1capdata, 'p1')[1];
  t.is(get(v1capdata, 'p2')[0], 'slot');
  const v1p2Kref = get(v1capdata, 'p2')[1];

  // upgrade should work
  const [v2status, v2capdata] = await run('upgradeV2', []);
  t.is(v2status, 'fulfilled');
  t.deepEqual(get(v2capdata, 'version'), 'v2');
  t.deepEqual(get(v2capdata, 'youAre'), 'v2');
  t.deepEqual(get(v2capdata, 'marker'), ['slot', markerKref]);
  t.deepEqual(get(v2capdata, 'data'), ['some', 'data']);

  // the old version's non-durable promises should be rejected
  t.is(c.kpStatus(v1p1Kref), 'rejected');
  t.deepEqual(c.kpResolution(v1p1Kref), capargs('vat upgraded'));
  t.is(c.kpStatus(v1p2Kref), 'rejected');
  t.deepEqual(c.kpResolution(v1p2Kref), capargs('vat upgraded'));
}

test('vat upgrade - local', async t => {
  return testUpgrade(t, 'local');
});

test('vat upgrade - xsnap', async t => {
  return testUpgrade(t, 'xs-worker');
});
