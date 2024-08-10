// @ts-nocheck
// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

import bundleSource from '@endo/bundle-source';
import { kunser } from '@agoric/kmarshal';
import { initSwingStore } from '@agoric/swing-store';
import {
  initializeSwingset,
  makeSwingsetController,
  buildKernelBundles,
} from '../../src/index.js';
import {
  buildMailboxStateMap,
  buildMailbox,
} from '../../src/devices/mailbox/mailbox.js';
import { bundleOpts } from '../util.js';

test.before(async t => {
  const kernelBundles = await buildKernelBundles();
  const fn = new URL('bootstrap-device-mailbox.js', import.meta.url).pathname;
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
        sourceSpec: new URL(mb.srcPath, import.meta.url).pathname,
      },
    },
  };
  const devEndows = {
    mailbox: { ...mb.endowments },
  };

  const { initOpts, runtimeOpts } = bundleOpts(t.context.data);
  const kernelStorage = initSwingStore().kernelStorage;
  await initializeSwingset(config, ['mailbox1'], kernelStorage, initOpts);
  const c = await makeSwingsetController(kernelStorage, devEndows, runtimeOpts);
  t.teardown(c.shutdown);
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
        sourceSpec: new URL(mb.srcPath, import.meta.url).pathname,
      },
    },
  };
  const devEndows = {
    mailbox: { ...mb.endowments },
  };

  const { initOpts, runtimeOpts } = bundleOpts(t.context.data);
  const kernelStorage = initSwingStore().kernelStorage;
  await initializeSwingset(config, ['mailbox2'], kernelStorage, initOpts);
  const c = await makeSwingsetController(kernelStorage, devEndows, runtimeOpts);
  t.teardown(c.shutdown);
  await c.run();
  const m1 = [1, 'msg1'];
  const m2 = [2, 'msg2'];
  const m3 = [3, 'msg3'];
  t.true(mb.deliverInbound('peer1', [m1, m2], 0));
  await c.run();
  const expected = ['dm-peer1', 'm-1-msg1', 'm-2-msg2', 'da-peer1-0'];
  t.deepEqual(c.dump().log, expected);

  // all messages/acks should be delivered, even duplicates
  t.true(mb.deliverInbound('peer1', [m1, m2], 0));
  await c.run();
  expected.push(...['dm-peer1', 'm-1-msg1', 'm-2-msg2', 'da-peer1-0']);
  t.deepEqual(c.dump().log, expected);

  // new messages too
  t.true(mb.deliverInbound('peer1', [m1, m2, m3], 0));
  await c.run();
  expected.push(
    ...['dm-peer1', 'm-1-msg1', 'm-2-msg2', 'm-3-msg3', 'da-peer1-0'],
  );
  t.deepEqual(c.dump().log, expected);

  // and new ack
  t.true(mb.deliverInbound('peer1', [m1, m2, m3], 6));
  await c.run();
  expected.push(
    ...['dm-peer1', 'm-1-msg1', 'm-2-msg2', 'm-3-msg3', 'da-peer1-6'],
  );
  t.deepEqual(c.dump().log, expected);
});

async function initializeMailboxKernel(t) {
  const s = buildMailboxStateMap();
  const mb = buildMailbox(s);
  /** @type {SwingSetConfig} */
  const config = {
    bootstrap: 'bootstrap',
    // Can't use 'local' because it's non-deterministic for 'mailbox
    // determinism' number of cranks.
    defaultManagerType: 'xs-worker',
    vats: {
      bootstrap: {
        bundle: t.context.data.bootstrap,
      },
    },
    devices: {
      mailbox: {
        sourceSpec: new URL(mb.srcPath, import.meta.url).pathname,
      },
    },
  };
  const { initOpts } = bundleOpts(t.context.data);
  const kernelStorage = initSwingStore().kernelStorage;
  await initializeSwingset(
    config,
    ['mailbox-determinism'],
    kernelStorage,
    initOpts,
  );
  return kernelStorage;
}

async function makeMailboxKernel(t, kernelStorage) {
  const s = buildMailboxStateMap();
  const mb = buildMailbox(s);
  const devEndows = {
    mailbox: { ...mb.endowments },
  };
  const { runtimeOpts } = bundleOpts(t.context.data);
  const c = await makeSwingsetController(kernelStorage, devEndows, runtimeOpts);
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');
  await c.run();
  return [c, mb];
}

test('mailbox determinism', async t => {
  // we run two kernels in parallel
  const kernelStorage1 = await initializeMailboxKernel(t);
  const kernelStorage2 = await initializeMailboxKernel(t);
  const [c1a, mb1a] = await makeMailboxKernel(t, kernelStorage1);
  const [c2, mb2] = await makeMailboxKernel(t, kernelStorage2);

  // they get the same inbound message
  const msg1 = [[1, 'msg1']];
  t.true(mb1a.deliverInbound('peer1', msg1, 0));
  await c1a.run();
  t.deepEqual(c1a.dump().log, ['comms receive msg1']);
  const kp1 = c1a.queueToVatRoot('bootstrap', 'getNumReceived', []);
  await c1a.run();
  t.is(kunser(c1a.kpResolution(kp1)), 1);

  t.true(mb2.deliverInbound('peer1', msg1, 0));
  await c2.run();
  t.deepEqual(c2.dump().log, ['comms receive msg1']);
  const kp2 = c2.queueToVatRoot('bootstrap', 'getNumReceived', []);
  await c2.run();
  t.is(kunser(c2.kpResolution(kp2)), 1);

  // both should have the same number of cranks
  t.is(
    kernelStorage1.kvStore.get('crankNumber'),
    kernelStorage2.kvStore.get('crankNumber'),
  );

  // then one is restarted, but the other keeps running
  const [c1b, mb1b] = await makeMailboxKernel(t, kernelStorage1);

  // Now we repeat delivery of that message to both. The mailbox should send
  // it to vattp, even though it's duplicate, because the mailbox doesn't
  // have durable state, and cannot correctly (deterministically) tell that
  // it's a duplicate.
  t.true(mb1b.deliverInbound('peer1', msg1, 0));
  await c1b.run();
  // the testlog is part of the ephemeral kernel state, so it will only have
  // a record of messages in the second run, however the vat is replayed
  // during the second-run startup, so we expect to see one copy of the
  // original message, delivered during the second run
  t.deepEqual(c1b.dump().log, ['comms receive msg1']);
  // but vattp dedups, so only one message should be delivered to comms
  const kp3 = c1b.queueToVatRoot('bootstrap', 'getNumReceived', []);
  await c1b.run();
  t.is(kunser(c1b.kpResolution(kp3)), 1);

  t.true(mb2.deliverInbound('peer1', msg1, 0));
  await c2.run();
  // the second kernel still has that ephemeral testlog, however the vat is
  // still running, so we only see the original message from the first run
  t.deepEqual(c2.dump().log, ['comms receive msg1']);
  const kp4 = c2.queueToVatRoot('bootstrap', 'getNumReceived', []);
  await c2.run();
  t.is(kunser(c2.kpResolution(kp4)), 1);

  // Both should *still* have the same number of cranks. This is what bug
  // #3471 exposed.
  t.is(
    kernelStorage1.kvStore.get('crankNumber'),
    kernelStorage2.kvStore.get('crankNumber'),
  );
});
