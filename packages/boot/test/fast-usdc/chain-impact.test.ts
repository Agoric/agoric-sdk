import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';

import type { PoolMetrics } from '@agoric/fast-usdc';
import { Offers } from '@agoric/fast-usdc/src/clientSupport.js';
import { configurations } from '@agoric/fast-usdc/src/utils/deploy-config.js';
import { BridgeId } from '@agoric/internal';
import { defaultMarshaller } from '@agoric/internal/src/storage-test-utils.js';
import type { SnapStoreDebug } from '@agoric/swing-store';
import type { SwingsetController } from '@agoric/swingset-vat/src/controller/controller.js';
import { AckBehavior } from '../../tools/supports.js';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from '../bootstrapTests/walletFactory.js';

const test: TestFn<
  WalletFactoryTestContext & { observations: { id: unknown; kernel: Object }[] }
> = anyTest;

const config = '@agoric/vm-config/decentral-itest-fast-usdc-config.json';

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

test.serial('start-fast-usdc', async t => {
  const {
    agoricNamesRemotes,
    bridgeUtils,
    buildProposal,
    evalProposal,
    refreshAgoricNamesRemotes,
  } = t.context;

  // inbound `startChannelOpenInit` responses immediately.
  // needed since the Fusdc StartFn relies on an ICA being created
  bridgeUtils.setAckBehavior(
    BridgeId.DIBC,
    'startChannelOpenInit',
    AckBehavior.Immediate,
  );
  bridgeUtils.setBech32Prefix('noble');

  const materials = buildProposal(
    '@agoric/builders/scripts/fast-usdc/start-fast-usdc.build.js',
    ['--net', 'MAINNET'],
  );
  await evalProposal(materials);
  refreshAgoricNamesRemotes();
  t.truthy(agoricNamesRemotes.instance.fastUsdc);

  const { controller, observations } = t.context;
  observations.push({
    id: 'post-start-fast-usdc',
    kernel: getResourceUsageStats(controller),
  });
});

const makeLP = (ctx: WalletFactoryTestContext, addr: string) => {
  const { agoricNamesRemotes, walletFactoryDriver: wfd } = ctx;
  const lpP = wfd.provideSmartWallet(addr);

  let nonce = 0;

  return harden({
    async deposit(value: bigint) {
      const offerId = `deposit-lp-${(nonce += 1)}`;
      const offerSpec = Offers.fastUsdc.Deposit(agoricNamesRemotes, {
        offerId,
        fastLPAmount: value,
        usdcAmount: value,
      });
      const lp = await lpP;
      await lp.sendOffer(offerSpec);
      return offerSpec;
    },
  });
};

const getMetrics = (ctx: WalletFactoryTestContext) => {
  const { storage } = ctx;

  const metrics: PoolMetrics = defaultMarshaller.fromCapData(
    JSON.parse(storage.getValues('published.fastUsdc.poolMetrics').at(-1)!),
  );
  return metrics;
};

test.serial('LP deposits', async t => {
  const lp = makeLP(t.context, 'agoric19uscwxdac6cf6z7d5e26e0jm0lgwstc47cpll8');
  const { proposal, id } = await lp.deposit(150_000_000n);

  const metrics = getMetrics(t.context);
  t.true(metrics.shareWorth.numerator.value >= proposal.give.USDC.value);

  const { controller, observations } = t.context;
  observations.push({ id, kernel: getResourceUsageStats(controller) });
});

test.serial('analyze observations', async t => {
  const { observations } = t.context;
  for (const { id, kernel } of observations) {
    t.log({ id, ...kernel });
  }
  t.pass();
});
