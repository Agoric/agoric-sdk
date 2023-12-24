// @ts-nocheck
// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

import { kser, kslot } from '@agoric/kmarshal';
import { M } from '@agoric/store';
import { initSwingStore } from '@agoric/swing-store';
import {
  buildVatController,
  initializeSwingset,
  makeSwingsetController,
} from '../../src/index.js';
import makeNextLog from '../make-nextlog.js';

import { enumeratePrefixedKeys } from '../../src/kernel/state/storageHelper.js';
import { vstr } from '../util.js';

test.serial('exercise cache', async t => {
  const config = {
    includeDevDependencies: true, // for vat-data
    defaultManagerType: 'xs-worker', // for stability against GC
    defaultReapInterval: 1, // for explicitness (kernel defaults to 1 anyways)
    // no bootstrap, to remove bootstrap(vats), to remove noise of GC drops
    // bootstrap: 'bootstrap',
    vats: {
      representatives: {
        sourceSpec: new URL('vat-representatives.js', import.meta.url).pathname,
      },
    },
  };

  const log = [];

  let vatID; // set after initialization finishes
  const kernelStorage = initSwingStore().kernelStorage;
  const kvStore = kernelStorage.kvStore;
  function vsKey(key) {
    // ignore everything except vatStores on the one vat under test
    // (especially ignore comms, which performs vatstore operations during
    // startup)
    return vatID && key.startsWith(`${vatID}.`) && key.match(/^\w+\.vs\./);
  }
  const loggingKVStore = {
    has: key => kvStore.has(key),
    get(key) {
      const result = kvStore.get(key);
      if (vsKey(key)) {
        log.push(['get', key, result]);
      }
      return result;
    },
    getNextKey: priorKey => kvStore.getNextKey(priorKey),
    set(key, value) {
      if (vsKey(key)) {
        log.push(['set', key, value]);
      }
      kvStore.set(key, value);
    },
    delete(key) {
      if (vsKey(key)) {
        log.push(['delete', key]);
      }
      kvStore.delete(key);
    },
  };
  const loggingKernelStorage = {
    ...kernelStorage,
    kvStore: loggingKVStore,
  };
  // TODO: it'd be nice to { addVatAdmin: false } too, but kernel is stubborn
  const initOpts = { addComms: false, addVattp: false, addTimer: false };
  await initializeSwingset(config, [], loggingKernelStorage, initOpts);
  const c = await makeSwingsetController(loggingKernelStorage, {});
  t.teardown(c.shutdown);
  c.pinVatRoot('representatives');
  vatID = c.vatNameToID('representatives');

  const nextLog = makeNextLog(c);

  async function doSimple(method, what, ...args) {
    let sendArgs = args;
    if (what) {
      sendArgs = [kslot(what, 'thing'), ...args];
    }
    const r = c.queueToVatRoot('representatives', method, sendArgs, 'ignore');
    await c.run();
    t.is(c.kpStatus(r), 'fulfilled');
    t.deepEqual(nextLog(), []);
    return r;
  }

  async function make(name, holdIt, expect) {
    const r = await doSimple('makeThing', null, name, holdIt);
    const result = c.kpResolution(r);
    t.deepEqual(result, kser(kslot(expect, 'thing')));
    return result.slots[0];
  }
  async function read(what, expect) {
    const r = await doSimple('readThing', what);
    t.deepEqual(c.kpResolution(r), kser(expect));
  }
  async function readHeld(expect) {
    const r = await doSimple('readHeldThing', null);
    t.deepEqual(c.kpResolution(r), kser(expect));
  }
  async function write(what, newName) {
    await doSimple('writeThing', what, newName);
  }
  async function writeHeld(newName) {
    await doSimple('writeHeldThing', null, newName);
  }
  async function forgetHeld() {
    await doSimple('forgetHeldThing', null);
  }
  async function hold(what) {
    await doSimple('holdThing', what);
  }
  function dataKey(num) {
    return `${vatID}.vs.vom.o+v10/${num}`;
  }
  function esKey(num) {
    return `${vatID}.vs.vom.es.o+v10/${num}`;
  }
  function rcKey(num) {
    return `${vatID}.vs.vom.rc.o+v10/${num}`;
  }
  function thingVal(name) {
    return JSON.stringify({
      name: kser(name),
    });
  }

  function ck(...stuff) {
    t.deepEqual(log.shift(), [...stuff]);
  }

  function done() {
    t.deepEqual(log, []);
  }

  // expected kernel object ID allocations
  const T1 = 'ko22';
  const T2 = 'ko23';
  const T3 = 'ko24';
  const T4 = 'ko25';
  const T5 = 'ko26';
  const T6 = 'ko27';
  const T7 = 'ko28';
  const T8 = 'ko29';

  await c.run();
  log.length = 0; // assume all the irrelevant setup stuff worked correctly

  // note: defaultReapInterval=1, so every operation is followed by a
  // BOYD. We aren't asserting the separation between the vatstore
  // get/sets that happen during the real operation and during the
  // subsequent BOYD, but we'll annotate them here for clarity. Also
  // note that this test was more important back when we had a cache
  // that spanned multiple cranks, whereas the current implementation
  // is explicitly flushed at the end of every delivery.

  // thing1 is exported (so rs get/set)
  await make('thing1', true, T1);
  ck('get', esKey(1), undefined);
  ck('set', esKey(1), 'r');
  // end-of-crank:
  ck('set', dataKey(1), thingVal('thing1'));
  // BOYD: the Representative is held in RAM, no extra queries
  done();

  await make('thing2', false, T2);
  ck('get', esKey(2), undefined);
  ck('set', esKey(2), 'r');
  // end-of-crank:
  ck('set', dataKey(2), thingVal('thing2'));
  // BOYD: thing2 is not held, so the Representative drops, causing
  // extra rc/es queries to decide whether to delete or not
  ck('get', rcKey(2), undefined);
  ck('get', esKey(2), 'r');
  done();

  await read(T1, 'thing1'); // still in RAM
  // T1 was in RAM, so no new representative was needed, but creating
  // a Representative wouldn't cause a data read. However invoking a
  // method *does* require a data read, one per crank
  ck('get', dataKey(1), thingVal('thing1'));
  // end-of-crank: (none)
  // BOYD: (none): thing1 is held, no extra queries
  done();

  await read(T2, 'thing2'); // reanimated
  // T2 was not in RAM, so reanimateVO() makes a new Representative,
  // but that doesn't cause a data read. But invoking a method does.
  ck('get', dataKey(2), thingVal('thing2'));
  // end-of-crank: (none)
  // BOYD: thing2 is dropped, so extra queries
  ck('get', rcKey(2), undefined);
  ck('get', esKey(2), 'r');
  done();

  await readHeld('thing1'); // still in RAM
  // same story: one data read per crank when a method is invoked
  ck('get', dataKey(1), thingVal('thing1'));
  // end-of-crank: (none)
  // BOYD: (none)
  done();

  await make('thing3', false, T3);
  ck('get', esKey(3), undefined);
  ck('set', esKey(3), 'r');
  // end-of-crank: write T3 data
  ck('set', dataKey(3), thingVal('thing3'));
  // BOYD: T3 Representative dropped
  ck('get', rcKey(3), undefined);
  ck('get', esKey(3), 'r');
  done();

  await make('thing4', false, T4);
  ck('get', esKey(4), undefined);
  ck('set', esKey(4), 'r');
  // end-of-crank: write T4 data
  ck('set', dataKey(4), thingVal('thing4'));
  // BOYD: T4 Representative dropped
  ck('get', rcKey(4), undefined);
  ck('get', esKey(4), 'r');
  done();

  await make('thing5', false, T5);
  ck('get', esKey(5), undefined);
  ck('set', esKey(5), 'r');
  // end-of-crank: write T5 data
  ck('set', dataKey(5), thingVal('thing5'));
  // BOYD: T5 Representative dropped
  ck('get', rcKey(5), undefined);
  ck('get', esKey(5), 'r');
  done();

  await make('thing6', false, T6);
  ck('get', esKey(6), undefined);
  ck('set', esKey(6), 'r');
  // end-of-crank: write T6 data
  ck('set', dataKey(6), thingVal('thing6'));
  // BOYD: T6 Representative dropped
  ck('get', rcKey(6), undefined);
  ck('get', esKey(6), 'r');
  done();

  await make('thing7', false, T7);
  ck('get', esKey(7), undefined);
  ck('set', esKey(7), 'r');
  // end-of-crank: write T7 data
  ck('set', dataKey(7), thingVal('thing7'));
  // BOYD: T7 Representative dropped
  ck('get', rcKey(7), undefined);
  ck('get', esKey(7), 'r');
  done();

  await make('thing8', false, T8);
  ck('get', esKey(8), undefined);
  ck('set', esKey(8), 'r');
  // end-of-crank: write T8 data
  ck('set', dataKey(8), thingVal('thing8'));
  // BOYD: T8 Representative dropped
  ck('get', rcKey(8), undefined);
  ck('get', esKey(8), 'r');
  done();

  await read(T2, 'thing2'); // reanimate t2
  ck('get', dataKey(2), thingVal('thing2'));
  // end-of-crank: (none)
  // BOYD: T2 Representative dropped
  ck('get', rcKey(2), undefined);
  ck('get', esKey(2), 'r');
  done();

  await readHeld('thing1'); // still in RAM
  ck('get', dataKey(1), thingVal('thing1'));
  // end-of-crank: (none)
  // BOYD: (none)
  done();

  await write(T2, 'thing2 updated'); // reanimated
  ck('get', dataKey(2), thingVal('thing2'));
  // end-of-crank: flush T2
  ck('set', dataKey(2), thingVal('thing2 updated'));
  // BOYD: T2 Representative dropped
  ck('get', rcKey(2), undefined);
  ck('get', esKey(2), 'r');
  done();

  await writeHeld('thing1 updated'); // still in RAM
  ck('get', dataKey(1), thingVal('thing1')); // but data is not
  // end-of-crank: flush T1
  ck('set', dataKey(1), thingVal('thing1 updated'));
  // BOYD: (none)
  done();

  await read(T8, 'thing8'); // reanimated T8
  ck('get', dataKey(8), thingVal('thing8'));
  // end-of-crank: (none)
  // BOYD: T8 Representative dropped
  ck('get', rcKey(8), undefined);
  ck('get', esKey(8), 'r');
  done();

  await read(T6, 'thing6'); // reanimate t6
  ck('get', dataKey(6), thingVal('thing6'));
  // end-of-crank: (none)
  // BOYD: T6 Representative dropped
  ck('get', rcKey(6), undefined);
  ck('get', esKey(6), 'r');
  done();

  await read(T5, 'thing5'); // reanimate t5
  ck('get', dataKey(5), thingVal('thing5'));
  // end-of-crank: (none)
  // BOYD: T5 Representative dropped
  ck('get', rcKey(5), undefined);
  ck('get', esKey(5), 'r');
  done();

  await read(T4, 'thing4'); // reanimate t4
  ck('get', dataKey(4), thingVal('thing4'));
  // end-of-crank: (none)
  // BOYD: T4 Representative dropped
  ck('get', rcKey(4), undefined);
  ck('get', esKey(4), 'r');
  done();

  await read(T3, 'thing3'); // reanimate t3
  ck('get', dataKey(3), thingVal('thing3'));
  // end-of-crank: (none)
  // BOYD: T3 Representative dropped
  ck('get', rcKey(3), undefined);
  ck('get', esKey(3), 'r');
  done();

  await read(T2, 'thing2 updated'); // reanimate t2
  ck('get', dataKey(2), thingVal('thing2 updated'));
  // end-of-crank: (none)
  // BOYD: T2 Representative dropped
  ck('get', rcKey(2), undefined);
  ck('get', esKey(2), 'r');
  done();

  await readHeld('thing1 updated'); // reanimate t1
  ck('get', dataKey(1), thingVal('thing1 updated'));
  // end-of-crank: (none)
  // BOYD: (none)
  done();

  await forgetHeld();
  // end-of-crank: (none)
  // BOYD: T1 Representative dropped
  ck('get', rcKey(1), undefined);
  ck('get', esKey(1), 'r');
  done();

  await hold(T8); // reanimate T8, add to RAM
  // we don't invoke any methods, so we don't need its data
  // end-of-crank: (none)
  // BOYD: (none)
  done();

  await read(T7, 'thing7'); // reanimate t7
  ck('get', dataKey(7), thingVal('thing7'));
  // end-of-crank: (none)
  // BOYD: T7 Representative dropped
  ck('get', rcKey(7), undefined);
  ck('get', esKey(7), 'r');
  done();

  await writeHeld('thing8 updated'); // T8 already in RAM
  ck('get', dataKey(8), thingVal('thing8'));
  // end-of-crank: flush T8 data
  ck('set', dataKey(8), thingVal('thing8 updated'));
  // BOYD: (none, T8 stays in RAM)
  done();
});

