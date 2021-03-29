import { test } from '../tools/prepare-test-env-ava';

// eslint-disable-next-line import/order
import {
  initSwingStore,
  getAllState,
  setAllState,
} from '@agoric/swing-store-simple';
import { buildHostDBInMemory } from '../src/hostStorage';
import { buildBlockBuffer } from '../src/blockBuffer';
import makeKernelKeeper from '../src/kernel/state/kernelKeeper';
import {
  guardStorage,
  buildCrankBuffer,
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
  t.falsy(s.has('missing'));
  t.is(s.get('missing'), undefined);

  s.set('foo', 'f');
  t.truthy(s.has('foo'));
  t.is(s.get('foo'), 'f');

  s.set('foo2', 'f2');
  s.set('foo1', 'f1');
  s.set('foo3', 'f3');
  t.deepEqual(Array.from(s.getKeys('foo1', 'foo3')), ['foo1', 'foo2']);
  t.deepEqual(Array.from(s.getKeys('foo1', 'foo4')), ['foo1', 'foo2', 'foo3']);

  s.delete('foo2');
  t.falsy(s.has('foo2'));
  t.is(s.get('foo2'), undefined);
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
  const { storage } = initSwingStore();
  testStorage(t, storage, () => getAllState(storage), null);
});

function buildHostDBAndGetState() {
  const { storage } = initSwingStore();
  const hostDB = buildHostDBInMemory(storage);
  return { hostDB, getState: () => getAllState(storage) };
}

test('hostDBInMemory', t => {
  const { hostDB, getState } = buildHostDBAndGetState();

  t.falsy(hostDB.has('missing'));
  t.is(hostDB.get('missing'), undefined);

  hostDB.applyBatch([{ op: 'set', key: 'foo', value: 'f' }]);
  t.truthy(hostDB.has('foo'));
  t.is(hostDB.get('foo'), 'f');

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
  t.falsy(hostDB.has('foo2'));
  t.is(hostDB.get('foo2'), undefined);
  t.deepEqual(Array.from(hostDB.getKeys('foo1', 'foo4')), ['foo1', 'foo3']);

  checkState(t, getState, [
    ['foo', 'f'],
    ['foo1', 'f1'],
    ['foo3', 'f3'],
  ]);
});

test('blockBuffer fulfills storage API', t => {
  const { hostDB, getState } = buildHostDBAndGetState();
  const { blockBuffer, commitBlock } = buildBlockBuffer(hostDB);
  testStorage(t, blockBuffer, getState, commitBlock);
});

test('guardStorage fulfills storage API', t => {
  const { storage } = initSwingStore();
  const guardedHostStorage = guardStorage(storage);
  testStorage(t, guardedHostStorage, () => getAllState(storage), null);
});

test('crankBuffer fulfills storage API', t => {
  const { storage } = initSwingStore();
  const { crankBuffer, commitCrank } = buildCrankBuffer(storage);
  testStorage(t, crankBuffer, () => getAllState(storage), commitCrank);
});

test('crankBuffer can abortCrank', t => {
  const { hostDB, getState } = buildHostDBAndGetState();
  const { blockBuffer, commitBlock } = buildBlockBuffer(hostDB);
  const { crankBuffer: s, commitCrank, abortCrank } = buildCrankBuffer(
    blockBuffer,
  );

  s.set('foo', 'f');
  t.truthy(s.has('foo'));
  t.is(s.get('foo'), 'f');

  s.set('foo2', 'f2');
  s.set('foo1', 'f1');
  s.set('foo3', 'f3');
  t.deepEqual(Array.from(s.getKeys('foo1', 'foo3')), ['foo1', 'foo2']);
  t.deepEqual(Array.from(s.getKeys('foo1', 'foo4')), ['foo1', 'foo2', 'foo3']);

  s.delete('foo2');
  t.falsy(s.has('foo2'));
  t.is(s.get('foo2'), undefined);
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
});

test('storage helpers', t => {
  const { storage } = initSwingStore();
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
  t.truthy(s.has('foo.0'));
  t.falsy(s.has('foo.1'));
  t.falsy(s.has('foo.2'));
  t.falsy(s.has('foo.3'));
  t.falsy(s.has('foo.4'));
  t.truthy(s.has('foo.5'));
  checkState(t, () => getAllState(storage), [
    ['foo.0', 'f0'],
    ['foo.5', 'f5'],
  ]);
});

