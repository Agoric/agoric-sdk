/** @file upgrade network / IBC vat at many points in state machine */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { createRequire } from 'module';
import type { TestFn } from 'ava';
import type { BridgeHandler } from '@agoric/vats';
import { makeSwingsetTestKit } from '../../tools/supports.ts';
import { makeBridge } from './ibcBridgeMock.js';
import { BridgeId } from '@agoric/internal';
import { makeNodeBundleCache } from '@endo/bundle-source/cache.js';

const { entries, assign } = Object;

const PLATFORM_CONFIG = '@agoric/vm-config/decentral-itest-vaults-config.json';

const nodeRequire = createRequire(import.meta.url);
const asset = {
  ibcServerMock: nodeRequire.resolve('./ibcServerMock.js'),
  ibcClientMock: nodeRequire.resolve('./ibcClientMock.js'),
};

export const makeTestContext = async t => {
  console.time('DefaultTestContext');
  const { bridgeHandler, events } = makeBridge(t);
  const bundleDir = 'bundles/vaults';
  const bundleCache = await makeNodeBundleCache(bundleDir, {}, s => import(s));
  const swingsetTestKit = await makeSwingsetTestKit(t.log, bundleDir, {
    configSpecifier: PLATFORM_CONFIG,
    bridgeHandlers: {
      [BridgeId.DIBC]: obj => bridgeHandler.toBridge(obj),
    },
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

test.serial('network vat core eval launches network, ibc vats', async t => {
  const { controller, buildProposal } = t.context;
  const { EV } = t.context.runUtils;

  t.log('building network proposal');
  const proposal = await buildProposal(
    '@agoric/builders/scripts/vats/init-network.js',
  );

  for await (const bundle of proposal.bundles) {
    await controller.validateAndInstallBundle(bundle);
  }
  t.log('installed', proposal.bundles.length, 'bundles');

  t.log('executing', proposal.evals.length, 'core evals');
  const bridgeMessage = { type: 'CORE_EVAL', evals: proposal.evals };
  const coreHandler: BridgeHandler = await EV.vat('bootstrap').consumeItem(
    'coreEvalBridgeHandler',
  );
  await EV(coreHandler).fromBridge(bridgeMessage);

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
    const { bundleID } = await EV(vatUpgradeInfo).get(vatName);
    const bcap = await EV(vatAdminSvc).getBundleCap(bundleID);
    const { adminNode } = await EV(vatStore).get(vatName);
    const result = await EV(adminNode).upgrade(bcap);
    t.log(vatName, result);
    t.true(result.incarnationNumber > 0);
  }
};

test.serial('upgrade at many points in network API flow', async t => {
  const { installation } = t.context;
  const { EV } = t.context.runUtils;
  const networkVat = await EV.vat('bootstrap').consumeItem('networkVat');
  const zoe: ZoeService = await EV.vat('bootstrap').consumeItem('zoe');

  const flow = entries({
    bindPorts: async label => {
      const serverPort = await EV(networkVat).bind('/ibc-port/');
      const clientPort = await EV(networkVat).bind('/ibc-port/');
      return [label, { serverPort, clientPort }];
    },
    startServer: async ([label, opts]) => {
      const started = await EV(zoe).startInstance(
        installation.ibcServerMock,
        {},
        {},
        { boundPort: opts.serverPort },
      );
      t.truthy(started.creatorFacet, `${label} ibcServerMock`);
      return [label, { ...opts, server: started.creatorFacet }];
    },
    startListening: async ([label, opts]) => {
      await EV.sendOnly(opts.server).listen();
      await EV.sendOnly(opts.server).dequeue('onListen');
      return [label, opts];
    },
    getAddresses: async ([label, opts]) => {
      const serverAddress = await EV(opts.serverPort).getLocalAddress();
      const clientAddress = await EV(opts.clientPort).getLocalAddress();
      t.log(`${label} server ${serverAddress} client ${clientAddress}`);
      return [label, { ...opts, serverAddress }];
    },
    startClient: async ([label, opts]) => {
      const started = await EV(zoe).startInstance(
        installation.ibcClientMock,
        {},
        {},
        { myPort: opts.clientPort },
      );
      t.truthy(started.creatorFacet, `${label} ibcClientMock`);
      return [label, { ...opts, client: started.creatorFacet }];
    },
    startConnecting: async ([label, opts]) => {
      await EV.sendOnly(opts.client).connect(opts.serverAddress);
      await EV.sendOnly(opts.server).dequeue('onAccept');
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
    closeConnection: async ([label, opts]) => {
      await EV(opts.client).close();
    },
  });

  const doSteps = async (label, steps, input: unknown = undefined) => {
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
    remainingSteps: [string, Function][];
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
