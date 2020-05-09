/* global harden */
import { test } from 'tape-promise/tape';
import '../install-ses.js';
import { initSwingStore, getAllState } from '@agoric/swing-store-simple';

import { buildVatController } from '../src/index';
import { buildMailboxStateMap, buildMailbox } from '../src/devices/mailbox';
import buildCommand from '../src/devices/command';

function capdata(body, slots = []) {
  return harden({ body, slots });
}

function capargs(args, slots = []) {
  return capdata(JSON.stringify(args), slots);
}

async function test0(t, withSES) {
  const config = {
    vats: new Map(),
    devices: [['d0', require.resolve('./files-devices/device-0'), {}]],
    bootstrapIndexJS: require.resolve('./files-devices/bootstrap-0'),
  };
  const c = await buildVatController(config, withSES);
  await c.step();
  // console.log(util.inspect(c.dump(), { depth: null }));
  t.deepEqual(JSON.parse(c.dump().log[0]), [
    [],
    {
      _bootstrap: { '@qclass': 'slot', index: 0 },
      vatAdmin: { '@qclass': 'slot', index: 1 },
    },
    {
      _dummy: 'dummy',
      d0: { '@qclass': 'slot', index: 2 },
      vatAdmin: { '@qclass': 'slot', index: 3 },
    },
  ]);
  t.deepEqual(JSON.parse(c.dump().log[1]), ['o+0', 'o-50', 'd-70', 'd-71']);
  t.end();
}

test('d0 with SES', async t => {
  await test0(t, true);
});

async function test1(t, withSES) {
  const sharedArray = [];
  const config = {
    vats: new Map(),
    devices: [
      [
        'd1',
        require.resolve('./files-devices/device-1'),
        {
          shared: sharedArray,
        },
      ],
    ],
    bootstrapIndexJS: require.resolve('./files-devices/bootstrap-1'),
  };
  const c = await buildVatController(config, withSES);
  await c.step();
  c.queueToVatExport('_bootstrap', 'o+0', 'step1', capargs([]));
  await c.step();
  console.log(c.dump().log);
  t.deepEqual(c.dump().log, [
    'callNow',
    'invoke d+0 set',
    JSON.stringify(capargs([])),
  ]);
  t.deepEqual(sharedArray, ['pushed']);
  t.end();
}

test('d1 with SES', async t => {
  await test1(t, true);
});

async function test2(t, mode, withSES) {
  const config = {
    vats: new Map(),
    devices: [['d2', require.resolve('./files-devices/device-2'), {}]],
    bootstrapIndexJS: require.resolve('./files-devices/bootstrap-2'),
  };
  config.vats.set('left', {
    sourcepath: require.resolve('./files-devices/vat-left.js'),
  });
  const c = await buildVatController(config, withSES, [mode]);
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
  t.end();
}

test('d2.1 with SES', async t => {
  await test2(t, '1', true);
});

test('d2.2 with SES', async t => {
  await test2(t, '2', true);
});

test('d2.3 with SES', async t => {
  await test2(t, '3', true);
});

test('d2.4 with SES', async t => {
  await test2(t, '4', true);
});

test('d2.5 with SES', async t => {
  await test2(t, '5', true);
});

async function testState(t, withSES) {
  const { storage } = initSwingStore();
  const config = {
    vats: new Map(),
    devices: [['d3', require.resolve('./files-devices/device-3'), {}]],
    bootstrapIndexJS: require.resolve('./files-devices/bootstrap-3'),
    hostStorage: storage,
  };

  // The initial state should be missing (null). Then we set it with the call
  // from bootstrap, and read it back.
  const c1 = await buildVatController(config, withSES, ['write+read']);
  const d3 = c1.deviceNameToID('d3');
  await c1.run();
  t.deepEqual(c1.dump().log, ['undefined', 'w+r', 'called', 'got {"s":"new"}']);
  const s = getAllState(storage);
  t.deepEqual(JSON.parse(s[`${d3}.deviceState`]), { s: 'new' });
  t.deepEqual(JSON.parse(s[`${d3}.o.nextID`]), 10);

  t.end();
}

test('device state with SES', async t => {
  await testState(t, true);
});

async function testMailboxOutbound(t, withSES) {
  const s = buildMailboxStateMap();
  const mb = buildMailbox(s);
  const config = {
    vats: new Map(),
    devices: [['mailbox', mb.srcPath, mb.endowments]],
    bootstrapIndexJS: require.resolve('./files-devices/bootstrap-2'),
  };

  const c = await buildVatController(config, withSES, ['mailbox1']);
  await c.run();
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

  t.end();
}

test('mailbox outbound with SES', async t => {
  await testMailboxOutbound(t, true);
});

async function testMailboxInbound(t, withSES) {
  const s = buildMailboxStateMap();
  const mb = buildMailbox(s);
  const config = {
    vats: new Map(),
    devices: [['mailbox', mb.srcPath, mb.endowments]],
    bootstrapIndexJS: require.resolve('./files-devices/bootstrap-2'),
  };

  let rc;

  const c = await buildVatController(config, withSES, ['mailbox2']);
  await c.run();
  rc = mb.deliverInbound(
    'peer1',
    [
      [1, 'msg1'],
      [2, 'msg2'],
    ],
    0,
  );
  t.ok(rc);
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
  t.ok(rc);
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
  t.notOk(rc);
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
  t.ok(rc);
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
  t.ok(rc);
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
  t.ok(rc);
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

  t.end();
}

test('mailbox inbound with SES', async t => {
  await testMailboxInbound(t, true);
});

async function testCommandBroadcast(t, withSES) {
  const broadcasts = [];
  const cm = buildCommand(body => broadcasts.push(body));
  const config = {
    vats: new Map(),
    devices: [['command', cm.srcPath, cm.endowments]],
    bootstrapIndexJS: require.resolve('./files-devices/bootstrap-2'),
  };

  const c = await buildVatController(config, withSES, ['command1']);
  await c.run();
  t.deepEqual(broadcasts, [{ hello: 'everybody' }]);

  t.end();
}

test('command broadcast with SES', async t => {
  await testCommandBroadcast(t, true);
});

async function testCommandDeliver(t, withSES) {
  const cm = buildCommand(() => {});
  const config = {
    vats: new Map(),
    devices: [['command', cm.srcPath, cm.endowments]],
    bootstrapIndexJS: require.resolve('./files-devices/bootstrap-2'),
  };

  const c = await buildVatController(config, withSES, ['command2']);
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

  t.end();
}

test('command deliver with SES', async t => {
  await testCommandDeliver(t, true);
});
