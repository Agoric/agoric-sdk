import harden from '@agoric/harden';
import { test } from 'tape-promise/tape';
import makeKernelKeeper from '../src/kernel/state/kernelKeeper';

function checkState(t, k, expected) {
  const state = JSON.parse(k.getState());
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

test('kernel state', async t => {
  const k = makeKernelKeeper('{}');
  t.ok(!k.getInitialized());
  k.createStartingKernelState();
  k.setInitialized();
  checkState(t, k, [
    ['initialized', true],
    ['runQueue', '[]'],
    ['vat.nextID', '1'],
    ['vat.names', '[]'],
    ['device.names', '[]'],
    ['device.nextID', '7'],
    ['ko.nextID', '20'],
    ['kd.nextID', '30'],
    ['kp.nextID', '40'],
  ]);

  const k2 = makeKernelKeeper(k.getState());
  checkState(t, k2, [
    ['initialized', true],
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
  const k = makeKernelKeeper('{}');
  k.createStartingKernelState();
  const v1 = k.provideVatIDForName('vatname5');
  const v2 = k.provideVatIDForName('Frank');
  t.equal(v1, 'v1');
  t.equal(v2, 'v2');
  checkState(t, k, [
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
  t.equal(k.provideVatIDForName('Frank'), v2);

  const k2 = makeKernelKeeper(k.getState());
  t.deepEqual(k2.getAllVatNames(), ['Frank', 'vatname5']);
  t.equal(k2.getVatIDForName('Frank'), v2);
  t.equal(k2.provideVatIDForName('Frank'), v2);
  t.end();
});

test('kernelKeeper device names', async t => {
  const k = makeKernelKeeper('{}');
  k.createStartingKernelState();
  const d7 = k.provideDeviceIDForName('devicename5');
  const d8 = k.provideDeviceIDForName('Frank');
  t.equal(d7, 'd7');
  t.equal(d8, 'd8');
  checkState(t, k, [
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
  t.equal(k.provideDeviceIDForName('Frank'), d8);

  const k2 = makeKernelKeeper(k.getState());
  t.deepEqual(k2.getAllDeviceNames(), ['Frank', 'devicename5']);
  t.equal(k2.getDeviceIDForName('Frank'), d8);
  t.equal(k2.provideDeviceIDForName('Frank'), d8);
  t.end();
});

test('kernelKeeper runQueue', async t => {
  const k = makeKernelKeeper('{}');
  k.createStartingKernelState();
  t.ok(k.isRunQueueEmpty());
  t.equal(k.getRunQueueLength(), 0);

  k.addToRunQueue({ type: 'send', stuff: 'awesome' });
  t.notOk(k.isRunQueueEmpty());
  t.equal(k.getRunQueueLength(), 1);

  k.addToRunQueue({ type: 'notify', stuff: 'notifawesome' });
  t.notOk(k.isRunQueueEmpty());
  t.equal(k.getRunQueueLength(), 2);
  const k2 = makeKernelKeeper(k.getState());

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
  const k = makeKernelKeeper('{}');
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
  let k2 = makeKernelKeeper(k.getState());
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
  k2 = makeKernelKeeper(k.getState());
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
  k2 = makeKernelKeeper(k.getState());
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
  checkState(t, k, [
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
  const k = makeKernelKeeper('{}');
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
  const k = makeKernelKeeper('{}');
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
  const k = makeKernelKeeper('{}');
  k.createStartingKernelState();
  const v1 = k.provideVatIDForName('name1');
  const vk = k.provideVatKeeper(v1);
  t.is(vk, k.provideVatKeeper(v1));

  const vatExport1 = 'o+4';
  const kernelExport1 = vk.mapVatSlotToKernelSlot(vatExport1);
  t.equal(kernelExport1, 'ko20');
  t.equal(vk.mapVatSlotToKernelSlot(vatExport1), kernelExport1);
  t.equal(vk.mapKernelSlotToVatSlot(kernelExport1), vatExport1);

  let vk2;
  vk2 = makeKernelKeeper(k.getState()).provideVatKeeper(v1);
  t.equal(vk2.mapVatSlotToKernelSlot(vatExport1), kernelExport1);
  t.equal(vk2.mapKernelSlotToVatSlot(kernelExport1), vatExport1);

  const kernelImport2 = 'ko25';
  const vatImport2 = vk.mapKernelSlotToVatSlot(kernelImport2);
  t.equal(vatImport2, 'o-50');
  t.equal(vk.mapKernelSlotToVatSlot(kernelImport2), vatImport2);
  t.equal(vk.mapVatSlotToKernelSlot(vatImport2), kernelImport2);

  vk2 = makeKernelKeeper(k.getState()).provideVatKeeper(v1);
  t.equal(vk2.mapKernelSlotToVatSlot(kernelImport2), vatImport2);
  t.equal(vk2.mapVatSlotToKernelSlot(vatImport2), kernelImport2);

  t.end();
});
