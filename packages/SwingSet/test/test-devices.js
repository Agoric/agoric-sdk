/* global require */
// eslint-disable-next-line import/order
import { test } from '../tools/prepare-test-env-ava';

import bundleSource from '@agoric/bundle-source';
import { initSwingStore, getAllState } from '@agoric/swing-store-simple';

import {
  initializeSwingset,
  makeSwingsetController,
  buildKernelBundles,
} from '../src/index';
import { buildMailboxStateMap, buildMailbox } from '../src/devices/mailbox';
import buildCommand from '../src/devices/command';

function capdata(body, slots = []) {
  return harden({ body, slots });
}

function capargs(args, slots = []) {
  return capdata(JSON.stringify(args), slots);
}

function dfile(name) {
  return require.resolve(`./files-devices/${name}`);
}

test.before(async t => {
  const kernelBundles = await buildKernelBundles();
  const bootstrap0 = await bundleSource(dfile('bootstrap-0'));
  const bootstrap1 = await bundleSource(dfile('bootstrap-1'));
  const bootstrap2 = await bundleSource(dfile('bootstrap-2'));
  const bootstrap3 = await bundleSource(dfile('bootstrap-3'));
  const bootstrap4 = await bundleSource(dfile('bootstrap-4'));
  t.context.data = {
    kernelBundles,
    bootstrap0,
    bootstrap1,
    bootstrap2,
    bootstrap3,
    bootstrap4,
  };
});

test.serial('d0', async t => {
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        bundle: t.context.data.bootstrap0,
        creationOptions: { enableSetup: true },
      },
    },
    devices: {
      d0: {
        sourceSpec: require.resolve('./files-devices/device-0'),
      },
    },
  };
  const hostStorage = initSwingStore().storage;
  await initializeSwingset(config, [], hostStorage);
  const c = await makeSwingsetController(hostStorage, {});
  await c.step();
  // console.log(util.inspect(c.dump(), { depth: null }));
  t.deepEqual(JSON.parse(c.dump().log[0]), [
    {
      bootstrap: { '@qclass': 'slot', iface: 'Alleged: vref', index: 0 },
      comms: { '@qclass': 'slot', iface: 'Alleged: vref', index: 1 },
      timer: { '@qclass': 'slot', iface: 'Alleged: vref', index: 2 },
      vatAdmin: { '@qclass': 'slot', iface: 'Alleged: vref', index: 3 },
      vattp: { '@qclass': 'slot', iface: 'Alleged: vref', index: 4 },
    },
    {
      d0: { '@qclass': 'slot', iface: 'Alleged: device', index: 5 },
      vatAdmin: { '@qclass': 'slot', iface: 'Alleged: device', index: 6 },
    },
  ]);
  t.deepEqual(JSON.parse(c.dump().log[1]), [
    'o+0',
    'o-50',
    'o-51',
    'o-52',
    'o-53',
    'd-70',
    'd-71',
  ]);
});

test.serial('d1', async t => {
  const sharedArray = [];
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        bundle: t.context.data.bootstrap1,
        creationOptions: { enableSetup: true },
      },
    },
    devices: {
      d1: {
        sourceSpec: require.resolve('./files-devices/device-1'),
      },
    },
  };
  const deviceEndowments = {
    d1: {
      shared: sharedArray,
    },
  };

  const hostStorage = initSwingStore().storage;
  await initializeSwingset(config, [], hostStorage, t.context.data);
  const c = await makeSwingsetController(hostStorage, deviceEndowments);
  await c.step();
  c.queueToVatExport('bootstrap', 'o+0', 'step1', capargs([]));
  await c.step();
  t.deepEqual(c.dump().log, [
    'callNow',
    'invoke 1 2',
    JSON.stringify(capargs({ ret: 3 })),
  ]);
  t.deepEqual(sharedArray, ['pushed']);
});

async function test2(t, mode) {
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        bundle: t.context.data.bootstrap2,
      },
      left: {
        sourceSpec: require.resolve('./files-devices/vat-left.js'),
      },
    },
    devices: {
      d2: {
        sourceSpec: require.resolve('./files-devices/device-2'),
      },
    },
  };
  const hostStorage = initSwingStore().storage;
  await initializeSwingset(config, [mode], hostStorage, t.context.data);
  const c = await makeSwingsetController(hostStorage, {});
  await c.step();
  if (mode === '1') {
    t.deepEqual(c.dump().log, ['calling d2.method1', 'method1 hello', 'done']);
  } else if (mode === '2') {
    t.deepEqual(c.dump().log, [
      'calling d2.method2',
      'method2',
      'method3 true',
      'value',
    ]);
  } else if (mode === '3') {
    t.deepEqual(c.dump().log, ['calling d2.method3', 'method3', 'ret true']);
  } else if (mode === '4') {
    t.deepEqual(c.dump().log, [
      'calling d2.method4',
      'method4',
      'ret method4 done',
    ]);
    await c.step();
    t.deepEqual(c.dump().log, [
      'calling d2.method4',
      'method4',
      'ret method4 done',
      'd2.m4 foo',
      'method4.bar hello',
      'd2.m4 did bar',
    ]);
  } else if (mode === '5') {
    t.deepEqual(c.dump().log, ['calling v2.method5', 'called']);
    await c.step();
    t.deepEqual(c.dump().log, [
      'calling v2.method5',
      'called',
      'left5',
      'method5 hello',
      'left5 did d2.method5, got ok',
    ]);
    await c.step();
    t.deepEqual(c.dump().log, [
      'calling v2.method5',
      'called',
      'left5',
      'method5 hello',
      'left5 did d2.method5, got ok',
      'ret done',
    ]);
  }
}

