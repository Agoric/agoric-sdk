import harden from '@agoric/harden';
import { test } from 'tape-promise/tape';
import {
  makeMemorySwingStore,
  getAllState,
  setAllState,
} from '@agoric/simple-swing-store';
import { buildHostDBInMemory } from '../src/hostStorage';
import { buildBlockBuffer } from '../src/blockBuffer';
import makeKernelKeeper from '../src/kernel/state/kernelKeeper';
import {
  guardStorage,
  buildCrankBuffer,
  addReadCache,
  addHelpers,
  wrapStorage,
} from '../src/kernel/state/storageWrapper';

function checkState(t, getState, expected) {
  const state = getState();
  const got = [];
  for (const key of Object.getOwnPropertyNames(state)) {
    got.push([key, state[key]]);
  }
  function compareStrings(a, b) {
    if (a > b) {
      return 1;
    }
    if (a < b) {
      return -1;
    }
    return 0;
  }
  t.deepEqual(got.sort(compareStrings), expected.sort(compareStrings));
}

function testStorage(t, s, getState, commit) {
  t.notOk(s.has('missing'));
  t.equal(s.get('missing'), undefined);

  s.set('foo', 'f');
  t.ok(s.has('foo'));
  t.equal(s.get('foo'), 'f');

  s.set('foo2', 'f2');
  s.set('foo1', 'f1');
  s.set('foo3', 'f3');
  t.deepEqual(Array.from(s.getKeys('foo1', 'foo3')), ['foo1', 'foo2']);
  t.deepEqual(Array.from(s.getKeys('foo1', 'foo4')), ['foo1', 'foo2', 'foo3']);

  s.delete('foo2');
  t.notOk(s.has('foo2'));
  t.equal(s.get('foo2'), undefined);
  t.deepEqual(Array.from(s.getKeys('foo1', 'foo4')), ['foo1', 'foo3']);

  if (commit) {
    checkState(t, getState, []);
    commit();
  }
  checkState(t, getState, [
    ['foo', 'f'],
    ['foo1', 'f1'],
    ['foo3', 'f3'],
  ]);
}

test('storageInMemory', t => {
  const { storage } = makeMemorySwingStore();
  testStorage(t, storage, () => getAllState(storage), null);
  t.end();
});

function buildHostDBAndGetState() {
  const { storage } = makeMemorySwingStore();
  const hostDB = buildHostDBInMemory(storage);
  return { hostDB, getState: () => getAllState(storage) };
}

test('hostDBInMemory', t => {
  const { hostDB, getState } = buildHostDBAndGetState();

  t.notOk(hostDB.has('missing'));
  t.equal(hostDB.get('missing'), undefined);

  hostDB.applyBatch([{ op: 'set', key: 'foo', value: 'f' }]);
  t.ok(hostDB.has('foo'));
  t.equal(hostDB.get('foo'), 'f');

  hostDB.applyBatch([
    { op: 'set', key: 'foo2', value: 'f2' },
    { op: 'set', key: 'foo1', value: 'f1' },
    { op: 'set', key: 'foo3', value: 'f3' },
  ]);
  t.deepEqual(Array.from(hostDB.getKeys('foo1', 'foo3')), ['foo1', 'foo2']);
  t.deepEqual(Array.from(hostDB.getKeys('foo1', 'foo4')), [
    'foo1',
    'foo2',
    'foo3',
  ]);

  hostDB.applyBatch([{ op: 'delete', key: 'foo2' }]);
  t.notOk(hostDB.has('foo2'));
  t.equal(hostDB.get('foo2'), undefined);
  t.deepEqual(Array.from(hostDB.getKeys('foo1', 'foo4')), ['foo1', 'foo3']);

  checkState(t, getState, [
    ['foo', 'f'],
    ['foo1', 'f1'],
    ['foo3', 'f3'],
  ]);
  t.end();
});

test('blockBuffer fulfills storage API', t => {
  const { hostDB, getState } = buildHostDBAndGetState();
  const { blockBuffer, commitBlock } = buildBlockBuffer(hostDB);
  testStorage(t, blockBuffer, getState, commitBlock);
  t.end();
});

