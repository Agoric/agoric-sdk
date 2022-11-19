// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { assert } from '@agoric/assert';
import bundleSource from '@endo/bundle-source';
import { getAllState } from '@agoric/swing-store';
import { provideHostStorage } from '../../src/controller/hostStorage.js';
import { parseReachableAndVatSlot } from '../../src/kernel/state/reachable.js';
import { parseVatSlot } from '../../src/lib/parseVatSlots.js';
import { kunser, krefOf } from '../../src/lib/kmarshal.js';
import {
  buildKernelBundles,
  initializeSwingset,
  makeSwingsetController,
} from '../../src/index.js';
import { bundleOpts, restartVatAdminVat } from '../util.js';

// import { NUM_SENSORS } from './num-sensors.js';

const bfile = name => new URL(name, import.meta.url).pathname;
test.before(async t => {
  const kernelBundles = await buildKernelBundles();
  t.context.data = { kernelBundles };
});

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

const testUpgrade = async (
  t,
  defaultManagerType,
  doVatAdminRestart = false,
) => {
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
    const result = c.kpResolution(kpid);
    return [status, result];
  };

  const mcd = await run('getMarker');
  t.is(mcd[0], 'fulfilled');
  const marker = kunser(mcd[1]); // probably ko26
  t.is(marker.iface(), 'marker');

  // fetch all the "importSensors": exported by bootstrap, imported by
  // the upgraded vat. We'll determine their krefs and later query the
  // upgraded vat to see if it's still importing them or not
  const [impstatus, impresult] = await run('getImportSensors', []);
  t.is(impstatus, 'fulfilled');
  // eslint-disable-next-line no-unused-vars
  const impKrefs = ['skip0', ...kunser(impresult).slice(1).map(krefOf)];

  if (doVatAdminRestart) {
    await restartVatAdminVat(c);
  }

  // create initial version
  const [v1status, v1resultEnc] = await run('buildV1', []);
  const v1result = kunser(v1resultEnc);
  t.is(v1status, 'fulfilled');
  t.is(v1result.version, 'v1');
  t.is(v1result.youAre, 'v1');
  t.truthy(krefOf(v1result.marker));
  t.truthy(krefOf(marker));
  t.is(krefOf(v1result.marker), krefOf(marker));
  t.is(v1result.marker.iface(), 'marker');
  t.deepEqual(v1result.data, ['some', 'data']);
  // grab the promises that should be rejected
  const v1p1Kref = krefOf(v1result.p1);
  const v1p2Kref = krefOf(v1result.p2);
  t.truthy(v1p1Kref);
  t.truthy(v1p2Kref);

  // grab exports to deduce durable/virtual vrefs
  const dur1Kref = krefOf(v1result.retain.dur1);
  const vir2Kref = krefOf(v1result.retain.vir2);
  const vir5Kref = krefOf(v1result.retain.vir5);
  const vir7Kref = krefOf(v1result.retain.vir7);
  t.truthy(dur1Kref);
  t.truthy(vir2Kref);
  t.truthy(vir5Kref);
  t.truthy(vir7Kref);

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
    retainedKrefs[name] = krefOf(v1result.retain[name]);
  }

  if (doVatAdminRestart) {
    await restartVatAdminVat(c);
  }

  // now perform the upgrade
  // console.log(`-- starting upgradeV2`);

  const [v2status, v2resultEnc] = await run('upgradeV2', []);
  const v2result = kunser(v2resultEnc);
  t.is(v2status, 'fulfilled');
  t.deepEqual(v2result.version, 'v2');
  t.deepEqual(v2result.youAre, 'v2');
  t.deepEqual(krefOf(v2result.marker), krefOf(marker));
  t.deepEqual(v2result.data, ['some', 'data']);
  t.deepEqual(v2result.upgradeResult, { incarnationNumber: 2 });
  t.deepEqual(v2result.remoerr, Error('vat terminated'));

  // newDur() (the first Durandal instance created in vat-ulrik-2)
  // should get a new vref, because the per-Kind instance counter
  // should persist and pick up where it left off. If that was broken,
  // newDur would have the same vref as dur1 (the first Durandal
  // instance created in vat-ulrik-1). And since it's durable, the
  // c-list entry will still exist, so we'll see the same kref as
  // before.
  const newDurKref = krefOf(v2result.newDur);
  t.not(newDurKref, dur1Kref);

  // the old version's non-durable promises should be rejected
  t.is(c.kpStatus(v1p1Kref), 'rejected');
  const vatUpgradedError = {
    name: 'vatUpgraded',
    upgradeMessage: 'test upgrade',
    incarnationNumber: 1,
  };
  t.deepEqual(kunser(c.kpResolution(v1p1Kref)), vatUpgradedError);
  t.is(c.kpStatus(v1p2Kref), 'rejected');
  t.deepEqual(kunser(c.kpResolution(v1p2Kref)), vatUpgradedError);

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
    // const impKref = impKrefs[i];
    const expD = survivingDurables.includes(i);
    // const expI = survivingImported.includes(i);
    // const reachable = krefReachable(impKref);
    t.is(vomHas(vref), expD, `dur[${i}] not ${expD}`);
    // t.is(reachable, expI, `imp[${i}] not ${expI}`);
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
  return testUpgrade(t, 'local', false);
});