function buildKeeperStorageInMemory() {
  const { storage } = initSwingStore();
  const { enhancedCrankBuffer, commitCrank } = wrapStorage(storage);
  return {
    kstorage: enhancedCrankBuffer,
    getState: () => getAllState(storage),
    commitCrank,
  };
}

function duplicateKeeper(getState) {
  const { storage } = initSwingStore();
  setAllState(storage, getState());
  const { enhancedCrankBuffer } = wrapStorage(storage);
  return makeKernelKeeper(enhancedCrankBuffer);
}

test('hostStorage param guards', async t => {
  const { kstorage, commitCrank } = buildKeeperStorageInMemory();
  kstorage.set('foo', true);
  t.throws(commitCrank, { message: /must be a string/ });
  kstorage.set(true, 'foo');
  t.throws(commitCrank, { message: /must be a string/ });
  kstorage.has(true);
  t.throws(commitCrank, { message: /must be a string/ });
  kstorage.getKeys('foo', true);
  t.throws(commitCrank, { message: /must be a string/ });
  kstorage.getKeys(true, 'foo');
  t.throws(commitCrank, { message: /must be a string/ });
  kstorage.get(true);
  t.throws(commitCrank, { message: /must be a string/ });
  kstorage.delete(true);
  t.throws(commitCrank, { message: /must be a string/ });
});

test('kernel state', async t => {
  const { kstorage, getState, commitCrank } = buildKeeperStorageInMemory();
  const k = makeKernelKeeper(kstorage);
  t.truthy(!k.getInitialized());
  k.createStartingKernelState('local');
  k.setInitialized();

  commitCrank();
  checkState(t, getState, [
    ['crankNumber', '0'],
    ['initialized', 'true'],
    ['runQueue', '[]'],
    ['vat.nextID', '1'],
    ['vat.names', '[]'],
    ['vat.dynamicIDs', '[]'],
    ['device.names', '[]'],
    ['device.nextID', '7'],
    ['ko.nextID', '20'],
    ['kd.nextID', '30'],
    ['kp.nextID', '40'],
    ['kernel.defaultManagerType', 'local'],
  ]);
});

test('kernelKeeper vat names', async t => {
  const { kstorage, getState, commitCrank } = buildKeeperStorageInMemory();
  const k = makeKernelKeeper(kstorage);
  k.createStartingKernelState('local');

  const v1 = k.allocateVatIDForNameIfNeeded('vatname5');
  const v2 = k.allocateVatIDForNameIfNeeded('Frank');
  t.is(v1, 'v1');
  t.is(v2, 'v2');

  commitCrank();
  checkState(t, getState, [
    ['crankNumber', '0'],
    ['runQueue', '[]'],
    ['vat.nextID', '3'],
    ['vat.names', JSON.stringify(['vatname5', 'Frank'])],
    ['vat.dynamicIDs', '[]'],
    ['device.names', '[]'],
    ['device.nextID', '7'],
    ['ko.nextID', '20'],
    ['kd.nextID', '30'],
    ['kp.nextID', '40'],
    ['vat.name.vatname5', 'v1'],
    ['vat.name.Frank', 'v2'],
    ['kernel.defaultManagerType', 'local'],
  ]);
  t.deepEqual(k.getStaticVats(), [
    ['Frank', 'v2'],
    ['vatname5', 'v1'],
  ]);
  t.is(k.getVatIDForName('Frank'), v2);
  t.is(k.allocateVatIDForNameIfNeeded('Frank'), v2);

  const k2 = duplicateKeeper(getState);
  t.deepEqual(k.getStaticVats(), [
    ['Frank', 'v2'],
    ['vatname5', 'v1'],
  ]);
  t.is(k2.getVatIDForName('Frank'), v2);
  t.is(k2.allocateVatIDForNameIfNeeded('Frank'), v2);
});