test('guardStorage fulfills storage API', t => {
  const { storage } = makeMemorySwingStore();
  const guardedHostStorage = guardStorage(storage);
  testStorage(t, guardedHostStorage, () => getAllState(storage), null);
  t.end();
});

test('crankBuffer fulfills storage API', t => {
  const { storage } = makeMemorySwingStore();
  const { crankBuffer, commitCrank } = buildCrankBuffer(storage);
  testStorage(t, crankBuffer, () => getAllState(storage), commitCrank);
  t.end();
});

test('crankBuffer can abortCrank', t => {
  const { hostDB, getState } = buildHostDBAndGetState();
  const { blockBuffer, commitBlock } = buildBlockBuffer(hostDB);
  const { crankBuffer: s, commitCrank, abortCrank } = buildCrankBuffer(
    blockBuffer,
  );

  s.set('foo', 'f');
  t.ok(s.has('foo'));
  t.equal(s.get('foo'), 'f');

  s.set('foo2', 'f2');
  s.set('foo1', 'f1');
  s.set('foo3', 'f3');
  t.deepEqual(Array.from(s.getKeys('foo1', 'foo3')), ['foo1', 'foo2']);
  t.deepEqual(Array.from(s.getKeys('foo1', 'foo4')), ['foo1', 'foo2', 'foo3']);

  s.delete('foo2');
  t.notOk(s.has('foo2'));
  t.equal(s.get('foo2'), undefined);
  t.deepEqual(Array.from(s.getKeys('foo1', 'foo4')), ['foo1', 'foo3']);

  commitBlock();
  checkState(t, getState, []);

  commitCrank();
  checkState(t, getState, []);

  commitBlock();
  checkState(t, getState, [
    ['foo', 'f'],
    ['foo1', 'f1'],
    ['foo3', 'f3'],
  ]);

  s.set('foo4', 'f4');
  abortCrank();
  commitBlock();
  checkState(t, getState, [
    ['foo', 'f'],
    ['foo1', 'f1'],
    ['foo3', 'f3'],
  ]);

  s.set('foo5', 'f5');
  commitCrank();
  commitBlock();
  checkState(t, getState, [
    ['foo', 'f'],
    ['foo1', 'f1'],
    ['foo3', 'f3'],
    ['foo5', 'f5'],
  ]);

  t.end();
});

test('read cache fulfills storage API', t => {
  // cache everything
  let { storage } = makeMemorySwingStore();
  let cachedStorage = addReadCache(storage, _key => true);
  testStorage(t, cachedStorage, () => getAllState(storage), null);

  // test again, but don't cache anything
  storage = makeMemorySwingStore().storage;
  cachedStorage = addReadCache(storage, _key => false);
  testStorage(t, cachedStorage, () => getAllState(storage), null);
  t.end();
});

function buildTracedStorage() {
  const s = makeMemorySwingStore().storage;

  const ops = [];
  function has(key) {
    ops.push(`has-${key}`);
    return s.has(key);
  }

  function getKeys(start, end) {
    ops.push(`getKeys-${start}-${end}`);
    return s.getKeys(start, end);
  }

  function get(key) {
    ops.push(`get-${key}`);
    return s.get(key);
  }

  function set(key, value) {
    ops.push(`set-${key}-${value}`);
    s.set(key, value);
  }

  function del(key) {
    ops.push(`delete-${key}`);
    s.delete(key);
  }

  const storage = {
    has,
    getKeys,
    get,
    set,
    delete: del,
  };

  return { storage, ops, getState: () => getAllState(s) };
}

