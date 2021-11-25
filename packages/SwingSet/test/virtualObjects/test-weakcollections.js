import { test } from '../../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import engineGC from '../../src/engine-gc.js';
import { provideHostStorage } from '../../src/hostStorage.js';
import { initializeSwingset, makeSwingsetController } from '../../src/index.js';
import { makeFakeVirtualObjectManager } from '../../tools/fakeVirtualSupport.js';
import makeNextLog from '../make-nextlog.js';

function capdata(body, slots = []) {
  return harden({ body, slots });
}

function capargs(args, slots = []) {
  return capdata(JSON.stringify(args), slots);
}

test('weakMap in vat', async t => {
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        sourceSpec: new URL('vat-weakcollections-bootstrap.js', import.meta.url)
          .pathname,
      },
      alice: {
        sourceSpec: new URL('vat-weakcollections-alice.js', import.meta.url)
          .pathname,
        creationOptions: { managerType: 'local' },
      },
    },
  };

  const hostStorage = provideHostStorage();
  const bootstrapResult = await initializeSwingset(config, [], hostStorage);
  const c = await makeSwingsetController(hostStorage, {});
  c.pinVatRoot('bootstrap');
  const nextLog = makeNextLog(c);

  await c.run();
  t.deepEqual(c.kpResolution(bootstrapResult), capargs('bootstrap done'));

  async function doSimple(method) {
    const sendArgs = capargs([], []);
    const r = c.queueToVatRoot('bootstrap', method, sendArgs);
    await c.run();
    t.is(c.kpStatus(r), 'fulfilled');
    return c.kpResolution(r);
  }

  const preGCResult = await doSimple('runProbes');
  t.deepEqual(preGCResult, capargs('probes done'));
  t.deepEqual(nextLog(), [
    'probe of sample-object returns imported item #0',
    'probe of [object Promise] returns imported item #1',
    'probe of [object Alleged: remember-exp] returns mer',
    'probe of [object Alleged: holder-vo] returns mevo',
    'probe of [object Promise] returns mep',
    'probe of [object Alleged: forget-exp] returns fer',
    'probe of [object Alleged: holder-vo] returns fevo',
    'probe of [object Promise] returns fep',
  ]);
  await doSimple('betweenProbes');
  engineGC();
  const postGCResult = await doSimple('runProbes');
  t.deepEqual(postGCResult, capargs('probes done'));
  t.deepEqual(nextLog(), [
    'probe of sample-object returns imported item #0',
    'probe of [object Promise] returns undefined',
    'probe of [object Alleged: remember-exp] returns mer',
    'probe of [object Alleged: holder-vo] returns mevo',
    'probe of [object Promise] returns mep',
    'probe of [object Alleged: forget-exp] returns fer',
    'probe of [object Alleged: holder-vo] returns fevo',
    'probe of [object Promise] returns fep',
  ]);
});

test('weakMap vref handling', async t => {
  const log = [];
  const {
    VirtualObjectAwareWeakMap,
    VirtualObjectAwareWeakSet,
    registerEntry,
    deleteEntry,
  } = makeFakeVirtualObjectManager({ cacheSize: 3, log });

  function addCListEntry(slot, val) {
    registerEntry(slot, val);
  }

  function removeCListEntry(slot, val) {
    deleteEntry(slot, val);
  }

  const weakMap = new VirtualObjectAwareWeakMap();

  function checkMap(vref, label, useVRef) {
    const obj = {};
    addCListEntry(vref, obj);
    weakMap.set(obj, label);
    t.is(weakMap.get(obj), label);
    removeCListEntry(vref, obj);
    const obj2 = {};
    addCListEntry(vref, obj2);
    if (useVRef) {
      t.falsy(weakMap.has(obj));
      t.truthy(weakMap.has(obj2));
      t.is(weakMap.get(obj), undefined);
      t.is(weakMap.get(obj2), label);
    } else {
      t.truthy(weakMap.has(obj));
      t.falsy(weakMap.has(obj2));
      t.is(weakMap.get(obj), label);
      t.is(weakMap.get(obj2), undefined);
    }
  }

  checkMap('o-1', 'imported presence', true);
  checkMap('o+2', 'exported remotable', false);
  checkMap('o+3/4', 'exported virtual object', true);
  checkMap('p-5', 'imported promise', false);
  checkMap('p+6', 'exported promise', false);
  checkMap('d-7', 'imported device', false);

  const weakSet = new VirtualObjectAwareWeakSet();

  function checkSet(vref, useVRef) {
    const obj = {};
    addCListEntry(vref, obj);
    weakSet.add(obj);
    t.truthy(weakSet.has(obj));
    removeCListEntry(vref, obj);
    const obj2 = {};
    addCListEntry(vref, obj2);
    if (useVRef) {
      t.falsy(weakSet.has(obj));
      t.truthy(weakSet.has(obj2));
    } else {
      t.truthy(weakSet.has(obj));
      t.falsy(weakSet.has(obj2));
    }
  }

  checkSet('o-8', true);
  checkSet('o+9', false);
  checkSet('o+10/11', true);
  checkSet('p-12', false);
  checkSet('p+13', false);
  checkSet('d-14', false);
});
