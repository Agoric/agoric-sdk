/** @file upgrade network / IBC vat at many points in state machine */

import type { ExecutionContext, TestFn } from 'ava';

import { createRequire } from 'node:module';

import { makeMockBridgeKit } from '@agoric/cosmic-swingset/tools/test-bridge-utils.ts';
import { makeCosmicSwingsetTestKit } from '@agoric/cosmic-swingset/tools/test-kit.js';
import { makeRunUtils } from '@agoric/swingset-vat/tools/run-utils.js';
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { makeNodeBundleCache } from '@endo/bundle-source/cache.js';

const { entries, assign } = Object;

const { resolve: resolvePath } = createRequire(import.meta.url);
const asset = {
  ibcServerMock: resolvePath('./ibcServerMock.js'),
  ibcClientMock: resolvePath('./ibcClientMock.js'),
};

export const makeTestContext = async () => {
  console.time('DefaultTestContext');

  const bundleDir = 'bundles';
  const bundleCache = await makeNodeBundleCache(
    bundleDir,
    { cacheSourceMaps: false },
    s => import(s),
  );

  const { handleBridgeSend } = makeMockBridgeKit({
    ibcKit: { handleOutboundMessage: () => String(undefined) },
  });

  const swingsetTestKit = await makeCosmicSwingsetTestKit({
    configSpecifier: '@agoric/vm-config/decentral-itest-vaults-config.json',
    fixupConfig: config => ({
      ...config,
      bundleCachePath: bundleDir,
    }),
    handleBridgeSend,
  });

  console.timeLog('DefaultTestContext', 'swingsetTestKit');

  const installation = {} as Record<string, Installation>;
  return { ...swingsetTestKit, bundleCache, installation };
};

type Context = Awaited<ReturnType<typeof makeTestContext>>;

const test = anyTest as TestFn<Context>;

test.before(async t => (t.context = await makeTestContext()));
test.after.always(t => t.context.shutdown?.());

test.serial('bootstrap produces provisioning vat', async t => {
  const { EV } = t.context;
  const provisioning = await EV.vat('bootstrap').consumeItem('provisioning');
  console.timeLog('DefaultTestContext', 'provisioning');
  console.log('provisioning', provisioning);
  t.truthy(provisioning);
});

test.serial('bootstrap launches network, ibc vats', async t => {
  const { EV } = t.context;

  console.log('network proposal executed');
  const vatStore = await EV.vat('bootstrap').consumeItem('vatStore');
  t.true(await EV(vatStore).has('ibc'), 'ibc');
  t.true(await EV(vatStore).has('network'), 'network');
});

test.serial('test contracts are installed', async t => {
  const { bundleCache, EV } = t.context;
  const zoe: ZoeService = await EV.vat('bootstrap').consumeItem('zoe');
  for (const [name, path] of entries(asset)) {
    const bundle = await bundleCache.load(path, name);
    const installation = await EV(zoe).install(bundle);
    t.truthy(installation);
    assign(t.context.installation, { [name]: installation });
  }
});

const upgradeVats = async (
  t: ExecutionContext<Context>,
  EV: ReturnType<typeof makeRunUtils>['EV'],
  vatsToUpgrade: Array<string>,
) => {
  const vatStore = await EV.vat('bootstrap').consumeItem('vatStore');
  const vatUpgradeInfo =
    await EV.vat('bootstrap').consumeItem('vatUpgradeInfo');
  const vatAdminSvc = await EV.vat('bootstrap').consumeItem('vatAdminSvc');
  for (const vatName of vatsToUpgrade) {
    const { bundleID, bundleName } = await EV(vatUpgradeInfo).get(vatName);
    const bcap = await (bundleID
      ? EV(vatAdminSvc).getBundleCap(bundleID)
      : EV(vatAdminSvc).getNamedBundleCap(bundleName));
    const { adminNode } = await EV(vatStore).get(vatName);
    const result = await EV(adminNode).upgrade(bcap);
    console.log(vatName, result);
    t.true(result.incarnationNumber > 0);
  }
};

