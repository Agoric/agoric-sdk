// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { assert } from '@agoric/assert';
import { parse } from '@endo/marshal';
import { getAllState } from '@agoric/swing-store';
import { provideHostStorage } from '../../src/controller/hostStorage.js';
import { parseReachableAndVatSlot } from '../../src/kernel/state/reachable.js';
import { parseVatSlot } from '../../src/lib/parseVatSlots.js';
import {
  buildKernelBundles,
  initializeSwingset,
  makeSwingsetController,
} from '../../src/index.js';
import { bundleOpts, capargs, capdataOneSlot } from '../util.js';

import { NUM_SENSORS } from './num-sensors.js';

const bfile = name => new URL(name, import.meta.url).pathname;
test.before(async t => {
  const kernelBundles = await buildKernelBundles();
  t.context.data = { kernelBundles };
});

const get = (capdata, propname) => {
  const body = JSON.parse(capdata.body);
  const value = body[propname];
  if (typeof value === 'object' && value['@qclass'] === 'slot') {
    return ['slot', capdata.slots[value.index]];
  }
  return value;
};

const getRetained = (capdata, propname) => {
  const body = JSON.parse(capdata.body);
  const value = body.retain[propname];
  if (typeof value === 'object' && value['@qclass'] === 'slot') {
    return ['slot', capdata.slots[value.index]];
  }
  return value;
};

const getImportSensorKref = (impcapdata, i) => {
  const body = JSON.parse(impcapdata.body);
  const value = body[i];
  if (typeof value === 'object' && value['@qclass'] === 'slot') {
    return ['slot', impcapdata.slots[value.index]];
  }
  return value;
};

// eslint-disable-next-line no-unused-vars
const dumpState = (hostStorage, vatID) => {
  const s = getAllState(hostStorage).kvStuff;
  const keys = Array.from(Object.keys(s)).sort();
  for (const k of keys) {
    if (k.startsWith(`${vatID}.vs.`)) {
      console.log(k, s[k]);
    }
  }
};