test('vat upgrade - local with VA restarts', async t => {
  return testUpgrade(t, 'local', true);
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
    const result = c.kpResolution(kpid);
    return [status, result];
  };

  // create initial version
  const [status, result] = await run('doUpgradeWithoutVatParameters', []);
  t.is(status, 'fulfilled');
  t.deepEqual(kunser(result), [undefined, undefined]);
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
    const result = c.kpResolution(kpid);
    return [status, result];
  };

  // create initial version
  const [v1status] = await run('buildV1', []);
  t.is(v1status, 'fulfilled');

  // upgrade should fail
  const [v2status, v2result] = await run('upgradeV2', []);
  t.is(v2status, 'rejected');
  const e = kunser(v2result);
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
    const result = c.kpResolution(kpid);
    return [status, result];
  };

  // create initial version
  const [v1status, v1result] = await run('buildV1WithLostKind', []);
  t.is(v1status, 'fulfilled');
  t.deepEqual(kunser(v1result), ['ping 1']);

  // upgrade should fail, get rewound
  console.log(`note: expect a 'defineDurableKind not called' error below`);
  const [v2status, v2result] = await run('upgradeV2WhichLosesKind', []);
  t.is(v2status, 'fulfilled');
  const events = kunser(v2result);
  t.is(events[0], 'ping 2');

  // The v2 vat starts with a 'ping from v2' (which will be unwound).
  // Then v2 finishes startVat without reattaching all kinds, so v2 is
  // unwound.  Then the `E(ulrikAdmin).upgrade()` promise rejects,
  // pushing the error onto 'events'

  const e = events[1];
  t.truthy(e instanceof Error);
  t.regex(e.message, /vat-upgrade failure/);

  // then upgradeV2WhichLosesKind sends pingback() to the vat, which should
  // arrive on the newly-restored v1, and push 'ping 3' onto events

  t.is(events[2], 'ping 3');

  // if the failed upgrade didn't put v1 back, then the pingback()
  // will be delivered to v2, and would push 'ping 21'

  // if v1 wasn't restored properly, then the pingback() might push
  // 'ping 2' again instead of 'ping 3'

  // TODO: who should see the details of what v2 did wrong? calling
  // vat? only the console?
});

// TODO: test stopVat failure

test('failed upgrade - explode', async t => {
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
  await initializeSwingset(config, [], hostStorage);
  const c = await makeSwingsetController(hostStorage);
  c.pinVatRoot('bootstrap');
  await c.run();

  const run = async (method, args = []) => {
    assert(Array.isArray(args));
    const kpid = c.queueToVatRoot('bootstrap', method, args);
    await c.run();
    const status = c.kpStatus(kpid);
    const result = c.kpResolution(kpid);
    return [status, result];
  };

  // create initial version
  const [v1status, v1result] = await run('buildV1WithPing', []);
  t.is(v1status, 'fulfilled');
  t.deepEqual(kunser(v1result), ['hello from v1', 'ping 1']);

  // upgrade should fail, error returned in array
  const [v2status, v2result] = await run('upgradeV2WhichExplodes', []);
  t.is(v2status, 'fulfilled');
  const events = kunser(v2result);
  const e = events[0];
  t.truthy(e instanceof Error);
  t.regex(e.message, /vat-upgrade failure/);
  // bootstrap sends pingback() to the vat post-upgrade, which sends
  // back an event with the current counter value. If we restored
  // ulrik-1 correctly, we'll get '2'. If we're still talking to
  // ulrik-2, we'd see '21'. If we somehow rewound ulrik-1 to the
  // beginning, we'd see '1'.
  t.is(events[1], true); // e instanceof Error
  t.is(events[2], true); // /vat-upgrade failure/.test(e.message)
  t.is(events[3], 'ping 2');

  // TODO: who should see the details of what v2 did wrong? calling
  // vat? only the console?
});