test('kernelKeeper device names', async t => {
  const { kstorage, getState, commitCrank } = buildKeeperStorageInMemory();
  const k = makeKernelKeeper(kstorage);
  k.createStartingKernelState('local');

  const d7 = k.allocateDeviceIDForNameIfNeeded('devicename5');
  const d8 = k.allocateDeviceIDForNameIfNeeded('Frank');
  t.is(d7, 'd7');
  t.is(d8, 'd8');

  commitCrank();
  checkState(t, getState, [
    ['crankNumber', '0'],
    ['runQueue', '[]'],
    ['vat.nextID', '1'],
    ['vat.names', '[]'],
    ['vat.dynamicIDs', '[]'],
    ['device.nextID', '9'],
    ['device.names', JSON.stringify(['devicename5', 'Frank'])],
    ['ko.nextID', '20'],
    ['kd.nextID', '30'],
    ['kp.nextID', '40'],
    ['device.name.devicename5', 'd7'],
    ['device.name.Frank', 'd8'],
    ['kernel.defaultManagerType', 'local'],
  ]);
  t.deepEqual(k.getDevices(), [
    ['Frank', 'd8'],
    ['devicename5', 'd7'],
  ]);
  t.is(k.getDeviceIDForName('Frank'), d8);
  t.is(k.allocateDeviceIDForNameIfNeeded('Frank'), d8);

  const k2 = duplicateKeeper(getState);
  t.deepEqual(k.getDevices(), [
    ['Frank', 'd8'],
    ['devicename5', 'd7'],
  ]);
  t.is(k2.getDeviceIDForName('Frank'), d8);
  t.is(k2.allocateDeviceIDForNameIfNeeded('Frank'), d8);
});

test('kernelKeeper runQueue', async t => {
  const { kstorage, getState, commitCrank } = buildKeeperStorageInMemory();
  const k = makeKernelKeeper(kstorage);
  k.createStartingKernelState('local');

  t.truthy(k.isRunQueueEmpty());
  t.is(k.getRunQueueLength(), 0);

  k.addToRunQueue({ type: 'send', stuff: 'awesome' });
  t.falsy(k.isRunQueueEmpty());
  t.is(k.getRunQueueLength(), 1);

  k.addToRunQueue({ type: 'notify', stuff: 'notifawesome' });
  t.falsy(k.isRunQueueEmpty());
  t.is(k.getRunQueueLength(), 2);

  commitCrank();
  const k2 = duplicateKeeper(getState);

  t.deepEqual(k.getNextMsg(), { type: 'send', stuff: 'awesome' });
  t.falsy(k.isRunQueueEmpty());
  t.is(k.getRunQueueLength(), 1);

  t.deepEqual(k.getNextMsg(), { type: 'notify', stuff: 'notifawesome' });
  t.truthy(k.isRunQueueEmpty());
  t.is(k.getRunQueueLength(), 0);

  t.deepEqual(k2.getNextMsg(), { type: 'send', stuff: 'awesome' });
  t.falsy(k2.isRunQueueEmpty());
  t.is(k2.getRunQueueLength(), 1);

  t.deepEqual(k2.getNextMsg(), { type: 'notify', stuff: 'notifawesome' });
  t.truthy(k2.isRunQueueEmpty());
  t.is(k2.getRunQueueLength(), 0);
});

