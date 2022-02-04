import anylogger from 'anylogger';

import {
  buildMailbox,
  buildMailboxStateMap,
  buildTimer,
  buildBridge,
  swingsetIsInitialized,
  initializeSwingset,
  makeSwingsetController,
  loadBasedir,
  loadSwingsetConfigFile,
} from '@agoric/swingset-vat';
import { assert, details as X } from '@agoric/assert';
import { openSwingStore } from '@agoric/swing-store';
import {
  DEFAULT_METER_PROVIDER,
  exportKernelStats,
  makeSlogCallbacks,
} from './kernel-stats.js';

import {
  BeansPerBlockComputeLimit,
  BeansPerVatCreation,
  BeansPerXsnapComputron,
} from './sim-params.js';

const console = anylogger('launch-chain');

const SWING_STORE_META_KEY = 'cosmos/meta';

async function buildSwingset(
  mailboxStorage,
  bridgeOutbound,
  hostStorage,
  vatconfig,
  argv,
  { consensusMode, debugName = undefined, slogCallbacks, slogFile },
) {
  const debugPrefix = debugName === undefined ? '' : `${debugName}:`;
  let config = await loadSwingsetConfigFile(vatconfig);
  if (config === null) {
    config = loadBasedir(vatconfig);
  }
  const mbs = buildMailboxStateMap(mailboxStorage);
  const timer = buildTimer();
  const mb = buildMailbox(mbs);
  config.devices = {
    mailbox: {
      sourceSpec: mb.srcPath,
    },
    timer: {
      sourceSpec: timer.srcPath,
    },
  };
  const deviceEndowments = {
    mailbox: { ...mb.endowments },
    timer: { ...timer.endowments },
  };

  let bridgeInbound;
  if (bridgeOutbound) {
    const bd = buildBridge(bridgeOutbound);
    config.devices.bridge = {
      sourceSpec: bd.srcPath,
    };
    deviceEndowments.bridge = { ...bd.endowments };
    bridgeInbound = bd.deliverInbound;
  }

  async function ensureSwingsetInitialized() {
    if (swingsetIsInitialized(hostStorage)) {
      return;
    }
    await initializeSwingset(config, argv, hostStorage, { debugPrefix });
  }
  await ensureSwingsetInitialized();
  const controller = await makeSwingsetController(
    hostStorage,
    deviceEndowments,
    { overrideVatManagerOptions: { consensusMode }, slogCallbacks, slogFile },
  );

  // We DON'T want to run the kernel yet, only when the application decides
  // (either on bootstrap block (0) or in endBlock).

  return { controller, mb, bridgeInbound, timer };
}

function computronCounter({
  [BeansPerBlockComputeLimit]: blockComputeLimit,
  [BeansPerVatCreation]: vatCreation,
  [BeansPerXsnapComputron]: xsnapComputron,
}) {
  assert.typeof(blockComputeLimit, 'bigint');
  assert.typeof(vatCreation, 'bigint');
  assert.typeof(xsnapComputron, 'bigint');
  let totalBeans = 0n;
  /** @type { RunPolicy } */
  const policy = harden({
    vatCreated() {
      totalBeans += vatCreation;
      return totalBeans < blockComputeLimit;
    },
    crankComplete(details = {}) {
      assert.typeof(details, 'object');
      if (details.computrons) {
        assert.typeof(details.computrons, 'bigint');

        // TODO: xsnapComputron should not be assumed here.
        // Instead, SwingSet should describe the computron model it uses.
        totalBeans += details.computrons * xsnapComputron;
      }
      return totalBeans < blockComputeLimit;
    },
    crankFailed() {
      const failedComputrons = 1000000n; // who knows, 1M is as good as anything
      totalBeans += failedComputrons * xsnapComputron;
      return totalBeans < blockComputeLimit;
    },
  });
  return policy;
}

function neverStop() {
  return harden({
    vatCreated: () => true,
    crankComplete: () => true,
    crankFailed: () => true,
  });
}

