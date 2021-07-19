/* global __dirname require */
// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

import path from 'path';
import bundleSource from '@agoric/bundle-source';
import { provideHostStorage } from '../../src/hostStorage.js';

import {
  initializeSwingset,
  makeSwingsetController,
  buildKernelBundles,
} from '../../src/index.js';
import {
  buildMailboxStateMap,
  buildMailbox,
} from '../../src/devices/mailbox.js';

test.before(async t => {
  const kernelBundles = await buildKernelBundles();
  const fn = path.join(__dirname, 'bootstrap-device-mailbox.js');
  const bootstrap = await bundleSource(fn);
  t.context.data = { kernelBundles, bootstrap };
});

test('mailbox outbound', async t => {
  const s = buildMailboxStateMap();
  const mb = buildMailbox(s);
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        bundle: t.context.data.bootstrap,
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

  const hostStorage = provideHostStorage();
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

test('mailbox inbound', async t => {
  const s = buildMailboxStateMap();
  const mb = buildMailbox(s);
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        bundle: t.context.data.bootstrap,
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

  const hostStorage = provideHostStorage();
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