const testUpgrade = async (t, defaultManagerType) => {
  const config = {
    includeDevDependencies: true, // for vat-data
    defaultManagerType,
    bootstrap: 'bootstrap',
    // defaultReapInterval: 'never',
    // defaultReapInterval: 1,
    vats: {
      bootstrap: { sourceSpec: bfile('bootstrap-upgrade.js') },
    },
    bundles: {
      ulrik1: { sourceSpec: bfile('vat-ulrik-1.js') },
      ulrik2: { sourceSpec: bfile('vat-ulrik-2.js') },
    },
  };

  const hostStorage = provideHostStorage();
  const { kvStore } = hostStorage;
  const { initOpts, runtimeOpts } = bundleOpts(t.context.data);
  await initializeSwingset(config, [], hostStorage, initOpts);
  const c = await makeSwingsetController(hostStorage, {}, runtimeOpts);
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');
  await c.run();

  const run = async (method, args = []) => {
    assert(Array.isArray(args));
    const kpid = c.queueToVatRoot('bootstrap', method, args);
    await c.run();
    const status = c.kpStatus(kpid);
    const capdata = c.kpResolution(kpid);
    return [status, capdata];
  };

  const mcd = await run('getMarker');
  t.is(mcd[0], 'fulfilled');
  const markerKref = mcd[1].slots[0]; // probably ko26
  t.deepEqual(mcd[1], capdataOneSlot(markerKref, 'marker'));

  // fetch all the "importSensors": exported by bootstrap, imported by
  // the upgraded vat. We'll determine their krefs and later query the
  // upgraded vat to see if it's still importing them or not
  const [impstatus, impcapdata] = await run('getImportSensors', []);
  t.is(impstatus, 'fulfilled');
  const impKrefs = ['skip0'];
  for (let i = 1; i < NUM_SENSORS + 1; i += 1) {
    impKrefs.push(getImportSensorKref(impcapdata, i)[1]);
  }

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

  // grab exports to deduce durable/virtual vrefs
  t.is(getRetained(v1capdata, 'dur1')[0], 'slot');
  const dur1Kref = getRetained(v1capdata, 'dur1')[1];
  t.is(getRetained(v1capdata, 'vir2')[0], 'slot');
  const vir2Kref = getRetained(v1capdata, 'vir2')[1];
  const vir5Kref = getRetained(v1capdata, 'vir5')[1];
  const vir7Kref = getRetained(v1capdata, 'vir7')[1];

  const vatID = kvStore.get(`${dur1Kref}.owner`); // probably v6
  const getVref = kref => {
    const s = kvStore.get(`${vatID}.c.${kref}`);
    return parseReachableAndVatSlot(s).vatSlot;
  };
  // const krefReachable = kref => {
  //   const s = kvStore.get(`${vatID}.c.${kref}`);
  //   return !!(s && parseReachableAndVatSlot(s).isReachable);
  // };

  // We look in the vat's vatstore to see if the virtual/durable
  // object exists or not (as a state record).
  const vomHas = vref => {
    return kvStore.has(`${vatID}.vs.vom.${vref}`);
  };

  // dumpState(hostStorage, vatID);

  // deduce exporter vrefs for all durable/virtual objects, and assert
  // that they're still in DB
  const dur1Vref = getVref(dur1Kref);
  t.is(parseVatSlot(dur1Vref).subid, 1n);
  const durBase = dur1Vref.slice(0, dur1Vref.length - 2);
  const durVref = i => {
    return `${durBase}/${i}`;
  };
  const vir2Vref = getVref(vir2Kref);
  t.is(parseVatSlot(vir2Vref).subid, 2n);
  const virBase = vir2Vref.slice(0, vir2Vref.length - 2);
  const virVref = i => {
    return `${virBase}/${i}`;
  };

  t.true(vomHas(durVref(1)));
  t.true(vomHas(virVref(2)));
  t.false(vomHas(virVref(1))); // deleted before upgrade
  t.false(vomHas(durVref(2))); // deleted before upgrade

  // remember krefs for the exported objects so we can check their
  // abandonment
  const retainedNames = 'dur1 vir2 vir5 vir7 vc1 vc3 dc4 rem1 rem2 rem3';
  const retainedKrefs = {};
  for (const name of retainedNames.split(' ')) {
    const d = getRetained(v1capdata, name);
    t.is(d[0], 'slot');
    retainedKrefs[name] = d[1];
  }

  // now perform the upgrade
  // console.log(`-- starting upgradeV2`);

  const [v2status, v2capdata] = await run('upgradeV2', []);
  t.is(v2status, 'fulfilled');
  t.deepEqual(get(v2capdata, 'version'), 'v2');
  t.deepEqual(get(v2capdata, 'youAre'), 'v2');
  t.deepEqual(get(v2capdata, 'marker'), ['slot', markerKref]);
  t.deepEqual(get(v2capdata, 'data'), ['some', 'data']);
  const remoerr = parse(JSON.stringify(get(v2capdata, 'remoerr')));
  t.deepEqual(remoerr, Error('vat terminated'));

  // the old version's non-durable promises should be rejected
  t.is(c.kpStatus(v1p1Kref), 'rejected');
  const vatUpgradedError = capargs('vat upgraded');
  t.deepEqual(c.kpResolution(v1p1Kref), vatUpgradedError);
  t.is(c.kpStatus(v1p2Kref), 'rejected');
  t.deepEqual(c.kpResolution(v1p2Kref), vatUpgradedError);

  // dumpState(hostStorage, vatID);

  // all the merely-virtual exports should be gone
  // for (let i = 1; i < NUM_SENSORS + 1; i += 1) {
  //   t.false(vomHas(virVref(i)));
  // }

  /* Disabling this portion of the test as it is irrelevant and non-working so
     long as non-durable object cleanup in stop-vat is also disabled.

  // of the durables, only these survive
  const survivingDurables = [
    1, 16, 17, 18, 19, 20, 26, 27, 28, 33, 34, 35, 36, 37,
  ];
  // and these imports (imp38 is held by baggage)
  const survivingImported = [
    1, 16, 17, 18, 19, 20, 26, 27, 28, 33, 34, 35, 36, 37, 38,
  ];

  // but implementation limitations/bugs cause the following unwanted
  // effects (these adjustments should be deleted as we fix them):

  // stopVat() uses deleteVirtualObjectsWithoutDecref, rather than
  // deleteVirtualObjectsWithDecref, which means lingering virtual
  // objects (i.e. cycles) don't drop their referenced objects as we
  // delete them
  survivingDurables.push(9);
  survivingImported.push(7);
  survivingImported.push(8);
  survivingImported.push(9);

  // When a virtual collection is deleted, the loop that deletes all
  // entries will re-instantiate all the keys, but doesn't set
  // doMoreGC, so processDeadSet doesn't redo the gcAndFinalize, and
  // the virtual object cache is probably still holding onto the new
  // Representative anyways. This retains the durables that were held
  // by deleted collections (dur10/dur13/dur23, depending on the cache
  // size, just dur23 if size=0) and the imports they hold. Bug #5053
  // is about fixing clearInternal to avoid this, when that's fixed
  // these should be removed.
  survivingDurables.push(10);
  survivingImported.push(10);
  survivingDurables.push(13);
  survivingImported.push(13);
  survivingDurables.push(23);
  survivingImported.push(23);

  for (let i = 1; i < NUM_SENSORS + 1; i += 1) {
    const vref = durVref(i);
    const impKref = impKrefs[i];
    const expD = survivingDurables.includes(i);
    const expI = survivingImported.includes(i);
    const reachable = krefReachable(impKref);
    t.is(vomHas(vref), expD, `dur[${i}] not ${expD}`);
    t.is(reachable, expI, `imp[${i}] not ${expI}`);
    // const abb = (b) => b.toString().slice(0,1).toUpperCase();
    // const vomS = `vom: ${abb(expD)} ${abb(vomHas(vref))}`;
    // const reachS = `${abb(expI)} ${abb(reachable)}`;
    // const match = (expD === vomHas(vref)) && (expI === reachable);
    // const matchS = `${match ? 'true' : 'FALSE'}`;
    // const s = kvStore.get(`${vatID}.c.${impKref}`);
    // console.log(`${i}: ${vomS} imp: ${reachS} ${matchS}  ${impKref} ${s}`);
  }
  */

  // check koNN.owner to confirm the exported virtuals (2/5/7) are abandoned
  t.false(kvStore.has(`${vir2Kref}.owner`));
  t.false(kvStore.has(`${vir5Kref}.owner`));
  t.false(kvStore.has(`${vir7Kref}.owner`));
};

