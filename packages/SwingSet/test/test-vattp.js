import { test } from '../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { provideHostStorage } from '../src/controller/hostStorage.js';
import { initializeSwingset, makeSwingsetController } from '../src/index.js';
import {
  buildMailboxStateMap,
  buildMailbox,
} from '../src/devices/mailbox/mailbox.js';

test.serial('vattp', async t => {
  const s = buildMailboxStateMap();
  const mb = buildMailbox(s);
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        sourceSpec: new URL(
          'files-vattp/bootstrap-test-vattp.js',
          import.meta.url,
        ).pathname,
      },
    },
    devices: {
      mailbox: {
        sourceSpec: new URL(mb.srcPath, import.meta.url).pathname,
      },
    },
  };
  const deviceEndowments = {
    mailbox: { ...mb.endowments },
  };
  const hostStorage = provideHostStorage();

  await initializeSwingset(config, ['1'], hostStorage);
  const c = await makeSwingsetController(hostStorage, deviceEndowments);
  t.teardown(c.shutdown);
  await c.run();
  t.deepEqual(s.exportToData(), {});

  const m1 = [1, 'msg1'];
  const m2 = [2, 'msg2'];
  t.is(mb.deliverInbound('remote1', [m1, m2], 0), true);
  await c.run();
  t.deepEqual(c.dump().log, [
    'not sending anything',
    'ch.receive msg1',
    'ch.receive msg2',
  ]);
  t.deepEqual(s.exportToData(), { remote1: { outbox: [], inboundAck: 2 } });

  t.is(mb.deliverInbound('remote1', [m1, m2], 0), true);
  await c.run();
  t.deepEqual(s.exportToData(), { remote1: { outbox: [], inboundAck: 2 } });
});

test.serial('vattp 2', async t => {
  const s = buildMailboxStateMap();
  const mb = buildMailbox(s);
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        sourceSpec: new URL(
          'files-vattp/bootstrap-test-vattp.js',
          import.meta.url,
        ).pathname,
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
  const hostStorage = provideHostStorage();

  await initializeSwingset(config, ['2'], hostStorage);
  const c = await makeSwingsetController(hostStorage, deviceEndowments);
  t.teardown(c.shutdown);
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

  t.is(mb.deliverInbound('remote1', [[1, 'msg1']], 1), true);

  const m1 = [1, 'msg1'];
  const m2 = [2, 'msg2'];
  t.is(mb.deliverInbound('remote1', [m1, m2], 1), true);
  await c.run();
  t.deepEqual(c.dump().log, ['ch.receive msg1', 'ch.receive msg2']);
  t.deepEqual(s.exportToData(), { remote1: { outbox: [], inboundAck: 2 } });
});
