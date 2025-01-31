import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';

import type { SnapStoreDebug } from '@agoric/swing-store';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from '../bootstrapTests/walletFactory.js';

const test: TestFn<WalletFactoryTestContext> = anyTest;

const config = '@agoric/vm-config/decentral-itest-orchestration-config.json';

test.before(async t => {
  const { env } = globalThis.process;
  const {
    SLOGFILE: slogFile,
    SWINGSET_WORKER_TYPE: defaultManagerType = 'local', // or 'xs-worker',
  } = env;
  t.context = await makeWalletFactoryContext(t, config, {
    slogFile,
    defaultManagerType,
  });
});
test.after.always(t => t.context.shutdown?.());

test('access relevant kernel stats after bootstrap', async t => {
  const { controller } = t.context;
  const stats = controller.getStats();
  const { promiseQueuesLength, kernelPromises, kernelObjects, clistEntries } =
    stats;
  const relevant = {
    promiseQueuesLength,
    kernelPromises,
    kernelObjects,
    clistEntries,
  };
  t.log('relevant kernel stats', relevant);
  t.truthy(stats);
});

test('access uncompressedSize of heap snapshots of vats (WIP)', async t => {
  const { controller, swingStore } = t.context;

  const snapStore = swingStore.internal.snapStore as unknown as SnapStoreDebug;

  await controller.reapAllVats(); // force GC
  await controller.run(); // clear any reactions
  const active: string[] = [];
  for (const snapshot of snapStore.listAllSnapshots()) {
    const { vatID, uncompressedSize } = snapshot;
    t.log({ vatID, uncompressedSize });
    t.log('TODO: filter by active', snapshot);
    active.push(vatID);
  }
  t.log('active vats', active);
  t.pass();
});