export async function launch(
  kernelStateDBDir,
  mailboxStorage,
  setActivityhash,
  bridgeOutbound,
  vatconfig,
  argv,
  debugName = undefined,
  meterProvider = DEFAULT_METER_PROVIDER,
  slogFile = undefined,
  consensusMode = false,
) {
  console.info('Launching SwingSet kernel');

  const { kvStore, streamStore, snapStore, commit } =
    openSwingStore(kernelStateDBDir);
  const hostStorage = {
    kvStore,
    streamStore,
    snapStore,
  };

  // Not to be confused with the gas model, this meter is for OpenTelemetry.
  const metricMeter = meterProvider.getMeter('ag-chain-cosmos');
  const METRIC_LABELS = { app: 'ag-chain-cosmos' };

  const slogCallbacks = makeSlogCallbacks({
    metricMeter,
    labels: METRIC_LABELS,
  });

  console.debug(`buildSwingset`);
  const { controller, mb, bridgeInbound, timer } = await buildSwingset(
    mailboxStorage,
    bridgeOutbound,
    hostStorage,
    vatconfig,
    argv,
    {
      debugName,
      slogCallbacks,
      slogFile,
      consensusMode,
    },
  );

  const { schedulerCrankTimeHistogram, schedulerBlockTimeHistogram } =
    exportKernelStats({
      controller,
      metricMeter,
      log: console,
      labels: METRIC_LABELS,
    });

  async function crankScheduler(policy, clock = () => Date.now()) {
    let now = clock();
    let crankStart = now;
    const blockStart = now;

    const instrumentedPolicy = harden({
      ...policy,
      crankComplete(details) {
        const go = policy.crankComplete(details);
        schedulerCrankTimeHistogram.record(now - crankStart);
        crankStart = now;
        now = clock();
        return go;
      },
    });
    await controller.run(instrumentedPolicy);

    now = Date.now();
    schedulerBlockTimeHistogram.record((now - blockStart) / 1000);
  }

  async function bootstrapBlock(blockTime) {
    controller.writeSlogObject({
      type: 'cosmic-swingset-bootstrap-block-start',
      blockTime,
    });
    // This is before the initial block, we need to finish processing the
    // entire bootstrap before opening for business.
    const policy = neverStop();
    await crankScheduler(policy);
    controller.writeSlogObject({
      type: 'cosmic-swingset-bootstrap-block-finish',
      blockTime,
    });
    if (setActivityhash) {
      setActivityhash(controller.getActivityhash());
    }
  }

  async function endBlock(blockHeight, blockTime, params) {
    controller.writeSlogObject({
      type: 'cosmic-swingset-end-block-start',
      blockHeight,
      blockTime,
    });

    const policy = computronCounter(params.beansPerUnit);
    await crankScheduler(policy);
    controller.writeSlogObject({
      type: 'cosmic-swingset-end-block-finish',
      blockHeight,
      blockTime,
    });
    if (setActivityhash) {
      setActivityhash(controller.getActivityhash());
    }
  }

  async function saveChainState() {
    // Save the mailbox state.
    await mailboxStorage.commit();
  }

  async function saveOutsideState(savedHeight, savedActions, savedChainSends) {
    kvStore.set(
      SWING_STORE_META_KEY,
      JSON.stringify([savedHeight, savedActions, savedChainSends]),
    );
    await commit();
  }

  async function deliverInbound(sender, messages, ack) {
    assert(Array.isArray(messages), X`inbound given non-Array: ${messages}`);
    controller.writeSlogObject({
      type: 'cosmic-swingset-deliver-inbound',
      sender,
      count: messages.length,
    });
    if (!mb.deliverInbound(sender, messages, ack)) {
      return;
    }
    console.debug(`mboxDeliver:   ADDED messages`);
  }

  async function doBridgeInbound(source, body) {
    controller.writeSlogObject({
      type: 'cosmic-swingset-bridge-inbound',
      source,
    });
    // console.log(`doBridgeInbound`);
    // the inbound bridge will push messages onto the kernel run-queue for
    // delivery+dispatch to some handler vat
    bridgeInbound(source, body);
  }

  async function beginBlock(blockHeight, blockTime, _params) {
    controller.writeSlogObject({
      type: 'cosmic-swingset-begin-block',
      blockHeight,
      blockTime,
    });
    const addedToQueue = timer.poll(blockTime);
    console.debug(
      `polled; blockTime:${blockTime}, h:${blockHeight}; ADDED =`,
      addedToQueue,
    );
  }

  const [savedHeight, savedActions, savedChainSends] = JSON.parse(
    kvStore.get(SWING_STORE_META_KEY) || '[0, [], []]',
  );

  return {
    deliverInbound,
    doBridgeInbound,
    // bridgeOutbound,
    bootstrapBlock,
    beginBlock,
    endBlock,
    saveChainState,
    saveOutsideState,
    savedHeight,
    savedActions,
    savedChainSends,
  };
}