test.serial('d2.1', async t => {
  await test2(t, '1');
});

test.serial('d2.2', async t => {
  await test2(t, '2');
});

test.serial('d2.3', async t => {
  await test2(t, '3');
});

test.serial('d2.4', async t => {
  await test2(t, '4');
});

test.serial('d2.5', async t => {
  await test2(t, '5');
});

test.serial('device state', async t => {
  const { storage } = initSwingStore();
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        bundle: t.context.data.bootstrap3,
      },
    },
    devices: {
      d3: {
        sourceSpec: require.resolve('./files-devices/device-3'),
      },
    },
  };

  // The initial state should be missing (null). Then we set it with the call
  // from bootstrap, and read it back.
  await initializeSwingset(config, ['write+read'], storage, t.context.data);
  const c1 = await makeSwingsetController(storage, {});
  const d3 = c1.deviceNameToID('d3');
  await c1.run();
  t.deepEqual(c1.dump().log, ['undefined', 'w+r', 'called', 'got {"s":"new"}']);
  const s = getAllState(storage);
  t.deepEqual(JSON.parse(s[`${d3}.deviceState`]), capargs({ s: 'new' }));
  t.deepEqual(JSON.parse(s[`${d3}.o.nextID`]), 10);
});

test.serial('mailbox outbound', async t => {
  const s = buildMailboxStateMap();
  const mb = buildMailbox(s);
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        bundle: t.context.data.bootstrap2,
      },
    },
    devices: {
      mailbox: {
        sourceSpec: require.resolve(mb.srcPath),
      },
    },
  };
  const deviceEndowments = {
    mailbox: { ...mb.endowments },
  };

  const hostStorage = initSwingStore().storage;
  await initializeSwingset(config, ['mailbox1'], hostStorage, t.context.data);
  const c = await makeSwingsetController(hostStorage, deviceEndowments);
  await c.run();
  // exportToData() provides plain Numbers to the host that needs to convey the messages
  t.deepEqual(s.exportToData(), {
    peer1: {
      inboundAck: 13,
      outbox: [
        [2, 'data2'],
        [3, 'data3'],
      ],
    },
    peer2: {
      inboundAck: 0,
      outbox: [],
    },
    peer3: {
      inboundAck: 0,
      outbox: [[5, 'data5']],
    },
  });

  const s2 = buildMailboxStateMap();
  s2.populateFromData(s.exportToData());
  t.deepEqual(s.exportToData(), s2.exportToData());
});

test.serial('mailbox inbound', async t => {
  const s = buildMailboxStateMap();
  const mb = buildMailbox(s);
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        bundle: t.context.data.bootstrap2,
      },
    },
    devices: {
      mailbox: {
        sourceSpec: require.resolve(mb.srcPath),
      },
    },
  };
  const deviceEndowments = {
    mailbox: { ...mb.endowments },
  };

  let rc;

  const hostStorage = initSwingStore().storage;
  await initializeSwingset(config, ['mailbox2'], hostStorage, t.context.data);
  const c = await makeSwingsetController(hostStorage, deviceEndowments);
  await c.run();
  rc = mb.deliverInbound(
    'peer1',
    [
      [1, 'msg1'],
      [2, 'msg2'],
    ],
    0,
  );
  t.truthy(rc);
  await c.run();
  t.deepEqual(c.dump().log, ['dm-peer1', 'm-1-msg1', 'm-2-msg2']);

  // delivering the same messages should not trigger sends, but the ack is new
  rc = mb.deliverInbound(
    'peer1',
    [
      [1, 'msg1'],
      [2, 'msg2'],
    ],
    3,
  );
  t.truthy(rc);
  await c.run();
  t.deepEqual(c.dump().log, ['dm-peer1', 'm-1-msg1', 'm-2-msg2', 'da-peer1-3']);

  // no new messages/acks makes deliverInbound return 'false'
  rc = mb.deliverInbound(
    'peer1',
    [
      [1, 'msg1'],
      [2, 'msg2'],
    ],
    3,
  );
  t.falsy(rc);
  await c.run();
  t.deepEqual(c.dump().log, ['dm-peer1', 'm-1-msg1', 'm-2-msg2', 'da-peer1-3']);

  // but new messages should be sent
  rc = mb.deliverInbound(
    'peer1',
    [
      [1, 'msg1'],
      [2, 'msg2'],
      [3, 'msg3'],
    ],
    3,
  );
  t.truthy(rc);
  await c.run();
  t.deepEqual(c.dump().log, [
    'dm-peer1',
    'm-1-msg1',
    'm-2-msg2',
    'da-peer1-3',
    'dm-peer1',
    'm-3-msg3',
  ]);

  // and a higher ack should be sent
  rc = mb.deliverInbound(
    'peer1',
    [
      [1, 'msg1'],
      [2, 'msg2'],
      [3, 'msg3'],
    ],
    4,
  );
  t.truthy(rc);
  await c.run();
  t.deepEqual(c.dump().log, [
    'dm-peer1',
    'm-1-msg1',
    'm-2-msg2',
    'da-peer1-3',
    'dm-peer1',
    'm-3-msg3',
    'da-peer1-4',
  ]);

  rc = mb.deliverInbound('peer2', [[4, 'msg4']], 5);
  t.truthy(rc);
  await c.run();
  t.deepEqual(c.dump().log, [
    'dm-peer1',
    'm-1-msg1',
    'm-2-msg2',
    'da-peer1-3',
    'dm-peer1',
    'm-3-msg3',
    'da-peer1-4',
    'dm-peer2',
    'm-4-msg4',
    'da-peer2-5',
  ]);
});

