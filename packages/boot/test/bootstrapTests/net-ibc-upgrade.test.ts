/** @file upgrade network / IBC vat at many points in state machine */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeNodeBundleCache } from '@endo/bundle-source/cache.js';
import type { TestFn } from 'ava';
import { createRequire } from 'module';

import {
  testInterruptedSteps,
  type TestStep,
} from '@agoric/internal/src/testing-utils.js';
import { typedEntries } from '@agoric/internal';
import type { Installation, ZoeService } from '@agoric/zoe';
import { makeSwingsetTestKit } from '../../tools/supports.js';

const { entries, assign } = Object;

const PLATFORM_CONFIG = '@agoric/vm-config/decentral-itest-vaults-config.json';

const nodeRequire = createRequire(import.meta.url);
const asset = {
  ibcServerMock: nodeRequire.resolve('./ibcServerMock.js'),
  ibcClientMock: nodeRequire.resolve('./ibcClientMock.js'),
};

export const makeTestContext = async t => {
  console.time('DefaultTestContext');

  const bundleDir = 'bundles';
  const bundleCache = await makeNodeBundleCache(
    bundleDir,
    { cacheSourceMaps: false },
    s => import(s),
  );
  const swingsetTestKit = await makeSwingsetTestKit(t.log, bundleDir, {
    configSpecifier: PLATFORM_CONFIG,
  });
  console.timeLog('DefaultTestContext', 'swingsetTestKit');

  const installation = {} as Record<string, Installation>;

  return { ...swingsetTestKit, bundleCache, installation };
};

const test = anyTest as TestFn<Awaited<ReturnType<typeof makeTestContext>>>;

test.before(async t => {
  t.context = await makeTestContext(t);
});
test.after.always(t => t.context.shutdown?.());

test.serial('bootstrap produces provisioning vat', async t => {
  const { EV } = t.context.runUtils;
  const provisioning = await EV.vat('bootstrap').consumeItem('provisioning');
  console.timeLog('DefaultTestContext', 'provisioning');
  t.log('provisioning', provisioning);
  t.truthy(provisioning);
});

test.serial('bootstrap launches network, ibc vats', async t => {
  const { EV } = t.context.runUtils;

  t.log('network proposal executed');
  const vatStore = await EV.vat('bootstrap').consumeItem('vatStore');
  t.true(await EV(vatStore).has('ibc'), 'ibc');
  t.true(await EV(vatStore).has('network'), 'network');
});

test.serial('test contracts are installed', async t => {
  const { bundleCache } = t.context;
  const { EV } = t.context.runUtils;
  const zoe: ZoeService = await EV.vat('bootstrap').consumeItem('zoe');
  for (const [name, path] of entries(asset)) {
    const bundle = await bundleCache.load(path, name);
    const installation = await EV(zoe).install(bundle);
    t.truthy(installation);
    assign(t.context.installation, { [name]: installation });
  }
});

const upgradeVats = async (t, EV, vatsToUpgrade) => {
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
    t.log(vatName, result);
    t.true(result.incarnationNumber > 0);
  }
};

test.serial('upgrade at many points in network API flow', async t => {
  const { installation } = t.context;
  const { EV } = t.context.runUtils;
  const portAllocator = await EV.vat('bootstrap').consumeItem('portAllocator');
  const zoe: ZoeService = await EV.vat('bootstrap').consumeItem('zoe');

  const allSteps: TestStep[] = typedEntries({
    startServer: async (_opts, label) => {
      const started = await EV(zoe).startInstance(
        installation.ibcServerMock,
        {},
        {},
        { portAllocator },
      );
      t.truthy(started.creatorFacet, `${label} ibcServerMock`);
      return { server: started.creatorFacet };
    },
    requestListening: async opts => {
      await EV.sendOnly(opts.server).listen();
      return opts;
    },
    startListening: async opts => {
      await EV.sendOnly(opts.server).dequeue('onListen');
      return opts;
    },
    startClient: async (opts, label) => {
      const started = await EV(zoe).startInstance(
        installation.ibcClientMock,
        {},
        {},
        { portAllocator },
      );
      t.truthy(started.creatorFacet, `${label} ibcClientMock`);
      return { ...opts, client: started.creatorFacet };
    },
    getAddresses: async (opts, label) => {
      const serverAddress = await EV(opts.server).getLocalAddress();
      const clientAddress = await EV(opts.client).getLocalAddress();
      t.log(`${label} server ${serverAddress} client ${clientAddress}`);
      return { ...opts, serverAddress };
    },
    requestConnection: async opts => {
      await EV.sendOnly(opts.client).connect(opts.serverAddress);
      return opts;
    },
    acceptConnection: async opts => {
      await EV.sendOnly(opts.server).dequeue('onAccept');
      return opts;
    },
    openConnection: async opts => {
      await EV.sendOnly(opts.server).dequeue('onOpen');
      return opts;
    },
    sendPacket: async (opts, label) => {
      await EV.sendOnly(opts.client).send(label);
      return opts;
    },
    respond: async opts => {
      await EV.sendOnly(opts.server).dequeue('onReceive');
      return opts;
    },
    checkAck: async (opts, label) => {
      const ack = await EV(opts.client).getAck();
      t.is(ack, `got ${label}`, `${label} expected echo`);
      return { ...opts, ack };
    },
    closeConnection: async opts => {
      await EV(opts.client).close();
    },
  } satisfies Record<string, TestStep[1]>);

  await testInterruptedSteps(t, allSteps, async () => {
    await upgradeVats(t, EV, ['ibc', 'network']);
  });
});