test.serial('upgrade at many points in network API flow', async t => {
  const { EV, installation } = t.context;
  const portAllocator = await EV.vat('bootstrap').consumeItem('portAllocator');
  const zoe: ZoeService = await EV.vat('bootstrap').consumeItem('zoe');

  const flow = entries({
    startServer: async (label: string) => {
      const started = await EV(zoe).startInstance(
        installation.ibcServerMock,
        {},
        {},
        { portAllocator },
      );
      t.truthy(started.creatorFacet, `${label} ibcServerMock`);
      return [label, { server: started.creatorFacet }];
    },
    requestListening: async ([label, opts]) => {
      await EV.sendOnly(opts.server).listen();
      return [label, opts];
    },
    startListening: async ([label, opts]) => {
      await EV.sendOnly(opts.server).dequeue('onListen');
      return [label, opts];
    },
    startClient: async ([label, opts]) => {
      const started = await EV(zoe).startInstance(
        installation.ibcClientMock,
        {},
        {},
        { portAllocator },
      );
      t.truthy(started.creatorFacet, `${label} ibcClientMock`);
      return [label, { ...opts, client: started.creatorFacet }];
    },
    getAddresses: async ([label, opts]) => {
      const serverAddress = await EV(opts.server).getLocalAddress();
      const clientAddress = await EV(opts.client).getLocalAddress();
      console.log(`${label} server ${serverAddress} client ${clientAddress}`);
      return [label, { ...opts, serverAddress }];
    },
    requestConnection: async ([label, opts]) => {
      await EV.sendOnly(opts.client).connect(opts.serverAddress);
      return [label, opts];
    },
    acceptConnection: async ([label, opts]) => {
      await EV.sendOnly(opts.server).dequeue('onAccept');
      return [label, opts];
    },
    openConnection: async ([label, opts]) => {
      await EV.sendOnly(opts.server).dequeue('onOpen');
      return [label, opts];
    },
    sendPacket: async ([label, opts]) => {
      await EV.sendOnly(opts.client).send(label);
      return [label, opts];
    },
    respond: async ([label, opts]) => {
      await EV.sendOnly(opts.server).dequeue('onReceive');
      return [label, opts];
    },
    checkAck: async ([label, opts]) => {
      const ack = await EV(opts.client).getAck();
      t.is(ack, `got ${label}`, `${label} expected echo`);
      return [label, { ...opts, ack }];
    },
    closeConnection: async ([_label, opts]) => {
      await EV(opts.client).close();
    },
  });

  const doSteps = async (label: string, steps, input: unknown = undefined) => {
    await null;
    let result = input;
    for (const [stepName, fn] of steps) {
      await t.notThrowsAsync(async () => {
        result = await fn(result);
      }, `${label} ${stepName} must complete successfully`);
    }
    return result;
  };

  // Sanity check
  await doSteps('pre-upgrade', flow, 'pre-upgrade');

  // For each step, run to just before that point and pause for
  // continuation after upgrade.
  const pausedFlows = [] as Array<{
    result: any;
    remainingSteps: [string, (lastResult: any) => unknown][];
  }>;
  for (let i = 0; i < flow.length; i += 1) {
    const [beforeStepName] = flow[i];
    const result = await doSteps(
      `pre-${beforeStepName}`,
      flow.slice(0, i),
      `pause-before-${beforeStepName}`,
    );
    pausedFlows.push({ result, remainingSteps: flow.slice(i) });
  }

  await upgradeVats(t, EV, ['ibc', 'network']);

  // Verify a complete run post-upgrade.
  await doSteps('post-upgrade', flow, 'post-upgrade');

  // Verify completion of each paused flow.
  for (const { result, remainingSteps } of pausedFlows) {
    const [beforeStepName] = remainingSteps[0];
    await doSteps(`resumed-${beforeStepName}`, remainingSteps, result);
  }
});