test('read cache', t => {
  const { storage, ops, getState } = buildTracedStorage();

  function useCache(key) {
    if (key === 'foo') {
      return true;
    }
    return false;
  }
  const s = addReadCache(storage, useCache);

  t.notOk(s.has('foo'));
  t.equal(ops.shift(), 'has-foo');
  t.equal(ops.length, 0);

  t.deepEqual(Array.from(s.getKeys('a', 'z')), []);
  t.equal(ops.shift(), 'getKeys-a-z');

  t.equal(s.get('foo'), undefined);
  t.equal(ops.shift(), 'get-foo');
  t.equal(ops.length, 0);

  t.equal(s.get('foo'), undefined);
  t.equal(ops.length, 0);

  s.set('foo', 'f1');
  t.equal(ops.shift(), 'set-foo-f1');
  t.equal(ops.length, 0);
  checkState(t, getState, [['foo', 'f1']]);

  t.equal(s.get('foo'), 'f1');
  t.equal(ops.length, 0);

  t.deepEqual(Array.from(s.getKeys('a', 'z')), ['foo']);
  t.equal(ops.shift(), 'getKeys-a-z', 'getKeys bypasses the cache');

  s.delete('foo');
  t.equal(ops.shift(), 'delete-foo');
  t.equal(ops.length, 0);
  checkState(t, getState, []);

  // Deleting an entry currently removes it from the cache. It would also be
  // correct to put an 'undefined' in the cache, but deletion is a good
  // signal that we aren't going to read from that key again, so deleting it
  // entirely makes more sense.
  t.equal(s.get('foo'), undefined);
  t.equal(ops.shift(), 'get-foo');
  t.equal(ops.length, 0);

  // now examine a non-cached key

  t.notOk(s.has('bar'));
  t.equal(ops.shift(), 'has-bar');
  t.equal(ops.length, 0);

  t.deepEqual(Array.from(s.getKeys('a', 'z')), []);
  t.equal(ops.shift(), 'getKeys-a-z');

  t.equal(s.get('bar'), undefined);
  t.equal(ops.shift(), 'get-bar');
  t.equal(ops.length, 0);

  t.equal(s.get('bar'), undefined);
  t.equal(ops.shift(), 'get-bar');
  t.equal(ops.length, 0);

  s.set('bar', 'f1');
  t.equal(ops.shift(), 'set-bar-f1', 'set must write through');
  t.equal(ops.length, 0);
  checkState(t, getState, [['bar', 'f1']]);

  t.equal(s.get('bar'), 'f1');
  t.equal(ops.shift(), 'get-bar');
  t.equal(ops.length, 0);

  t.deepEqual(Array.from(s.getKeys('a', 'z')), ['bar']);
  t.equal(ops.shift(), 'getKeys-a-z', 'getKeys bypasses the cache');

  s.delete('bar');
  t.equal(ops.shift(), 'delete-bar', 'delete must write through');
  t.equal(ops.length, 0);
  checkState(t, getState, []);

  t.equal(s.get('bar'), undefined);
  t.equal(ops.shift(), 'get-bar');
  t.equal(ops.length, 0);

  return t.end();
});

test('storage helpers', t => {
  const { storage } = makeMemorySwingStore();
  const s = addHelpers(storage);

  s.set('foo.0', 'f0');
  s.set('foo.1', 'f1');
  s.set('foo.2', 'f2');
  s.set('foo.3', 'f3');
  // omit foo.4
  s.set('foo.5', 'f5');
  checkState(t, () => getAllState(storage), [
    ['foo.0', 'f0'],
    ['foo.1', 'f1'],
    ['foo.2', 'f2'],
    ['foo.3', 'f3'],
    ['foo.5', 'f5'],
  ]);

  t.deepEqual(Array.from(s.enumeratePrefixedKeys('foo.', 0)), [
    'foo.0',
    'foo.1',
    'foo.2',
    'foo.3',
  ]);
  t.deepEqual(Array.from(s.enumeratePrefixedKeys('foo.', 1)), [
    'foo.1',
    'foo.2',
    'foo.3',
  ]);
  t.deepEqual(Array.from(s.getPrefixedValues('foo.', 0)), [
    'f0',
    'f1',
    'f2',
    'f3',
  ]);
  t.deepEqual(Array.from(s.getPrefixedValues('foo.', 1)), ['f1', 'f2', 'f3']);

  s.deletePrefixedKeys('foo.', 1);
  t.ok(s.has('foo.0'));
  t.notOk(s.has('foo.1'));
  t.notOk(s.has('foo.2'));
  t.notOk(s.has('foo.3'));
  t.notOk(s.has('foo.4'));
  t.ok(s.has('foo.5'));
  checkState(t, () => getAllState(storage), [
    ['foo.0', 'f0'],
    ['foo.5', 'f5'],
  ]);

  t.end();
});