test('vat upgrade - local', async t => {
  return testUpgrade(t, 'local');
});

test('vat upgrade - xsnap', async t => {
  return testUpgrade(t, 'xs-worker');
});

test('vat upgrade - omit vatParameters', async t => {
  const config = {
    includeDevDependencies: true, // for vat-data
    defaultManagerType: 'xs-worker',
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
  const { initOpts, runtimeOpts } = bundleOpts(t.context.data);
  await initializeSwingset(config, [], hostStorage, initOpts);
  const c = await makeSwingsetController(hostStorage, {}, runtimeOpts);
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');
  await c.run();

  const run = async (name, args = []) => {
    assert(Array.isArray(args));
    const kpid = c.queueToVatRoot('bootstrap', name, args);
    await c.run();
    const status = c.kpStatus(kpid);
    const capdata = c.kpResolution(kpid);
    return [status, capdata];
  };

  // create initial version
  const [status, capdata] = await run('doUpgradeWithoutVatParameters', []);
  t.is(status, 'fulfilled');
  t.deepEqual(JSON.parse(capdata.body), [
    { '@qclass': 'undefined' },
    { '@qclass': 'undefined' },
  ]);
});

test('failed upgrade - relaxed durable rules', async t => {
  const config = {
    relaxDurabilityRules: true,
    includeDevDependencies: true, // for vat-data
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: { sourceSpec: bfile('bootstrap-upgrade.js') },
    },
    bundles: {
      ulrik1: { sourceSpec: bfile('vat-ulrik-1.js') },
      ulrik2: { sourceSpec: bfile('vat-ulrik-2.js') },
    },
  };

  const hostStorage = provideHostStorage();
  const { initOpts, runtimeOpts } = bundleOpts(t.context.data);
  await initializeSwingset(config, [], hostStorage, initOpts);
  const c = await makeSwingsetController(hostStorage, {}, runtimeOpts);
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');
  await c.run();

  const run = async (method, args = []) => {
    assert(Array.isArray(args));
    const kpid = c.queueToVatRoot('bootstrap', method, args);
    await c.run();
    const status = c.kpStatus(kpid);
    const capdata = c.kpResolution(kpid);
    return [status, capdata];
  };

  // create initial version
  const [v1status] = await run('buildV1', []);
  t.is(v1status, 'fulfilled');

  // upgrade should fail
  const [v2status, v2capdata] = await run('upgradeV2', []);
  t.is(v2status, 'rejected');
  const e = parse(v2capdata.body);
  t.truthy(e instanceof Error);
  t.regex(e.message, /vat-upgrade failure/);
});

