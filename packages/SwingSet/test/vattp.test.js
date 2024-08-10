// eslint-disable-next-line import/order
import { test } from '../tools/prepare-test-env-ava.js';

import bundleSource from '@endo/bundle-source';
import { initSwingStore } from '@agoric/swing-store';
import { initializeSwingset, makeSwingsetController } from '../src/index.js';
import {
  buildMailboxStateMap,
  buildMailbox,
} from '../src/devices/mailbox/mailbox.js';

async function restartVatTP(controller) {
  const vaBundle = await bundleSource(
    new URL('../src/vats/vattp/vat-vattp.js', import.meta.url).pathname,
  );
  const bundleID = await controller.validateAndInstallBundle(vaBundle);
  controller.upgradeStaticVat('vattp', false, bundleID, {});
  await controller.run();
}

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
  const kernelStorage = initSwingStore().kernelStorage;

  await initializeSwingset(config, ['1'], kernelStorage);
  const c = await makeSwingsetController(kernelStorage, deviceEndowments);
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
  const kernelStorage = initSwingStore().kernelStorage;

  await initializeSwingset(config, ['2'], kernelStorage);
  const c = await makeSwingsetController(kernelStorage, deviceEndowments);
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');
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

  // now upgrade vattp, and see if the state is retained
  await restartVatTP(c);

  // vattp remembers the inbound seqnum: duplicates are ignored
  t.is(mb.deliverInbound('remote1', [m2], 1), true);
  t.deepEqual(c.dump().log, ['ch.receive msg1', 'ch.receive msg2']);
  // vattp remembers the inboundAck number
  t.deepEqual(s.exportToData(), { remote1: { outbox: [], inboundAck: 2 } });

  // vattp remembers the receiver: new inbound msgs are still delivered
  const m3 = [3, 'msg3'];
  t.is(mb.deliverInbound('remote1', [m3], 1), true);
  await c.run();
  t.deepEqual(c.dump().log, [
    'ch.receive msg1',
    'ch.receive msg2',
    'ch.receive msg3',
  ]);
  t.deepEqual(s.exportToData(), { remote1: { outbox: [], inboundAck: 3 } });

  // vattp still supports the transmitter object
  c.queueToVatRoot('bootstrap', 'transmit', ['out2']);
  await c.run();
  // vattp remembers the outbound seqnum
  t.deepEqual(s.exportToData(), {
    remote1: { outbox: [[2, 'out2']], inboundAck: 3 },
  });
});