function buildKeeperStorageInMemory() {
  const { storage } = makeMemorySwingStore();
  const { enhancedCrankBuffer, commitCrank } = wrapStorage(storage);
  return {
    kstorage: enhancedCrankBuffer,
    getState: () => getAllState(storage),
    commitCrank,
  };
}

function duplicateKeeper(getState) {
  const { storage } = makeMemorySwingStore();
  setAllState(storage, getState());
  const { enhancedCrankBuffer } = wrapStorage(storage);
  return makeKernelKeeper(enhancedCrankBuffer);
}

test('kernel state', async t => {
  const { kstorage, getState, commitCrank } = buildKeeperStorageInMemory();
  const k = makeKernelKeeper(kstorage);
  t.ok(!k.getInitialized());
  k.createStartingKernelState();
  k.setInitialized();

  commitCrank();
  checkState(t, getState, [
    ['initialized', 'true'],
    ['runQueue', '[]'],
    ['vat.nextID', '1'],
    ['vat.names', '[]'],
    ['device.names', '[]'],
    ['device.nextID', '7'],
    ['ko.nextID', '20'],
    ['kd.nextID', '30'],
    ['kp.nextID', '40'],
  ]);
  t.end();
});

test('kernelKeeper vat names', async t => {
  const { kstorage, getState, commitCrank } = buildKeeperStorageInMemory();
  const k = makeKernelKeeper(kstorage);
  k.createStartingKernelState();

  const v1 = k.allocateVatIDForNameIfNeeded('vatname5');
  const v2 = k.allocateVatIDForNameIfNeeded('Frank');
  t.equal(v1, 'v1');
  t.equal(v2, 'v2');

  commitCrank();
  checkState(t, getState, [
    ['runQueue', '[]'],
    ['vat.nextID', '3'],
    ['vat.names', JSON.stringify(['vatname5', 'Frank'])],
    ['device.names', '[]'],
    ['device.nextID', '7'],
    ['ko.nextID', '20'],
    ['kd.nextID', '30'],
    ['kp.nextID', '40'],
    ['vat.name.vatname5', 'v1'],
    ['vat.name.Frank', 'v2'],
  ]);
  t.deepEqual(k.getAllVatNames(), ['Frank', 'vatname5']);
  t.equal(k.getVatIDForName('Frank'), v2);
  t.equal(k.allocateVatIDForNameIfNeeded('Frank'), v2);

  const k2 = duplicateKeeper(getState);
  t.deepEqual(k2.getAllVatNames(), ['Frank', 'vatname5']);
  t.equal(k2.getVatIDForName('Frank'), v2);
  t.equal(k2.allocateVatIDForNameIfNeeded('Frank'), v2);
  t.end();
});

test('kernelKeeper device names', async t => {
  const { kstorage, getState, commitCrank } = buildKeeperStorageInMemory();
  const k = makeKernelKeeper(kstorage);
  k.createStartingKernelState();

  const d7 = k.allocateDeviceIDForNameIfNeeded('devicename5');
  const d8 = k.allocateDeviceIDForNameIfNeeded('Frank');
  t.equal(d7, 'd7');
  t.equal(d8, 'd8');

  commitCrank();
  checkState(t, getState, [
    ['runQueue', '[]'],
    ['vat.nextID', '1'],
    ['vat.names', '[]'],
    ['device.nextID', '9'],
    ['device.names', JSON.stringify(['devicename5', 'Frank'])],
    ['ko.nextID', '20'],
    ['kd.nextID', '30'],
    ['kp.nextID', '40'],
    ['device.name.devicename5', 'd7'],
    ['device.name.Frank', 'd8'],
  ]);
  t.deepEqual(k.getAllDeviceNames(), ['Frank', 'devicename5']);
  t.equal(k.getDeviceIDForName('Frank'), d8);
  t.equal(k.allocateDeviceIDForNameIfNeeded('Frank'), d8);

  const k2 = duplicateKeeper(getState);
  t.deepEqual(k2.getAllDeviceNames(), ['Frank', 'devicename5']);
  t.equal(k2.getDeviceIDForName('Frank'), d8);
  t.equal(k2.allocateDeviceIDForNameIfNeeded('Frank'), d8);
  t.end();
});