test('failed upgrade - lost kind', async t => {
  const config = {
    includeDevDependencies: true, // for vat-data
    defaultManagerType: 'xs-worker',
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
  const { initOpts, runtimeOpts } = bundleOpts(t.context.data);
  await initializeSwingset(config, [], hostStorage, initOpts);
  const c = await makeSwingsetController(hostStorage, {}, runtimeOpts);
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');
  await c.run();

  const run = async (method, args = []) => {
    assert(Array.isArray(args));
    const kpid = c.queueToVatRoot('bootstrap', method, args);
    await c.run();
    const status = c.kpStatus(kpid);
    const capdata = c.kpResolution(kpid);
    return [status, capdata];
  };

  // create initial version
  const [v1status] = await run('buildV1WithLostKind', []);
  t.is(v1status, 'fulfilled');

  // upgrade should fail
  console.log(`note: expect a 'defineDurableKind not called' error below`);
  console.log(`also: 'vat-upgrade failure notification not implemented'`);
  const [v2status, v2capdata] = await run('upgradeV2WhichLosesKind', []);
  t.is(v2status, 'rejected');
  const e = parse(v2capdata.body);
  t.truthy(e instanceof Error);
  t.regex(e.message, /vat-upgrade failure/);
  // TODO: who should see the details of what v2 did wrong? calling
  // vat? only the console?
});

test('failed upgrade - unknown options', async t => {
  const config = {
    includeDevDependencies: true, // for vat-data
    defaultManagerType: 'xs-worker',
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
  const { initOpts, runtimeOpts } = bundleOpts(t.context.data);
  await initializeSwingset(config, [], hostStorage, initOpts);
  const c = await makeSwingsetController(hostStorage, {}, runtimeOpts);
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');
  await c.run();

  const run = async (name, args = []) => {
    assert(Array.isArray(args));
    const kpid = c.queueToVatRoot('bootstrap', name, args);
    await c.run();
    const status = c.kpStatus(kpid);
    const capdata = c.kpResolution(kpid);
    return [status, capdata];
  };

  const [status, capdata] = await run('doUpgradeWithBadOption', []);
  t.is(status, 'rejected');
  const e = parse(capdata.body);
  t.truthy(e instanceof Error);
  t.regex(e.message, /upgrade\(\) received unknown options: bad/);
});
