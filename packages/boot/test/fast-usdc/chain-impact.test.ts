import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';

import { configurations } from '@agoric/fast-usdc/src/utils/deploy-config.js';
import type { SnapStoreDebug } from '@agoric/swing-store';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from '../bootstrapTests/walletFactory.js';
import type { SwingsetController } from '@agoric/swingset-vat/src/controller/controller.js';

const test: TestFn<
  WalletFactoryTestContext & { observations: { id: unknown; kernel: Object }[] }
> = anyTest;

const config = '@agoric/vm-config/decentral-itest-orchestration-config.json';

test.before(async t => {
  const { env } = globalThis.process;
  const {
    SLOGFILE: slogFile,
    SWINGSET_WORKER_TYPE: defaultManagerType = 'local', // or 'xs-worker',
  } = env;
  const ctx = await makeWalletFactoryContext(t, config, {
    slogFile,
    defaultManagerType,
  });
  t.context = { ...ctx, observations: [] };
});
test.after.always(t => t.context.shutdown?.());

const getResourceUsageStats = (controller: SwingsetController) => {
  const stats = controller.getStats();
  const { promiseQueuesLength, kernelPromises, kernelObjects, clistEntries } =
    stats;
  const relevant = {
    promiseQueuesLength,
    kernelPromises,
    kernelObjects,
    clistEntries,
  };
  return relevant;
};

test.serial('access relevant kernel stats after bootstrap', async t => {
  const { controller, observations } = t.context;
  const relevant = getResourceUsageStats(controller);
  t.log('relevant kernel stats', relevant);
  t.truthy(relevant);
  observations.push({ id: 'post-boot', kernel: relevant });
});

test.serial(
  'access uncompressedSize of heap snapshots of vats (WIP)',
  async t => {
    const { controller, swingStore } = t.context;

    const snapStore = swingStore.internal
      .snapStore as unknown as SnapStoreDebug;

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
  },
);

test.serial('oracles provision before contract deployment', async t => {
  const { walletFactoryDriver: wfd } = t.context;

  const { oracles } = configurations.MAINNET;
  const [watcherWallet] = await Promise.all(
    Object.values(oracles).map(addr => wfd.provideSmartWallet(addr)),
  );
  t.truthy(watcherWallet);

  const { controller, observations } = t.context;
  observations.push({
    id: 'post-ocw-provision',
    kernel: getResourceUsageStats(controller),
  });
});

test.serial('analyze observations', async t => {
  const { observations } = t.context;
  for (const { id, kernel } of observations) {
    t.log({ id, ...kernel });
  }
  t.pass();
});