test('kernelKeeper promises', async t => {
  const { kstorage, getState, commitCrank } = buildKeeperStorageInMemory();
  const k = makeKernelKeeper(kstorage);
  k.createStartingKernelState('local');

  const p1 = k.addKernelPromiseForVat('v4');
  t.deepEqual(k.getKernelPromise(p1), {
    state: 'unresolved',
    policy: 'ignore',
    refCount: 0,
    queue: [],
    subscribers: [],
    decider: 'v4',
  });
  t.truthy(k.hasKernelPromise(p1));
  t.falsy(k.hasKernelPromise('kp99'));

  commitCrank();
  let k2 = duplicateKeeper(getState);

  t.deepEqual(k2.getKernelPromise(p1), {
    state: 'unresolved',
    policy: 'ignore',
    refCount: 0,
    queue: [],
    subscribers: [],
    decider: 'v4',
  });
  t.truthy(k2.hasKernelPromise(p1));

  k.clearDecider(p1);
  t.deepEqual(k.getKernelPromise(p1), {
    state: 'unresolved',
    policy: 'ignore',
    refCount: 0,
    queue: [],
    subscribers: [],
    decider: undefined,
  });

  commitCrank();
  k2 = duplicateKeeper(getState);
  t.deepEqual(k2.getKernelPromise(p1), {
    state: 'unresolved',
    policy: 'ignore',
    refCount: 0,
    queue: [],
    subscribers: [],
    decider: undefined,
  });

  k.setDecider(p1, 'v7');
  t.deepEqual(k.getKernelPromise(p1), {
    state: 'unresolved',
    policy: 'ignore',
    refCount: 0,
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

  const capdata = harden({
    body: '{"@qclass":"slot","index":0}',
    slots: ['ko44'],
  });
  k.resolveKernelPromise(p1, false, capdata);
  t.deepEqual(k.getKernelPromise(p1), {
    state: 'fulfilled',
    refCount: 0,
    data: capdata,
  });
  t.truthy(k.hasKernelPromise(p1));
  // all the subscriber/queue stuff should be gone
  commitCrank();
  checkState(t, getState, [
    ['crankNumber', '0'],
    ['device.nextID', '7'],
    ['vat.nextID', '1'],
    ['vat.names', '[]'],
    ['vat.dynamicIDs', '[]'],
    ['device.names', '[]'],
    ['runQueue', '[]'],
    ['kd.nextID', '30'],
    ['ko.nextID', '20'],
    ['kp.nextID', '41'],
    ['kp40.data.body', '{"@qclass":"slot","index":0}'],
    ['kp40.data.slots', 'ko44'],
    ['kp40.state', 'fulfilled'],
    ['kp40.refCount', '0'],
    ['kernel.defaultManagerType', 'local'],
  ]);
});

test('kernelKeeper promise resolveToData', async t => {
  const { kstorage } = buildKeeperStorageInMemory();
  const k = makeKernelKeeper(kstorage);
  k.createStartingKernelState('local');

  const p1 = k.addKernelPromiseForVat('v4');
  const capdata = harden({
    body: '"bodyjson"',
    slots: ['ko22', 'kp24', 'kd25'],
  });
  k.resolveKernelPromise(p1, false, capdata);
  t.deepEqual(k.getKernelPromise(p1), {
    state: 'fulfilled',
    refCount: 0,
    data: {
      body: '"bodyjson"',
      slots: ['ko22', 'kp24', 'kd25'],
    },
  });
});

test('kernelKeeper promise reject', async t => {
  const { kstorage } = buildKeeperStorageInMemory();
  const k = makeKernelKeeper(kstorage);
  k.createStartingKernelState('local');

  const p1 = k.addKernelPromiseForVat('v4');
  const capdata = harden({
    body: '"bodyjson"',
    slots: ['ko22', 'kp24', 'kd25'],
  });
  k.resolveKernelPromise(p1, true, capdata);
  t.deepEqual(k.getKernelPromise(p1), {
    state: 'rejected',
    refCount: 0,
    data: {
      body: '"bodyjson"',
      slots: ['ko22', 'kp24', 'kd25'],
    },
  });
});

test('vatKeeper', async t => {
  const { kstorage, getState, commitCrank } = buildKeeperStorageInMemory();
  const k = makeKernelKeeper(kstorage);
  k.createStartingKernelState('local');

  const v1 = k.allocateVatIDForNameIfNeeded('name1');
  const vk = k.allocateVatKeeper(v1);
  t.is(vk, k.getVatKeeper(v1));

  const vatExport1 = 'o+4';
  const kernelExport1 = vk.mapVatSlotToKernelSlot(vatExport1);
  t.is(kernelExport1, 'ko20');
  t.is(vk.mapVatSlotToKernelSlot(vatExport1), kernelExport1);
  t.is(vk.mapKernelSlotToVatSlot(kernelExport1), vatExport1);

  commitCrank();
  let vk2 = duplicateKeeper(getState).allocateVatKeeper(v1);
  t.is(vk2.mapVatSlotToKernelSlot(vatExport1), kernelExport1);
  t.is(vk2.mapKernelSlotToVatSlot(kernelExport1), vatExport1);

  const kernelImport2 = 'ko25';
  const vatImport2 = vk.mapKernelSlotToVatSlot(kernelImport2);
  t.is(vatImport2, 'o-50');
  t.is(vk.mapKernelSlotToVatSlot(kernelImport2), vatImport2);
  t.is(vk.mapVatSlotToKernelSlot(vatImport2), kernelImport2);

  commitCrank();
  vk2 = duplicateKeeper(getState).allocateVatKeeper(v1);
  t.is(vk2.mapKernelSlotToVatSlot(kernelImport2), vatImport2);
  t.is(vk2.mapVatSlotToKernelSlot(vatImport2), kernelImport2);
});

test('XS vatKeeper defaultManagerType', async t => {
  const { kstorage } = buildKeeperStorageInMemory();
  const k = makeKernelKeeper(kstorage);
  k.createStartingKernelState('xs-worker');
  t.is(k.getDefaultManagerType(), 'xs-worker');
});
