import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';

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

test.todo('uncompressedSize of heap snapshots of vats');
