// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

import { M } from '@agoric/store';
import { initSwingStore } from '@agoric/swing-store';
import {
  buildVatController,
  initializeSwingset,
  makeSwingsetController,
} from '../../src/index.js';
import makeNextLog from '../make-nextlog.js';

import { kser, kslot } from '../../src/lib/kmarshal.js';
import { enumeratePrefixedKeys } from '../../src/kernel/state/storageHelper.js';
import { vstr } from '../util.js';

test.serial('exercise cache', async t => {
  const config = {
    includeDevDependencies: true, // for vat-data
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        sourceSpec: new URL('vat-representative-bootstrap.js', import.meta.url)
          .pathname,
        creationOptions: {
          virtualObjectCacheSize: 3,
        },
      },
    },
  };

  const log = [];

  const expectedVatID = 'v1';
  const kernelStorage = initSwingStore().kernelStorage;
  const kvStore = kernelStorage.kvStore;
  function vsKey(key) {
    // ignore everything except vatStores on the one vat under test
    // (especially ignore comms, which performs vatstore operations during
    // startup)
    return key.startsWith(`${expectedVatID}.`) && key.match(/^\w+\.vs\./);
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

  const bootstrapResult = await initializeSwingset(
    config,
    [],
    loggingKernelStorage,
  );
  const c = await makeSwingsetController(loggingKernelStorage, {});
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');

  const nextLog = makeNextLog(c);

  async function doSimple(method, what, ...args) {
    let sendArgs = args;
    if (what) {
      sendArgs = [kslot(what, 'thing'), ...args];
    }
    const r = c.queueToVatRoot('bootstrap', method, sendArgs, 'ignore');
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
    return `v1.vs.vom.o+v10/${num}`;
  }
  function esKey(num) {
    return `v1.vs.vom.es.o+v10/${num}`;
  }
  function rcKey(num) {
    return `v1.vs.vom.rc.o+v10/${num}`;
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
  const T1 = 'ko25';
  const T2 = 'ko26';
  const T3 = 'ko27';
  const T4 = 'ko28';
  const T5 = 'ko29';
  const T6 = 'ko30';
  const T7 = 'ko31';
  const T8 = 'ko32';

  // these tests are hard-coded to expect our vat-under-test to be 'v1', so
  // double-check here
  t.is(c.vatNameToID('bootstrap'), expectedVatID);

  await c.run();
  t.deepEqual(c.kpResolution(bootstrapResult), kser('bootstrap done'));
  log.length = 0; // assume all the irrelevant setup stuff worked correctly

  // init cache - []

  await make('thing1', true, T1); // make t1 - [t1]
  ck('get', esKey(1), undefined);
  ck('set', esKey(1), 'r');
  ck('set', dataKey(1), thingVal('thing1'));
  done();

  await make('thing2', false, T2); // make t2 - [t2 t1]
  ck('get', esKey(2), undefined);
  ck('set', esKey(2), 'r');
  ck('set', dataKey(2), thingVal('thing2'));
  done();

  await read(T1, 'thing1'); // refresh t1 - [t1 t2]
  await read(T2, 'thing2'); // refresh t2 - [t2 t1]
  await readHeld('thing1'); // refresh t1 - [t1 t2]

  await make('thing3', false, T3); // make t3 - [t3 t1 t2]
  ck('get', esKey(3), undefined);
  ck('set', esKey(3), 'r');
  ck('set', dataKey(3), thingVal('thing3'));
  done();

  await make('thing4', false, T4); // make t4 - [t4 t3 t1 t2]
  ck('get', esKey(4), undefined);
  ck('set', esKey(4), 'r');
  ck('set', dataKey(4), thingVal('thing4'));
  done();

  await make('thing5', false, T5); // evict t2, make t5 - [t5 t4 t3 t1]
  ck('get', esKey(5), undefined);
  ck('set', esKey(5), 'r');
  ck('set', dataKey(5), thingVal('thing5'));
  ck('get', rcKey(2), undefined);
  ck('get', esKey(2), 'r');
  done();

  await make('thing6', false, T6); // evict t1, make t6 - [t6 t5 t4 t3]
  ck('get', esKey(6), undefined);
  ck('set', esKey(6), 'r');
  ck('set', dataKey(6), thingVal('thing6'));
  done();

  await make('thing7', false, T7); // evict t3, make t7 - [t7 t6 t5 t4]
  ck('get', esKey(7), undefined);
  ck('set', esKey(7), 'r');
  ck('set', dataKey(7), thingVal('thing7'));
  ck('get', rcKey(3), undefined);
  ck('get', esKey(3), 'r');
  done();

  await make('thing8', false, T8); // evict t4, make t8 - [t8 t7 t6 t5]
  ck('get', esKey(8), undefined);
  ck('set', esKey(8), 'r');
  ck('set', dataKey(8), thingVal('thing8'));
  ck('get', rcKey(4), undefined);
  ck('get', esKey(4), 'r');
  done();

  await read(T2, 'thing2'); // reanimate t2, evict t5 - [t2 t8 t7 t6]
  ck('get', dataKey(2), thingVal('thing2'));
  ck('get', rcKey(5), undefined);
  ck('get', esKey(5), 'r');
  done();

  await readHeld('thing1'); // reanimate t1, evict t6 - [t1 t2 t8 t7]
  ck('get', dataKey(1), thingVal('thing1'));
  ck('get', rcKey(6), undefined);
  ck('get', esKey(6), 'r');
  done();

  await write(T2, 'thing2 updated'); // refresh t2 - [t2 t1 t8 t7]
  ck('set', dataKey(2), thingVal('thing2 updated'));

  await writeHeld('thing1 updated'); // refresh t1 - [t1 t2 t8 t7]
  ck('set', dataKey(1), thingVal('thing1 updated'));

  await read(T8, 'thing8'); // refresh t8 - [t8 t1 t2 t7]
  await read(T7, 'thing7'); // refresh t7 - [t7 t8 t1 t2]
  done();

  await read(T6, 'thing6'); // reanimate t6, evict t2 - [t6 t7 t8 t1]
  ck('get', dataKey(6), thingVal('thing6'));
  ck('get', rcKey(2), undefined);
  ck('get', esKey(2), 'r');
  done();

  await read(T5, 'thing5'); // reanimate t5, evict t1 - [t5 t6 t7 t8]
  ck('get', dataKey(5), thingVal('thing5'));
  done();

  await read(T4, 'thing4'); // reanimate t4, evict t8 - [t4 t5 t6 t7]
  ck('get', dataKey(4), thingVal('thing4'));
  ck('get', rcKey(8), undefined);
  ck('get', esKey(8), 'r');
  done();

  await read(T3, 'thing3'); // reanimate t3, evict t7 - [t3 t4 t5 t6]
  ck('get', dataKey(3), thingVal('thing3'));
  ck('get', rcKey(7), undefined);
  ck('get', esKey(7), 'r');
  done();

  await read(T2, 'thing2 updated'); // reanimate t2, evict t6 - [t2 t3 t4 t5]
  ck('get', dataKey(2), thingVal('thing2 updated'));
  ck('get', rcKey(6), undefined);
  ck('get', esKey(6), 'r');
  done();

  await readHeld('thing1 updated'); // reanimate t1, evict t5 - [t1 t2 t3 t4]
  ck('get', dataKey(1), thingVal('thing1 updated'));
  ck('get', rcKey(5), undefined);
  ck('get', esKey(5), 'r');
  done();

  await forgetHeld(); // cache unchanged - [t1 t2 t3 t4]
  ck('get', rcKey(1), undefined);
  ck('get', esKey(1), 'r');
  done();

  await hold(T8); // cache unchanged - [t1 t2 t3 t4]
  ck('get', dataKey(8), thingVal('thing8'));
  ck('get', rcKey(4), undefined);
  ck('get', esKey(4), 'r');
  done();

  await read(T7, 'thing7'); // reanimate t7, evict t4 - [t7 t1 t2 t3]
  ck('get', dataKey(7), thingVal('thing7'));
  ck('get', rcKey(3), undefined);
  ck('get', esKey(3), 'r');
  done();

  await writeHeld('thing8 updated'); // reanimate t8, evict t3 - [t8 t7 t1 t2]
  ck('set', dataKey(8), thingVal('thing8 updated'));
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

  const config = {
    includeDevDependencies: true, // for vat-data
    bootstrap: 'bootstrap',
    defaultManagerType: 'xs-worker',
    vats: {
      bob: {
        sourceSpec: new URL('vat-vom-gc-bob.js', import.meta.url).pathname,
        creationOptions: {
          virtualObjectCacheSize: 3,
        },
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
    [`${v}.vs.vc.1.|label`]: 'baggage',
    [`${v}.vs.vc.1.|nextOrdinal`]: '1',
    [`${v}.vs.vc.1.|schemata`]: vstr([M.string()]),
    [`${v}.vs.vc.2.|entryCount`]: '0',
    [`${v}.vs.vc.2.|label`]: 'promiseRegistrations',
    [`${v}.vs.vc.2.|nextOrdinal`]: '1',
    [`${v}.vs.vc.2.|schemata`]: vstr([M.scalar()]),
    [`${v}.vs.vc.3.|entryCount`]: '0',
    [`${v}.vs.vc.3.|label`]: 'promiseWatcherByKind',
    [`${v}.vs.vc.3.|nextOrdinal`]: '1',
    [`${v}.vs.vc.3.|schemata`]: vstr([M.scalar()]),
    [`${v}.vs.vc.4.|entryCount`]: '0',
    [`${v}.vs.vc.4.|label`]: 'watchedPromises',
    [`${v}.vs.vc.4.|nextOrdinal`]: '1',
    [`${v}.vs.vc.4.|schemata`]: vstr([M.and(M.scalar(), M.string())]),
    [`${v}.vs.vom.es.o+v10/3`]: 'r',
    [`${v}.vs.vom.o+v10/2`]: `{"label":${vstr('thing #2')}}`,
    [`${v}.vs.vom.o+v10/3`]: `{"label":${vstr('thing #3')}}`,
    [`${v}.vs.vom.o+v10/8`]: `{"label":${vstr('thing #8')}}`,
    [`${v}.vs.vom.o+v10/9`]: `{"label":${vstr('thing #9')}}`,
    [`${v}.vs.vom.rc.o+d6/1`]: '1',
    [`${v}.vs.vom.rc.o+d6/3`]: '1',
    [`${v}.vs.vom.rc.o+d6/4`]: '1',
    [`${v}.vs.vom.vkind.10`]: '{"kindID":"10","tag":"thing"}',
    [`${v}.vs.watchedPromiseTableID`]: 'o+d6/4',
    [`${v}.vs.watcherTableID`]: 'o+d6/3',
  });
});

// Check that facets which don't reference their state still kill their cohort alive
async function orphanTest(t, mode) {
  const config = {
    includeDevDependencies: true, // for vat-data
    bootstrap: 'bootstrap',
    vats: {
      bob: {
        sourceSpec: new URL('vat-orphan-bob.js', import.meta.url).pathname,
        creationOptions: {
          virtualObjectCacheSize: 0,
        },
      },
      bootstrap: {
        sourceSpec: new URL('vat-orphan-bootstrap.js', import.meta.url)
          .pathname,
      },
    },
  };

  const kernelStorage = initSwingStore().kernelStorage;

  const c = await buildVatController(config, [mode], { kernelStorage });
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');

  await c.run();
  t.deepEqual(c.kpResolution(c.bootstrapResult), kser(undefined));
  t.deepEqual(c.dump().log, ['compare old === new : true']);
}

test('strongly held facet retains representative', async t => {
  await orphanTest(t, 'facet');
});

test('weakly held facet retains representative', async t => {
  await orphanTest(t, 'wfacet');
});

test('strongly held empty facet retains representative', async t => {
  await orphanTest(t, 'empty');
});

test('weakly held empty facet retains representative', async t => {
  await orphanTest(t, 'wempty');
});

test('strongly held method retains representative', async t => {
  await orphanTest(t, 'method');
});

test('weakly held method retains representative', async t => {
  await orphanTest(t, 'wmethod');
});

test('strongly held proto retains representative', async t => {
  await orphanTest(t, 'proto');
});

test('weakly held proto retains representative', async t => {
  await orphanTest(t, 'wproto');
});

test('strongly held cohort retains representative', async t => {
  await orphanTest(t, 'cohort');
});

test('weakly held cohort retains representative', async t => {
  await orphanTest(t, 'wcohort');
});

test('strongly held state retains representative', async t => {
  await orphanTest(t, 'state');
});

test('weakly held state retains representative', async t => {
  await orphanTest(t, 'wstate');
});
