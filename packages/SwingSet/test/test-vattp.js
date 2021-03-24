/* global require */
import { test } from '../tools/prepare-test-env-ava';

// eslint-disable-next-line import/order
import { initSwingStore } from '@agoric/swing-store-simple';
import { initializeSwingset, makeSwingsetController } from '../src/index';
import { buildMailboxStateMap, buildMailbox } from '../src/devices/mailbox';

test('vattp', async t => {
  const s = buildMailboxStateMap();
  const mb = buildMailbox(s);
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        sourceSpec: require.resolve('./files-vattp/bootstrap-test-vattp'),
      },
    },
    devices: {
      mailbox: {
        sourceSpec: mb.srcPath,
      },
    },
  };
  const deviceEndowments = {
    mailbox: { ...mb.endowments },
  };
  const hostStorage = initSwingStore().storage;

  await initializeSwingset(config, ['1'], hostStorage);
  const c = await makeSwingsetController(hostStorage, deviceEndowments);
  await c.run();
  t.deepEqual(s.exportToData(), {});

  t.is(
    mb.deliverInbound(
      'remote1',
      [
        [1, 'msg1'],
        [2, 'msg2'],
      ],
      0,
    ),
    true,
  );
  await c.run();
  t.deepEqual(c.dump().log, [
    'not sending anything',
    'ch.receive msg1',
    'ch.receive msg2',
  ]);
  t.deepEqual(s.exportToData(), { remote1: { outbox: [], inboundAck: 2 } });

  t.is(
    mb.deliverInbound(
      'remote1',
      [
        [1, 'msg1'],
        [2, 'msg2'],
      ],
      0,
    ),
    false,
  );
  await c.run();
  t.deepEqual(s.exportToData(), { remote1: { outbox: [], inboundAck: 2 } });
});

test('vattp 2', async t => {
  const s = buildMailboxStateMap();
  const mb = buildMailbox(s);
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        sourceSpec: require.resolve('./files-vattp/bootstrap-test-vattp'),
      },
    },
    devices: {
      mailbox: {
        sourceSpec: mb.srcPath,
      },
    },
  };
  const deviceEndowments = {
    mailbox: { ...mb.endowments },
  };
  const hostStorage = initSwingStore().storage;

  await initializeSwingset(config, ['2'], hostStorage);
  const c = await makeSwingsetController(hostStorage, deviceEndowments);
  await c.run();
  t.deepEqual(s.exportToData(), {
    remote1: { outbox: [[1, 'out1']], inboundAck: 0 },
  });

  t.is(mb.deliverInbound('remote1', [], 1), true);
  await c.run();
  t.deepEqual(c.dump().log, []);
  t.deepEqual(s.exportToData(), { remote1: { outbox: [], inboundAck: 0 } });

  t.is(mb.deliverInbound('remote1', [[1, 'msg1']], 1), true);
  await c.run();
  t.deepEqual(c.dump().log, ['ch.receive msg1']);
  t.deepEqual(s.exportToData(), { remote1: { outbox: [], inboundAck: 1 } });

  t.is(mb.deliverInbound('remote1', [[1, 'msg1']], 1), false);

  t.is(
    mb.deliverInbound(
      'remote1',
      [
        [1, 'msg1'],
        [2, 'msg2'],
      ],
      1,
    ),
    true,
  );
  await c.run();
  t.deepEqual(c.dump().log, ['ch.receive msg1', 'ch.receive msg2']);
  t.deepEqual(s.exportToData(), { remote1: { outbox: [], inboundAck: 2 } });
});