test('virtual object gc', async t => {
  /*
    With respect to any given case, we really only have two variables to fiddle
    with: whether a reference to the VO is exported, and whether a reference to
    the VO is retained in memory in the vat.

    For the first variable, there are three possible states: not exported,
    exported and then retained externally, exported and then dropped externally.

    For the second variable, there are two possible states: retained internally,
    and dropped internally.

    That would seem like 6 cases, but that's not quite true, since a reference
    that is dropped internally before being exported can't ever be
    exported. (Also if a VO has both an exported reference and an internal
    reference and both are dropped, we still have to worry about what order
    they're dropped in, but there's another test that worries about the order of
    droppage issue).

    In this test, Bob generates 9 VOs of the same kind, with vrefs o+1/1 through
    o+1/9.  Bob dispenses some of these to Bootstrap, drops some of them,
    retires some, etc.  The breakdown is as follows:

    #   Exported?  Export Dropped?  Local dropped? Delete?
    1        yes              yes             yes     yes (dropped both locally and by export)
    2        yes              yes              no      no (retained in local variable)
    3        yes               no             yes      no (retained by export)
    4         no              n/a             yes     yes (dropped before use)
    5,6,7     no              n/a             yes     yes (dropped at end)
    8,9       no              n/a              no      no (retained unused)

    Things 5, 6, and 7 are essentially the same as 4, but they are dropped by a
    loop at the end, to make sure that that works.

    Things 8 and 9 are both the same. They are never used and so are retained
    where they were originally stashed on creation
  */

  /** @type {SwingSetConfig} */
  const config = {
    includeDevDependencies: true, // for vat-data
    bootstrap: 'bootstrap',
    defaultManagerType: 'xs-worker',
    vats: {
      bob: {
        sourceSpec: new URL('vat-vom-gc-bob.js', import.meta.url).pathname,
      },
      bootstrap: {
        sourceSpec: new URL('vat-vom-gc-bootstrap.js', import.meta.url)
          .pathname,
      },
    },
  };

  const kernelStorage = initSwingStore().kernelStorage;

  const c = await buildVatController(config, [], { kernelStorage });
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');

  await c.run();
  t.deepEqual(c.kpResolution(c.bootstrapResult), kser(undefined));
  const v = 'v6';
  const remainingVOs = {};
  for (const key of enumeratePrefixedKeys(kernelStorage.kvStore, `${v}.vs.`)) {
    remainingVOs[key] = kernelStorage.kvStore.get(key);
  }
  // prettier-ignore
  t.deepEqual(remainingVOs, {
    [`${v}.vs.baggageID`]: 'o+d6/1',
    [`${v}.vs.idCounters`]: '{"exportID":11,"collectionID":5,"promiseID":8}',
    [`${v}.vs.kindIDID`]: '1',
    [`${v}.vs.storeKindIDTable`]:
      '{"scalarMapStore":2,"scalarWeakMapStore":3,"scalarSetStore":4,"scalarWeakSetStore":5,"scalarDurableMapStore":6,"scalarDurableWeakMapStore":7,"scalarDurableSetStore":8,"scalarDurableWeakSetStore":9}',
    [`${v}.vs.vc.1.|entryCount`]: '0',
    [`${v}.vs.vc.1.|nextOrdinal`]: '1',
    [`${v}.vs.vc.1.|schemata`]: vstr({ label: 'baggage', keyShape: M.string() }),
    [`${v}.vs.vc.2.|entryCount`]: '0',
    [`${v}.vs.vc.2.|nextOrdinal`]: '1',
    [`${v}.vs.vc.2.|schemata`]: vstr({ label: 'promiseRegistrations', keyShape: M.scalar() }),
    [`${v}.vs.vc.3.|entryCount`]: '0',
    [`${v}.vs.vc.3.|nextOrdinal`]: '1',
    [`${v}.vs.vc.3.|schemata`]: vstr({ label: 'promiseWatcherByKind', keyShape: M.scalar() }),
    [`${v}.vs.vc.4.|entryCount`]: '0',
    [`${v}.vs.vc.4.|nextOrdinal`]: '1',
    [`${v}.vs.vc.4.|schemata`]: vstr({ label: 'watchedPromises', keyShape: M.and(M.scalar(), M.string()) }),
    [`${v}.vs.vom.es.o+v10/3`]: 'r',
    [`${v}.vs.vom.o+v10/2`]: `{"label":${vstr('thing #2')}}`,
    [`${v}.vs.vom.o+v10/3`]: `{"label":${vstr('thing #3')}}`,
    [`${v}.vs.vom.o+v10/8`]: `{"label":${vstr('thing #8')}}`,
    [`${v}.vs.vom.o+v10/9`]: `{"label":${vstr('thing #9')}}`,
    [`${v}.vs.vom.rc.o+d6/1`]: '1',
    [`${v}.vs.vom.rc.o+d6/3`]: '1',
    [`${v}.vs.vom.rc.o+d6/4`]: '1',
    [`${v}.vs.vom.vkind.10.descriptor`]: '{"kindID":"10","tag":"thing"}',
    [`${v}.vs.watchedPromiseTableID`]: 'o+d6/4',
    [`${v}.vs.watcherTableID`]: 'o+d6/3',
  });
});