async function testMultiKindUpgradeChecks(t, mode, complaint) {
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
    const result = c.kpResolution(kpid);
    return [status, result];
  };

  // create initial version
  const [v1status] = await run('buildV1WithMultiKind', [mode]);
  t.is(v1status, 'fulfilled');

  // upgrade should fail
  if (complaint) {
    console.log(`note: expect a '${complaint}' error below`);
  }
  const [v2status, v2result] = await run('upgradeV2Simple', [mode]);
  if (complaint) {
    t.is(v2status, 'rejected');
    const e = kunser(v2result);
    t.truthy(e instanceof Error);
    t.regex(e.message, /vat-upgrade failure/);
    // TODO: who should see the details of what v2 did wrong? calling
    // vat? only the console?
  } else {
    t.is(v2status, 'fulfilled');
  }
}

test('facet kind redefinition - fail on facet count mismatch', async t => {
  await testMultiKindUpgradeChecks(
    t,
    'facetCountMismatch',
    `durable kind "multi" facets don't match original definition`,
  );
});

test('facet kind redefinition - fail on facet name mismatch', async t => {
  await testMultiKindUpgradeChecks(
    t,
    'facetNameMismatch',
    `durable kind "multi" facets don't match original definition`,
  );
});

test('facet kind redefinition - succeed on facet order mismatch', async t => {
  await testMultiKindUpgradeChecks(t, 'facetOrderMismatch', false);
});

test('facet kind redefinition - succeed on exact facet match', async t => {
  await testMultiKindUpgradeChecks(t, 'normal', false);
});

test('facet kind redefinition - fail on single- to multi-facet redefinition', async t => {
  await testMultiKindUpgradeChecks(
    t,
    's2mFacetiousnessMismatch',
    `durable kind "multi" originally defined as single-faceted`,
  );
});

test('facet kind redefinition - fail on multi- to single-facet redefinition', async t => {
  await testMultiKindUpgradeChecks(
    t,
    'm2sFacetiousnessMismatch',
    `durable kind "multi" originally defined as multi-faceted`,
  );
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
    const result = c.kpResolution(kpid);
    return [status, result];
  };

  const [status, result] = await run('doUpgradeWithBadOption', []);
  t.is(status, 'rejected');
  const e = kunser(result);
  t.truthy(e instanceof Error);
  // TODO Since we should be running with `errorTaming: unsafe`, the
  // following should have worked.
  // t.regex(e.message, /upgrade\(\) received unknown options: bad/);
  t.regex(e.message, /upgrade\(\) received unknown options: \(a string\)/);
});

test('failed vatAdmin upgrade - bad replacement code', async t => {
  const config = {
    includeDevDependencies: true, // for vat-data
    bootstrap: 'bootstrap',
    defaultReapInterval: 'never',
    vats: {
      bootstrap: { sourceSpec: bfile('bootstrap-upgrade.js') },
    },
    bundles: {
      ulrik1: { sourceSpec: bfile('vat-ulrik-1.js') },
    },
  };

  const hostStorage = provideHostStorage();
  await initializeSwingset(config, [], hostStorage);
  const c = await makeSwingsetController(hostStorage);
  c.pinVatRoot('bootstrap');
  await c.run();

  const run = async (method, args = []) => {
    assert(Array.isArray(args));
    const kpid = c.queueToVatRoot('bootstrap', method, args);
    await c.run();
    const status = c.kpStatus(kpid);
    const result = c.kpResolution(kpid);
    return [status, result];
  };

  const badVABundle = await bundleSource(
    new URL('./vat-junk.js', import.meta.url).pathname,
  );
  const bundleID = await c.validateAndInstallBundle(badVABundle);
  const kpid = c.upgradeStaticVat('vatAdmin', true, bundleID, {});
  await c.run();
  const vaUpgradeStatus = c.kpStatus(kpid);
  const vaUpgradeResult = kunser(c.kpResolution(kpid));

  t.is(vaUpgradeStatus, 'rejected');
  t.truthy(vaUpgradeResult instanceof Error);
  t.regex(vaUpgradeResult.message, /vat-upgrade failure/);

  // Now try doing something that uses vatAdmin to verify that original vatAdmin is intact.
  const [v1status, v1result] = await run('buildV1', []);
  t.is(v1status, 'fulfilled');
  // Just a taste to verify that the create went right; other tests check the rest
  t.deepEqual(kunser(v1result).data, ['some', 'data']);
});