test('kernelKeeper runQueue', async t => {
  const { kstorage, getState, commitCrank } = buildKeeperStorageInMemory();
  const k = makeKernelKeeper(kstorage);
  k.createStartingKernelState();

  t.ok(k.isRunQueueEmpty());
  t.equal(k.getRunQueueLength(), 0);

  k.addToRunQueue({ type: 'send', stuff: 'awesome' });
  t.notOk(k.isRunQueueEmpty());
  t.equal(k.getRunQueueLength(), 1);

  k.addToRunQueue({ type: 'notify', stuff: 'notifawesome' });
  t.notOk(k.isRunQueueEmpty());
  t.equal(k.getRunQueueLength(), 2);

  commitCrank();
  const k2 = duplicateKeeper(getState);

  t.deepEqual(k.getNextMsg(), { type: 'send', stuff: 'awesome' });
  t.notOk(k.isRunQueueEmpty());
  t.equal(k.getRunQueueLength(), 1);

  t.deepEqual(k.getNextMsg(), { type: 'notify', stuff: 'notifawesome' });
  t.ok(k.isRunQueueEmpty());
  t.equal(k.getRunQueueLength(), 0);

  t.deepEqual(k2.getNextMsg(), { type: 'send', stuff: 'awesome' });
  t.notOk(k2.isRunQueueEmpty());
  t.equal(k2.getRunQueueLength(), 1);

  t.deepEqual(k2.getNextMsg(), { type: 'notify', stuff: 'notifawesome' });
  t.ok(k2.isRunQueueEmpty());
  t.equal(k2.getRunQueueLength(), 0);

  t.end();
});

test('kernelKeeper promises', async t => {
  const { kstorage, getState, commitCrank } = buildKeeperStorageInMemory();
  const k = makeKernelKeeper(kstorage);
  k.createStartingKernelState();

  const p1 = k.addKernelPromise('v4');
  t.deepEqual(k.getKernelPromise(p1), {
    state: 'unresolved',
    queue: [],
    subscribers: [],
    decider: 'v4',
  });
  t.ok(k.hasKernelPromise(p1));
  t.notOk(k.hasKernelPromise('kp99'));

  commitCrank();
  let k2 = duplicateKeeper(getState);

  t.deepEqual(k2.getKernelPromise(p1), {
    state: 'unresolved',
    queue: [],
    subscribers: [],
    decider: 'v4',
  });
  t.ok(k2.hasKernelPromise(p1));

  k.clearDecider(p1);
  t.deepEqual(k.getKernelPromise(p1), {
    state: 'unresolved',
    queue: [],
    subscribers: [],
    decider: undefined,
  });

  commitCrank();
  k2 = duplicateKeeper(getState);
  t.deepEqual(k2.getKernelPromise(p1), {
    state: 'unresolved',
    queue: [],
    subscribers: [],
    decider: undefined,
  });

  k.setDecider(p1, 'v7');
  t.deepEqual(k.getKernelPromise(p1), {
    state: 'unresolved',
    queue: [],
    subscribers: [],
    decider: 'v7',
  });

  k.addSubscriberToPromise(p1, 'v5');
  t.deepEqual(k.getKernelPromise(p1).subscribers, ['v5']);
  k.addSubscriberToPromise(p1, 'v3');
  t.deepEqual(k.getKernelPromise(p1).subscribers, ['v3', 'v5']);

  k.addMessageToPromiseQueue(p1, { type: 'send' });
  k.addMessageToPromiseQueue(p1, { type: 'notify' });
  k.addMessageToPromiseQueue(p1, { type: 'send', more: [2] });
  t.deepEqual(k.getKernelPromise(p1).queue, [
    { type: 'send' },
    { type: 'notify' },
    { type: 'send', more: [2] },
  ]);

  commitCrank();
  k2 = duplicateKeeper(getState);
  t.deepEqual(k2.getKernelPromise(p1).queue, [
    { type: 'send' },
    { type: 'notify' },
    { type: 'send', more: [2] },
  ]);

  k.fulfillKernelPromiseToPresence(p1, 'ko44');
  t.deepEqual(k.getKernelPromise(p1), {
    state: 'fulfilledToPresence',
    slot: 'ko44',
  });
  t.ok(k.hasKernelPromise(p1));
  // all the subscriber/queue stuff should be gone
  commitCrank();
  checkState(t, getState, [
    ['device.nextID', '7'],
    ['vat.nextID', '1'],
    ['vat.names', '[]'],
    ['device.names', '[]'],
    ['runQueue', '[]'],
    ['kd.nextID', '30'],
    ['ko.nextID', '20'],
    ['kp.nextID', '41'],
    ['kp40.slot', 'ko44'],
    ['kp40.state', 'fulfilledToPresence'],
  ]);
  t.end();
});

