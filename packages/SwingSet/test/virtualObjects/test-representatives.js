/* global __dirname */
import { test } from '../../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import path from 'path';

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
        sourceSpec: path.resolve(__dirname, 'vat-representative-bootstrap.js'),
        creationOptions: {
          virtualObjectCacheSize: 3,
        },
      },
    },
  };

  const c = await buildVatController(config, []);
  const nextLog = makeNextLog(c);

  await c.run();
  t.deepEqual(c.kpResolution(c.bootstrapResult), capargs('bootstrap done'));

  async function doTestA(mode, result) {
    const r = c.queueToVatExport(
      'bootstrap',
      'o+0',
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
    const r = c.queueToVatExport(
      'bootstrap',
      'o+0',
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
    const r = c.queueToVatExport(
      'bootstrap',
      'o+0',
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
    const r = c.queueToVatExport(
      'bootstrap',
      'o+0',
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
    const r = c.queueToVatExport(
      'bootstrap',
      'o+0',
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

  const rz1 = c.queueToVatExport(
    'bootstrap',
    'o+0',
    'testCacheOverflow',
    capargs([`zot1`, false]),
  );
  await c.run();
  t.is(c.kpStatus(rz1), 'fulfilled');
  t.deepEqual(nextLog(), []);
  t.deepEqual(c.kpResolution(rz1), slot0('zot', 'ko31'));

  const rz2 = c.queueToVatExport(
    'bootstrap',
    'o+0',
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

test('exercise cache', async t => {
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        sourceSpec: path.resolve(__dirname, 'vat-representative-bootstrap.js'),
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
    const r = c.queueToVatExport('bootstrap', 'o+0', method, sendArgs);
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
  function thingID(num) {
    return `v1.vs.vom.o+1/${num}`;
  }
  function thingVal(name) {
    return JSON.stringify({
      name: capdata(JSON.stringify(name)),
    });
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
  await make('thing2', false, T2); // make t2 - [t2 t1]
  await read(T1, 'thing1'); // refresh t1 - [t1 t2]
  await read(T2, 'thing2'); // refresh t2 - [t2 t1]
  await readHeld('thing1'); // refresh t1 - [t1 t2]

  await make('thing3', false, T3); // make t3 - [t3 t1 t2]
  await make('thing4', false, T4); // make t4 - [t4 t3 t1 t2]
  t.deepEqual(log, []);
  await make('thing5', false, T5); // evict t2, make t5 - [t5 t4 t3 t1]
  t.deepEqual(log.shift(), ['set', thingID(2), thingVal('thing2')]);
  await make('thing6', false, T6); // evict t1, make t6 - [t6 t5 t4 t3]
  t.deepEqual(log.shift(), ['set', thingID(1), thingVal('thing1')]);
  await make('thing7', false, T7); // evict t3, make t7 - [t7 t6 t5 t4]
  t.deepEqual(log.shift(), ['set', thingID(3), thingVal('thing3')]);
  await make('thing8', false, T8); // evict t4, make t8 - [t8 t7 t6 t5]
  t.deepEqual(log.shift(), ['set', thingID(4), thingVal('thing4')]);

  await read(T2, 'thing2'); // reanimate t2, evict t5 - [t2 t8 t7 t6]
  t.deepEqual(log.shift(), ['get', thingID(2), thingVal('thing2')]);
  t.deepEqual(log.shift(), ['set', thingID(5), thingVal('thing5')]);
  await readHeld('thing1'); // reanimate t1, evict t6 - [t1 t2 t8 t7]
  t.deepEqual(log.shift(), ['get', thingID(1), thingVal('thing1')]);
  t.deepEqual(log.shift(), ['set', thingID(6), thingVal('thing6')]);

  await write(T2, 'thing2 updated'); // refresh t2 - [t2 t1 t8 t7]
  await writeHeld('thing1 updated'); // refresh t1 - [t1 t2 t8 t7]

  await read(T8, 'thing8'); // refresh t8 - [t8 t1 t2 t7]
  await read(T7, 'thing7'); // refresh t7 - [t7 t8 t1 t2]
  t.deepEqual(log, []);
  await read(T6, 'thing6'); // reanimate t6, evict t2 - [t6 t7 t8 t1]
  t.deepEqual(log.shift(), ['get', thingID(6), thingVal('thing6')]);
  t.deepEqual(log.shift(), ['set', thingID(2), thingVal('thing2 updated')]);
  await read(T5, 'thing5'); // reanimate t5, evict t1 - [t5 t6 t7 t8]
  t.deepEqual(log.shift(), ['get', thingID(5), thingVal('thing5')]);
  t.deepEqual(log.shift(), ['set', thingID(1), thingVal('thing1 updated')]);
  await read(T4, 'thing4'); // reanimate t4, evict t8 - [t4 t5 t6 t7]
  t.deepEqual(log.shift(), ['get', thingID(4), thingVal('thing4')]);
  t.deepEqual(log.shift(), ['set', thingID(8), thingVal('thing8')]);
  await read(T3, 'thing3'); // reanimate t3, evict t7 - [t3 t4 t5 t6]
  t.deepEqual(log.shift(), ['get', thingID(3), thingVal('thing3')]);
  t.deepEqual(log.shift(), ['set', thingID(7), thingVal('thing7')]);

  await read(T2, 'thing2 updated'); // reanimate t2, evict t6 - [t2 t3 t4 t5]
  t.deepEqual(log.shift(), ['get', thingID(2), thingVal('thing2 updated')]);
  await readHeld('thing1 updated'); // reanimate t1, evict t5 - [t1 t2 t3 t4]
  t.deepEqual(log.shift(), ['get', thingID(1), thingVal('thing1 updated')]);

  await forgetHeld(); // cache unchanged - [t1 t2 t3 t4]
  await hold(T8); // cache unchanged - [t1 t2 t3 t4]
  t.deepEqual(log, []);
  await read(T7, 'thing7'); // reanimate t7, evict t4 - [t7 t1 t2 t3]
  t.deepEqual(log.shift(), ['get', thingID(7), thingVal('thing7')]);
  await writeHeld('thing8 updated'); // reanimate t8, evict t3 - [t8 t7 t1 t2]
  t.deepEqual(log.shift(), ['get', thingID(8), thingVal('thing8')]);
  t.deepEqual(log, []);
});