test.serial('command broadcast', async t => {
  const broadcasts = [];
  const cm = buildCommand(body => broadcasts.push(body));
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        bundle: t.context.data.bootstrap2,
      },
    },
    devices: {
      command: {
        sourceSpec: require.resolve(cm.srcPath),
      },
    },
  };
  const deviceEndowments = {
    command: { ...cm.endowments },
  };

  const hostStorage = initSwingStore().storage;
  await initializeSwingset(config, ['command1'], hostStorage, t.context.data);
  const c = await makeSwingsetController(hostStorage, deviceEndowments);
  await c.run();
  t.deepEqual(broadcasts, [{ hello: 'everybody' }]);
});

test.serial('command deliver', async t => {
  const cm = buildCommand(() => {});
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        bundle: t.context.data.bootstrap2,
      },
    },
    devices: {
      command: {
        sourceSpec: require.resolve(cm.srcPath),
      },
    },
  };
  const deviceEndowments = {
    command: { ...cm.endowments },
  };

  const hostStorage = initSwingStore().storage;
  await initializeSwingset(config, ['command2'], hostStorage, t.context.data);
  const c = await makeSwingsetController(hostStorage, deviceEndowments);
  await c.run();

  t.deepEqual(c.dump().log.length, 0);
  const p1 = cm.inboundCommand({ piece: 'missing', doReject: false });
  await c.run();
  const r1 = await p1;
  t.deepEqual(r1, { response: 'body' });
  t.deepEqual(c.dump().log, ['handle-0-missing']);

  const p2 = cm.inboundCommand({ piece: 'errory', doReject: true });
  let rejection;
  p2.then(
    res => t.fail(`expected to reject, but got ${res}`),
    rej => (rejection = rej),
  );
  await c.run();
  t.deepEqual(c.dump().log, ['handle-0-missing', 'handle-1-errory']);
  t.deepEqual(rejection, { response: 'body' });
});

test.serial('liveslots throws when D() gets promise', async t => {
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        bundle: t.context.data.bootstrap2,
        creationOptions: { enableSetup: true },
      },
    },
    devices: {
      d0: {
        sourceSpec: require.resolve('./files-devices/device-0'),
      },
    },
  };
  const storage = initSwingStore().storage;
  await initializeSwingset(config, ['promise1'], storage, t.context.data);
  const c = await makeSwingsetController(storage, { d0: {} });
  await c.step();
  // When liveslots catches an attempt to send a promise into D(), it throws
  // a regular error, which the vat can catch.
  t.deepEqual(c.dump().log, ['sending Promise', 'good: callNow failed']);

  // If that isn't working as expected, and the promise makes it to
  // syscall.callNow, the translator will notice and kill the vat. We send a
  // ping() to it to make sure it's still alive. If the vat were dead,
  // queueToVatExport would throw because the vat was deleted.
  c.queueToVatExport('bootstrap', 'o+0', 'ping', capargs([]), 'panic');
  await c.run();

  // If the translator doesn't catch the promise and it makes it to the device,
  // the kernel will panic, and the c.step() above will reject, so the
  // 'await c.step()' will throw.
});

test.serial('syscall.callNow(promise) is vat-fatal', async t => {
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        bundle: t.context.data.bootstrap4, // uses setup() to bypass liveslots
        creationOptions: { enableSetup: true },
      },
    },
    devices: {
      d0: {
        sourceSpec: require.resolve('./files-devices/device-0'),
      },
    },
  };
  const storage = initSwingStore().storage;
  await initializeSwingset(config, [], storage, t.context.data);
  const c = await makeSwingsetController(storage, { d0: {} });
  await c.step();
  // if the kernel paniced, that c.step() will reject, and the await will throw
  t.deepEqual(c.dump().log, ['sending Promise', 'good: callNow failed']);
  // now check that the vat was terminated: this should throw an exception
  // because the entire bootstrap vat was deleted
  t.throws(() => c.queueToVatExport('bootstrap', 'o+0', 'ping', capargs([])), {
    message: /vat name .* must exist, but doesn't/,
  });
});