test('kernelKeeper promise resolveToData', async t => {
  const { kstorage } = buildKeeperStorageInMemory();
  const k = makeKernelKeeper(kstorage);
  k.createStartingKernelState();

  const p1 = k.addKernelPromise('v4');
  const capdata = harden({ body: 'bodyjson', slots: ['ko22', 'kp24', 'kd25'] });
  k.fulfillKernelPromiseToData(p1, capdata);
  t.deepEqual(k.getKernelPromise(p1), {
    state: 'fulfilledToData',
    data: {
      body: 'bodyjson',
      slots: ['ko22', 'kp24', 'kd25'],
    },
  });
  t.end();
});

test('kernelKeeper promise reject', async t => {
  const { kstorage } = buildKeeperStorageInMemory();
  const k = makeKernelKeeper(kstorage);
  k.createStartingKernelState();

  const p1 = k.addKernelPromise('v4');
  const capdata = harden({ body: 'bodyjson', slots: ['ko22', 'kp24', 'kd25'] });
  k.rejectKernelPromise(p1, capdata);
  t.deepEqual(k.getKernelPromise(p1), {
    state: 'rejected',
    data: {
      body: 'bodyjson',
      slots: ['ko22', 'kp24', 'kd25'],
    },
  });
  t.end();
});

test('vatKeeper', async t => {
  const { kstorage, getState, commitCrank } = buildKeeperStorageInMemory();
  const k = makeKernelKeeper(kstorage);
  k.createStartingKernelState();

  const v1 = k.allocateVatIDForNameIfNeeded('name1');
  const vk = k.allocateVatKeeperIfNeeded(v1);
  t.is(vk, k.allocateVatKeeperIfNeeded(v1));

  const vatExport1 = 'o+4';
  const kernelExport1 = vk.mapVatSlotToKernelSlot(vatExport1);
  t.equal(kernelExport1, 'ko20');
  t.equal(vk.mapVatSlotToKernelSlot(vatExport1), kernelExport1);
  t.equal(vk.mapKernelSlotToVatSlot(kernelExport1), vatExport1);

  commitCrank();
  let vk2 = duplicateKeeper(getState).allocateVatKeeperIfNeeded(v1);
  t.equal(vk2.mapVatSlotToKernelSlot(vatExport1), kernelExport1);
  t.equal(vk2.mapKernelSlotToVatSlot(kernelExport1), vatExport1);

  const kernelImport2 = 'ko25';
  const vatImport2 = vk.mapKernelSlotToVatSlot(kernelImport2);
  t.equal(vatImport2, 'o-50');
  t.equal(vk.mapKernelSlotToVatSlot(kernelImport2), vatImport2);
  t.equal(vk.mapVatSlotToKernelSlot(vatImport2), kernelImport2);

  commitCrank();
  vk2 = duplicateKeeper(getState).allocateVatKeeperIfNeeded(v1);
  t.equal(vk2.mapKernelSlotToVatSlot(kernelImport2), vatImport2);
  t.equal(vk2.mapVatSlotToKernelSlot(vatImport2), kernelImport2);

  t.end();
});
