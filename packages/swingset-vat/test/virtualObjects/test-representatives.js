import { test } from '../../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { provideHostStorage } from '../../src/hostStorage.js';
import {
  buildVatController,
  initializeSwingset,
  makeSwingsetController,
} from '../../src/index.js';
import makeNextLog from '../make-nextlog.js';

function capdata(body, slots = []) {
  return harden({ body, slots });
}

function capargs(args, slots = []) {
  return capdata(JSON.stringify(args), slots);
}

function slot0(iface, kid) {
  return {
    body: `{"@qclass":"slot","iface":"Alleged: ${iface}","index":0}`,
    slots: [kid],
  };
}

test('virtual object representatives', async t => {
  const config = {
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

  const c = await buildVatController(config, []);
  c.pinVatRoot('bootstrap');
  const nextLog = makeNextLog(c);

  await c.run();
  t.deepEqual(c.kpResolution(c.bootstrapResult), capargs('bootstrap done'));

  async function doTestA(mode, result) {
    const r = c.queueToVatRoot(
      'bootstrap',
      'testA',
      capargs([`thing${mode}`, mode]),
    );
    await c.run();
    t.is(c.kpStatus(r), 'fulfilled');
    t.deepEqual(nextLog(), []);
    t.deepEqual(c.kpResolution(r), slot0('thing', result));
  }
  await doTestA(1, 'ko25');
  await doTestA(2, 'ko26');

  async function doTestB(mode, result) {
    const r = c.queueToVatRoot(
      'bootstrap',
      'testB',
      capargs([`thing${mode}`, mode]),
    );
    await c.run();
    t.is(c.kpStatus(r), 'fulfilled');
    t.deepEqual(nextLog(), [
      `test${mode} thing.name before rename "thing${mode}"`,
      `test${mode} initialSelf.name before rename "thing${mode}"`,
      `test${mode} thing.name after rename "thing${mode} modified"`,
      `test${mode} initialSelf.name after rename "thing${mode} modified"`,
    ]);
    t.deepEqual(c.kpResolution(r), slot0('thing', result));
  }
  await doTestB(3, 'ko27');
  await doTestB(4, 'ko28');
  await doTestB(5, 'ko29');
  await doTestB(6, 'ko30');

  async function doTestC(mode) {
    const r = c.queueToVatRoot(
      'bootstrap',
      'testC',
      capargs([`thing${mode}`, mode]),
    );
    await c.run();
    t.is(c.kpStatus(r), 'fulfilled');
    t.deepEqual(nextLog(), [`test${mode} result is "47"`]);
  }
  await doTestC(7);
  await doTestC(8);
  await doTestC(9);
  await doTestC(10);

  async function doTestD(mode) {
    const r = c.queueToVatRoot(
      'bootstrap',
      'testD',
      capargs([`thing${mode}`, mode]),
    );
    await c.run();
    t.is(c.kpStatus(r), 'fulfilled');
    t.deepEqual(nextLog(), [`test${mode} result is "thing${mode}"`]);
  }
  await doTestD(11);
  await doTestD(12);

  async function doTestE(mode) {
    const r = c.queueToVatRoot(
      'bootstrap',
      'testE',
      capargs([`thing${mode}`, mode]),
    );
    await c.run();
    t.is(c.kpStatus(r), 'fulfilled');
    t.deepEqual(nextLog(), [`test${mode} result is "thing${mode} modified"`]);
  }
  await doTestE(13);
  await doTestE(14);
  await doTestE(15);
  await doTestE(16);
  await doTestE(17);
  await doTestE(18);
  await doTestE(19);
  await doTestE(20);

  const rz1 = c.queueToVatRoot(
    'bootstrap',
    'testCacheOverflow',
    capargs([`zot1`, false]),
  );
  await c.run();
  t.is(c.kpStatus(rz1), 'fulfilled');
  t.deepEqual(nextLog(), []);
  t.deepEqual(c.kpResolution(rz1), slot0('zot', 'ko31'));

  const rz2 = c.queueToVatRoot(
    'bootstrap',
    'testCacheOverflow',
    capargs([`zot2`, true]),
  );
  await c.run();
  t.is(c.kpStatus(rz2), 'fulfilled');
  t.deepEqual(nextLog(), [
    'testCacheOverflow catches Error: cache overflowed with objects being initialized',
  ]);
  t.deepEqual(c.kpResolution(rz2), capdata('"overflow"'));
});

test.serial('exercise cache', async t => {
  const config = {
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

  const hostStorage = provideHostStorage();
  const kvStore = hostStorage.kvStore;
  function vsKey(key) {
    return key.match(/^\w+\.vs\./);
  }
  const loggingKVStore = {
    has: key => kvStore.has(key),
    getKeys: (start, end) => kvStore.getKeys(start, end),
    get(key) {
      const result = kvStore.get(key);
      if (vsKey(key)) {
        log.push(['get', key, result]);
      }
      return result;
    },
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
  const loggingHostStorage = {
    ...hostStorage,
    kvStore: loggingKVStore,
  };

  const bootstrapResult = await initializeSwingset(
    config,
    [],
    loggingHostStorage,
  );
  const c = await makeSwingsetController(loggingHostStorage, {});
  c.pinVatRoot('bootstrap');

  const nextLog = makeNextLog(c);

  await c.run();
  t.deepEqual(c.kpResolution(bootstrapResult), capargs('bootstrap done'));

  async function doSimple(method, what, ...args) {
    let sendArgs;
    if (what) {
      const whatArg = {
        '@qclass': 'slot',
        iface: 'Alleged: thing',
        index: 0,
      };
      sendArgs = capargs([whatArg, ...args], [what]);
    } else {
      sendArgs = capargs(args);
    }
    const r = c.queueToVatRoot('bootstrap', method, sendArgs);
    await c.run();
    t.is(c.kpStatus(r), 'fulfilled');
    t.deepEqual(nextLog(), []);
    return r;
  }

  async function make(name, holdIt, expect) {
    const r = await doSimple('makeThing', null, name, holdIt);
    const result = c.kpResolution(r);
    t.deepEqual(result, slot0('thing', expect));
    return result.slots[0];
  }
  async function read(what, expect) {
    const r = await doSimple('readThing', what);
    t.deepEqual(c.kpResolution(r), capargs(expect));
  }
  async function readHeld(expect) {
    const r = await doSimple('readHeldThing', null);
    t.deepEqual(c.kpResolution(r), capargs(expect));
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
    return `v1.vs.vom.o+1/${num}`;
  }
  function esKey(num) {
    return `v1.vs.vom.es.o+1/${num}`;
  }
  function rcKey(num) {
    return `v1.vs.vom.rc.o+1/${num}`;
  }
  function thingVal(name) {
    return JSON.stringify({
      name: capdata(JSON.stringify(name)),
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

  // init cache - []
  await make('thing1', true, T1); // make t1 - [t1]
  ck('get', 'v1.vs.storeKindIDTable', undefined);
  ck(
    'set',
    'v1.vs.storeKindIDTable',
    '{"scalarMapStore":3,"scalarWeakMapStore":4,"scalarSetStore":5,"scalarWeakSetStore":6,"scalarDurableMapStore":7,"scalarDurableWeakMapStore":8,"scalarDurableSetStore":9,"scalarDurableWeakSetStore":10}',
  );
  ck('set', 'v1.vs.vc.1.|nextOrdinal', '1');
  ck(
    'set',
    'v1.vs.vc.1.|schemata',
    '{"body":"[{\\"@qclass\\":\\"tagged\\",\\"tag\\":\\"match:scalar\\",\\"payload\\":{\\"@qclass\\":\\"undefined\\"}}]","slots":[]}',
  );
  ck('set', 'v1.vs.vc.1.|label', 'weakMap');
  ck('get', 'v1.vs.vom.rc.o-50', undefined);
  ck('get', 'v1.vs.vom.rc.o-51', undefined);
  ck('get', 'v1.vs.vom.rc.o-52', undefined);
  ck('get', 'v1.vs.vom.rc.o-53', undefined);
  ck('set', esKey(1), '1');
  ck('set', dataKey(1), thingVal('thing1'));
  done();

  await make('thing2', false, T2); // make t2 - [t2 t1]
  ck('set', esKey(2), '1');
  ck('set', dataKey(2), thingVal('thing2'));
  done();

  await read(T1, 'thing1'); // refresh t1 - [t1 t2]
  await read(T2, 'thing2'); // refresh t2 - [t2 t1]
  await readHeld('thing1'); // refresh t1 - [t1 t2]

  await make('thing3', false, T3); // make t3 - [t3 t1 t2]
  ck('set', esKey(3), '1');
  ck('set', dataKey(3), thingVal('thing3'));
  done();

  await make('thing4', false, T4); // make t4 - [t4 t3 t1 t2]
  ck('set', esKey(4), '1');
  ck('set', dataKey(4), thingVal('thing4'));
  done();

  await make('thing5', false, T5); // evict t2, make t5 - [t5 t4 t3 t1]
  ck('set', esKey(5), '1');
  ck('get', rcKey(2), undefined);
  ck('get', esKey(2), '1');
  ck('set', dataKey(5), thingVal('thing5'));
  done();

  await make('thing6', false, T6); // evict t1, make t6 - [t6 t5 t4 t3]
  ck('set', esKey(6), '1');
  ck('set', dataKey(6), thingVal('thing6'));
  done();

  await make('thing7', false, T7); // evict t3, make t7 - [t7 t6 t5 t4]
  ck('set', esKey(7), '1');
  ck('get', rcKey(3), undefined);
  ck('get', esKey(3), '1');
  ck('set', dataKey(7), thingVal('thing7'));
  done();

  await make('thing8', false, T8); // evict t4, make t8 - [t8 t7 t6 t5]
  ck('set', esKey(8), '1');
  ck('get', rcKey(4), undefined);
  ck('get', esKey(4), '1');
  ck('set', dataKey(8), thingVal('thing8'));
  done();

  await read(T2, 'thing2'); // reanimate t2, evict t5 - [t2 t8 t7 t6]
  ck('get', dataKey(2), thingVal('thing2'));
  ck('get', rcKey(5), undefined);
  ck('get', esKey(5), '1');
  done();

  await readHeld('thing1'); // reanimate t1, evict t6 - [t1 t2 t8 t7]
  ck('get', dataKey(1), thingVal('thing1'));
  ck('get', rcKey(6), undefined);
  ck('get', esKey(6), '1');
  done();

  await write(T2, 'thing2 updated'); // refresh t2 - [t2 t1 t8 t7]
  await writeHeld('thing1 updated'); // refresh t1 - [t1 t2 t8 t7]

  await read(T8, 'thing8'); // refresh t8 - [t8 t1 t2 t7]
  await read(T7, 'thing7'); // refresh t7 - [t7 t8 t1 t2]
  ck('set', dataKey(2), thingVal('thing2 updated'));
  ck('set', dataKey(1), thingVal('thing1 updated'));
  done();

  await read(T6, 'thing6'); // reanimate t6, evict t2 - [t6 t7 t8 t1]
  ck('get', dataKey(6), thingVal('thing6'));
  ck('get', rcKey(2), undefined);
  ck('get', esKey(2), '1');
  done();

  await read(T5, 'thing5'); // reanimate t5, evict t1 - [t5 t6 t7 t8]
  ck('get', dataKey(5), thingVal('thing5'));
  done();

  await read(T4, 'thing4'); // reanimate t4, evict t8 - [t4 t5 t6 t7]
  ck('get', dataKey(4), thingVal('thing4'));
  done();

  await read(T3, 'thing3'); // reanimate t3, evict t7 - [t3 t4 t5 t6]
  ck('get', dataKey(3), thingVal('thing3'));
  ck('get', rcKey(7), undefined);
  ck('get', esKey(7), '1');
  done();

  await read(T2, 'thing2 updated'); // reanimate t2, evict t6 - [t2 t3 t4 t5]
  ck('get', dataKey(2), thingVal('thing2 updated'));
  ck('get', rcKey(6), undefined);
  ck('get', esKey(6), '1');
  done();

  await readHeld('thing1 updated'); // reanimate t1, evict t5 - [t1 t2 t3 t4]
  ck('get', dataKey(1), thingVal('thing1 updated'));
  ck('get', rcKey(5), undefined);
  ck('get', esKey(5), '1');
  done();

  await forgetHeld(); // cache unchanged - [t1 t2 t3 t4]
  ck('get', rcKey(1), undefined);
  ck('get', esKey(1), '1');
  done();

  await hold(T8); // cache unchanged - [t1 t2 t3 t4]
  ck('get', rcKey(4), undefined);
  ck('get', esKey(4), '1');
  done();

  await read(T7, 'thing7'); // reanimate t7, evict t4 - [t7 t1 t2 t3]
  ck('get', dataKey(7), thingVal('thing7'));
  ck('get', rcKey(3), undefined);
  ck('get', esKey(3), '1');
  done();

  await writeHeld('thing8 updated'); // reanimate t8, evict t3 - [t8 t7 t1 t2]
  ck('get', dataKey(8), thingVal('thing8'));
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

  const hostStorage = provideHostStorage();

  const c = await buildVatController(config, [], { hostStorage });
  c.pinVatRoot('bootstrap');

  await c.run();
  t.deepEqual(
    c.kpResolution(c.bootstrapResult),
    capargs({ '@qclass': 'undefined' }),
  );
  const remainingVOs = {};
  for (const key of hostStorage.kvStore.getKeys('v1.vs.', 'v1.vs/')) {
    remainingVOs[key] = hostStorage.kvStore.get(key);
  }
  t.deepEqual(remainingVOs, {
    'v1.vs.vom.es.o+1/3': '1',
    'v1.vs.vom.o+1/2': '{"label":{"body":"\\"thing #2\\"","slots":[]}}',
    'v1.vs.vom.o+1/3': '{"label":{"body":"\\"thing #3\\"","slots":[]}}',
    'v1.vs.vom.o+1/8': '{"label":{"body":"\\"thing #8\\"","slots":[]}}',
    'v1.vs.vom.o+1/9': '{"label":{"body":"\\"thing #9\\"","slots":[]}}',
  });
});
