/* global process */
/* eslint-disable @jessie.js/no-nested-await */
import anylogger from 'anylogger';

import { E } from '@endo/far';
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
import { assert, Fail } from '@agoric/assert';
import { openSwingStore } from '@agoric/swing-store';
import { BridgeId as BRIDGE_ID } from '@agoric/internal';
import * as ActionType from '@agoric/internal/src/action-types.js';

import { extractCoreProposalBundles } from '@agoric/deploy-script-support/src/extract-proposal.js';

import {
  makeDefaultMeterProvider,
  makeInboundQueueMetrics,
  exportKernelStats,
  makeSlogCallbacks,
} from './kernel-stats.js';

import {
  BeansPerBlockComputeLimit,
  BeansPerVatCreation,
  BeansPerXsnapComputron,
  QueueInbound,
} from './sim-params.js';
import { parseParams, encodeQueueSizes } from './params.js';
import { makeQueue } from './make-queue.js';

const console = anylogger('launch-chain');
const blockManagerConsole = anylogger('block-manager');

/**
 * Return the key in the reserved "host.*" section of the swing-store
 *
 * @param {string} path
 */
const getHostKey = path => `host.${path}`;

/**
 * @param {Map<*, *>} mailboxStorage
 * @param {*} [bridgeOutbound]
 * @param {SwingStoreKernelStorage} kernelStorage
 * @param {string} vatconfig absolute path
 * @param {unknown[]} argv
 * @param {{ ROLE: string }} env
 * @param {*} options
 */
export async function buildSwingset(
  mailboxStorage,
  bridgeOutbound,
  kernelStorage,
  vatconfig,
  argv,
  env,
  { debugName = undefined, slogCallbacks, slogSender },
) {
  // FIXME: Find a better way to propagate the role.
  process.env.ROLE = argv.ROLE;
  env.ROLE = argv.ROLE;

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
    if (swingsetIsInitialized(kernelStorage)) {
      return;
    }

    // Find the entrypoints for all the core proposals.
    if (config.coreProposals) {
      const { bundles, code } = await extractCoreProposalBundles(
        config.coreProposals,
        vatconfig,
      );
      const bootVat = config.vats[config.bootstrap || 'bootstrap'];
      config.bundles = { ...config.bundles, ...bundles };

      // Tell the bootstrap code how to run the core proposals.
      bootVat.parameters = { ...bootVat.parameters, coreProposalCode: code };
    }
    config.pinBootstrapRoot = true;

    await initializeSwingset(config, argv, kernelStorage, { debugPrefix });
  }
  await ensureSwingsetInitialized();
  const controller = await makeSwingsetController(
    kernelStorage,
    deviceEndowments,
    {
      env,
      slogCallbacks,
      slogSender,
    },
  );

  // We DON'T want to run the kernel yet, only when the application decides
  // (either on bootstrap block (0) or in endBlock).

  return { controller, mb, bridgeInbound, timer };
}

/**
 * @typedef {import('@agoric/swingset-vat').RunPolicy & {
 *   shouldRun(): boolean;
 *   remainingBeans(): number;
 * }} ChainRunPolicy
 */

/**
 * @typedef {object} BeansPerUnit
 * @property {bigint} blockComputeLimit
 * @property {bigint} vatCreation
 * @property {bigint} xsnapComputron
 */

/**
 * @param {BeansPerUnit} beansPerUnit
 * @returns {ChainRunPolicy}
 */
function computronCounter({
  [BeansPerBlockComputeLimit]: blockComputeLimit,
  [BeansPerVatCreation]: vatCreation,
  [BeansPerXsnapComputron]: xsnapComputron,
}) {
  assert.typeof(blockComputeLimit, 'bigint');
  assert.typeof(vatCreation, 'bigint');
  assert.typeof(xsnapComputron, 'bigint');
  let totalBeans = 0n;
  const shouldRun = () => totalBeans < blockComputeLimit;
  const remainingBeans = () => blockComputeLimit - totalBeans;

  const policy = harden({
    vatCreated() {
      totalBeans += vatCreation;
      return shouldRun();
    },
    crankComplete(details = {}) {
      assert.typeof(details, 'object');
      if (details.computrons) {
        assert.typeof(details.computrons, 'bigint');

        // TODO: xsnapComputron should not be assumed here.
        // Instead, SwingSet should describe the computron model it uses.
        totalBeans += details.computrons * xsnapComputron;
      }
      return shouldRun();
    },
    crankFailed() {
      const failedComputrons = 1000000n; // who knows, 1M is as good as anything
      totalBeans += failedComputrons * xsnapComputron;
      return shouldRun();
    },
    emptyCrank() {
      return true;
    },
    shouldRun,
    remainingBeans,
  });
  return policy;
}

function neverStop() {
  return harden({
    vatCreated: () => true,
    crankComplete: () => true,
    crankFailed: () => true,
    emptyCrank: () => true,
  });
}

export async function launch({
  actionQueue,
  kernelStateDBDir,
  mailboxStorage,
  clearChainSends,
  replayChainSends,
  setActivityhash,
  bridgeOutbound,
  makeInstallationPublisher = undefined,
  vatconfig,
  argv,
  env = process.env,
  debugName = undefined,
  verboseBlocks = false,
  metricsProvider = makeDefaultMeterProvider(),
  slogSender,
  swingStoreTraceFile,
  keepSnapshots,
  afterCommitCallback = async () => ({}),
}) {
  console.info('Launching SwingSet kernel');

  const { kernelStorage, hostStorage } = openSwingStore(kernelStateDBDir, {
    traceFile: swingStoreTraceFile,
    keepSnapshots,
  });
  const { kvStore, commit } = hostStorage;

  // makeQueue() thinks it should commit/abort, but the kvStore doesn't provide
  // those ('commit' is reserved for flushing the block buffer). Furthermore
  // the kvStore only deals with string values.
  // We create a storage wrapper that adds a prefix to keys, serializes values,
  // and disables commit/abort.

  const inboundQueuePrefix = getHostKey('inboundQueue.');
  const inboundQueueStorage = harden({
    get: key => {
      const val = kvStore.get(inboundQueuePrefix + key);
      return val ? JSON.parse(val) : undefined;
    },
    set: (key, value) => {
      value !== undefined || Fail`value in inboundQueue must be defined`;
      kvStore.set(inboundQueuePrefix + key, JSON.stringify(value));
    },
    delete: key => kvStore.delete(inboundQueuePrefix + key),
    commit: () => {}, // disable
    abort: () => {}, // disable
  });
  /** @type {ReturnType<typeof makeQueue<{inboundNum: string; action: unknown}>>} */
  const inboundQueue = makeQueue(inboundQueueStorage);

  // Not to be confused with the gas model, this meter is for OpenTelemetry.
  const metricMeter = metricsProvider.getMeter('ag-chain-cosmos');
  const slogCallbacks = makeSlogCallbacks({
    metricMeter,
  });

  console.debug(`buildSwingset`);
  const { controller, mb, bridgeInbound, timer } = await buildSwingset(
    mailboxStorage,
    bridgeOutbound,
    kernelStorage,
    vatconfig,
    argv,
    env,
    {
      debugName,
      slogCallbacks,
      slogSender,
    },
  );

  /** @type {PublishKit<unknown>['publisher'] | undefined} */
  let installationPublisher;

  // Artificially create load if set.
  const END_BLOCK_SPIN_MS = env.END_BLOCK_SPIN_MS
    ? parseInt(env.END_BLOCK_SPIN_MS, 10)
    : 0;

  const inboundQueueMetrics = makeInboundQueueMetrics(inboundQueue.size());
  const { crankScheduler } = exportKernelStats({
    controller,
    metricMeter,
    log: console,
    inboundQueueMetrics,
  });

  async function bootstrapBlock() {
    // This is before the initial block, we need to finish processing the
    // entire bootstrap before opening for business.
    const policy = neverStop();
    await crankScheduler(policy);
    if (setActivityhash) {
      setActivityhash(controller.getActivityhash());
    }
  }

  let savedQueueAllowed = JSON.parse(
    kvStore.get(getHostKey('queueAllowed')) || '{}',
  );

  function updateQueueAllowed(_blockHeight, _blockTime, params) {
    assert(params.queueMax);
    assert(QueueInbound in params.queueMax);

    const inboundQueueMax = params.queueMax[QueueInbound];
    const inboundMempoolQueueMax = Math.floor(inboundQueueMax / 2);

    const inboundQueueSize = inboundQueue.size();

    const inboundQueueAllowed = Math.max(0, inboundQueueMax - inboundQueueSize);
    const inboundMempoolQueueAllowed = Math.max(
      0,
      inboundMempoolQueueMax - inboundQueueSize,
    );

    savedQueueAllowed = {
      // Keep up-to-date with queue size keys defined in
      // golang/cosmos/x/swingset/types/default-params.go
      inbound: inboundQueueAllowed,
      inbound_mempool: inboundMempoolQueueAllowed,
    };
  }

  async function saveChainState() {
    // Save the mailbox state.
    await mailboxStorage.commit();
  }

  async function saveOutsideState(blockHeight, blockTime) {
    const chainSends = clearChainSends();
    kvStore.set(getHostKey('height'), `${blockHeight}`);
    kvStore.set(getHostKey('blockTime'), `${blockTime}`);
    kvStore.set(getHostKey('chainSends'), JSON.stringify(chainSends));
    kvStore.set(getHostKey('queueAllowed'), JSON.stringify(savedQueueAllowed));

    await commit();
  }

  async function deliverInbound(sender, messages, ack, inboundNum) {
    Array.isArray(messages) || Fail`inbound given non-Array: ${messages}`;
    controller.writeSlogObject({
      type: 'cosmic-swingset-deliver-inbound',
      inboundNum,
      sender,
      count: messages.length,
    });
    if (!mb.deliverInbound(sender, messages, ack)) {
      return;
    }
    console.debug(`mboxDeliver:   ADDED messages`);
  }

  async function doBridgeInbound(source, body, inboundNum) {
    controller.writeSlogObject({
      type: 'cosmic-swingset-bridge-inbound',
      inboundNum,
      source,
    });
    // console.log(`doBridgeInbound`);
    // the inbound bridge will push messages onto the kernel run-queue for
    // delivery+dispatch to some handler vat
    bridgeInbound(source, body);
  }

  async function installBundle(bundleSource) {
    let bundle;
    try {
      bundle = JSON.parse(bundleSource);
    } catch (e) {
      blockManagerConsole.warn('INSTALL_BUNDLE warn:', e);
      return;
    }
    harden(bundle);

    const error = await controller.validateAndInstallBundle(bundle).then(
      () => null,
      (/** @type {unknown} */ errorValue) => errorValue,
    );

    const { endoZipBase64Sha512 } = bundle;

    if (installationPublisher !== undefined) {
      installationPublisher.publish(
        harden({
          endoZipBase64Sha512,
          installed: error === null,
          error,
        }),
      );
    }
  }

  function provideInstallationPublisher() {
    if (
      installationPublisher === undefined &&
      makeInstallationPublisher !== undefined
    ) {
      installationPublisher = makeInstallationPublisher();
    }
  }

  let savedHeight = Number(kvStore.get(getHostKey('height')) || 0);
  let savedBlockTime = Number(kvStore.get(getHostKey('blockTime')) || 0);
  let runTime = 0;
  let chainTime;
  let blockParams;
  let decohered;
  let afterCommitWorkDone = Promise.resolve();

  async function performAction(action, inboundNum) {
    // blockManagerConsole.error('Performing action', action);
    let p;
    switch (action.type) {
      case ActionType.DELIVER_INBOUND: {
        p = deliverInbound(
          action.peer,
          action.messages,
          action.ack,
          inboundNum,
        );
        break;
      }

      case ActionType.VBANK_BALANCE_UPDATE: {
        p = doBridgeInbound(BRIDGE_ID.BANK, action, inboundNum);
        break;
      }

      case ActionType.IBC_EVENT: {
        p = doBridgeInbound(BRIDGE_ID.DIBC, action, inboundNum);
        break;
      }

      case ActionType.PLEASE_PROVISION: {
        p = doBridgeInbound(BRIDGE_ID.PROVISION, action, inboundNum);
        break;
      }

      case ActionType.INSTALL_BUNDLE: {
        p = installBundle(action.bundle);
        break;
      }

      case ActionType.CORE_EVAL: {
        p = doBridgeInbound(BRIDGE_ID.CORE, action, inboundNum);
        break;
      }

      case ActionType.WALLET_ACTION: {
        p = doBridgeInbound(BRIDGE_ID.WALLET, action, inboundNum);
        break;
      }

      case ActionType.WALLET_SPEND_ACTION: {
        p = doBridgeInbound(BRIDGE_ID.WALLET, action, inboundNum);
        break;
      }

      default: {
        Fail`${action.type} not recognized`;
      }
    }
    return p;
  }

  async function runKernel(runPolicy, blockHeight) {
    let runNum = 0;
    async function runSwingset() {
      const initialBeans = runPolicy.remainingBeans();
      controller.writeSlogObject({
        type: 'cosmic-swingset-run-start',
        blockHeight,
        runNum,
        initialBeans,
      });
      // TODO: crankScheduler does a schedulerBlockTimeHistogram thing
      // that needs to be revisited, it used to be called once per
      // block, now it's once per processed inboundQueue item
      await crankScheduler(runPolicy);
      const remainingBeans = runPolicy.remainingBeans();
      controller.writeSlogObject({
        type: 'kernel-stats',
        stats: controller.getStats(),
      });
      controller.writeSlogObject({
        type: 'cosmic-swingset-run-finish',
        blockHeight,
        runNum,
        remainingBeans,
        usedBeans: initialBeans - remainingBeans,
      });
      runNum += 1;
      return runPolicy.shouldRun();
    }

    let keepGoing = await runSwingset();

    // Then process as much as we can from the inboundQueue, which contains
    // first the old actions followed by the newActions, running the
    // kernel to completion after each.
    if (keepGoing) {
      for (const { action, inboundNum } of inboundQueue.consumeAll()) {
        inboundQueueMetrics.decStat();
        // eslint-disable-next-line no-await-in-loop
        await performAction(action, inboundNum);
        // eslint-disable-next-line no-await-in-loop
        keepGoing = await runSwingset();
        if (!keepGoing) {
          // any leftover actions will remain on the inboundQueue for possible
          // processing in the next block
          break;
        }
      }
    }

    if (setActivityhash) {
      setActivityhash(controller.getActivityhash());
    }
  }

  async function endBlock(blockHeight, blockTime, params, newActions) {
    // This is called once per block, during the END_BLOCK event, and
    // only when we know that cosmos is in sync (else we'd skip kernel
    // execution). 'newActions' are the bridge/mailbox/etc events that
    // cosmos stored up for delivery to swingset in this block.

    // First, push all newActions onto the end of the inboundQueue,
    // remembering that inboundQueue might still have work from the
    // previous block
    let actionNum = 0;
    for (const action of newActions) {
      const inboundNum = `${blockHeight}-${actionNum}`;
      inboundQueue.push({ action, inboundNum });
      actionNum += 1;
      inboundQueueMetrics.incStat();
    }

    // We update the timer device at the start of each block, which might push
    // work onto the end of the kernel run-queue (if any timers were ready to
    // wake), where it will be followed by actions triggered by the block's
    // swingset transactions.
    // If the queue was empty, the timer work gets the first "cycle", and might
    // run to completion before the block actions get their own cycles.
    const addedToQueue = timer.poll(blockTime);
    console.debug(
      `polled; blockTime:${blockTime}, h:${blockHeight}; ADDED =`,
      addedToQueue,
    );

    // make a runPolicy that will be shared across all cycles
    const runPolicy = computronCounter(params.beansPerUnit);

    await runKernel(runPolicy, blockHeight);

    if (END_BLOCK_SPIN_MS) {
      // Introduce a busy-wait to artificially put load on the chain.
      const startTime = Date.now();
      while (Date.now() - startTime < END_BLOCK_SPIN_MS);
    }
  }

  /**
   * @template T
   * @param {string} type
   * @param {() => Promise<T>} fn
   */
  async function processAction(type, fn) {
    const start = Date.now();
    const finish = res => {
      // blockManagerConsole.error(
      //   'Action',
      //   action.type,
      //   action.blockHeight,
      //   'is done!',
      // );
      runTime += Date.now() - start;
      return res;
    };

    const p = fn();
    // Just attach some callbacks, but don't use the resulting neutered result
    // promise.
    E.when(p, finish, e => {
      // None of these must fail, and if they do, log them verbosely before
      // returning to the chain.
      blockManagerConsole.error(type, 'error:', e);
      finish();
    });
    // Return the original promise so that the caller gets the original
    // resolution or rejection.
    return p;
  }

  function blockNeedsExecution(blockHeight) {
    if (savedHeight === 0) {
      // 0 is the default we use when the DB is empty, so we've only executed
      // the bootstrap block but no others. The first non-bootstrap block can
      // have an arbitrary height (the chain may not start at 1), but since the
      // bootstrap block doesn't commit (and doesn't have a begin/end) there is
      // no risk of hangover inconsistency for the first block, and it can
      // always be executed.
      return true;
    }

    if (blockHeight === savedHeight + 1) {
      // execute the next block
      return true;
    }

    if (blockHeight === savedHeight) {
      // we have already committed this block, so "replay" by not executing
      // (but returning all the results from the last time)
      return false;
    }

    // we're being asked to rewind by more than one block, or execute something
    // more than one block in the future, neither of which we can accommodate.
    // Keep throwing forever.
    decohered = Error(
      // TODO unimplemented
      `Unimplemented reset state from ${savedHeight} to ${blockHeight}`,
    );
    throw decohered;
  }

  async function afterCommit(blockHeight, blockTime) {
    await Promise.resolve()
      .then(afterCommitCallback)
      .then((afterCommitStats = {}) => {
        controller.writeSlogObject({
          type: 'cosmic-swingset-after-commit-stats',
          blockHeight,
          blockTime,
          ...afterCommitStats,
        });
      });
  }

  async function blockingSend(action) {
    if (decohered) {
      throw decohered;
    }

    await afterCommitWorkDone;

    // blockManagerConsole.warn(
    //   'FIGME: blockHeight',
    //   action.blockHeight,
    //   'received',
    //   action.type,
    // );
    switch (action.type) {
      case ActionType.BOOTSTRAP_BLOCK: {
        // This only runs for the very first block on the chain.
        const { blockTime } = action;
        verboseBlocks && blockManagerConsole.info('block bootstrap');
        if (savedHeight !== 0) {
          throw Error(`Cannot run a bootstrap block at height ${savedHeight}`);
        }
        const blockHeight = 0;
        const runNum = 0;
        controller.writeSlogObject({
          type: 'cosmic-swingset-bootstrap-block-start',
          blockTime,
        });
        controller.writeSlogObject({
          type: 'cosmic-swingset-run-start',
          blockHeight,
          runNum,
        });
        await processAction(action.type, bootstrapBlock);
        controller.writeSlogObject({
          type: 'cosmic-swingset-run-finish',
          blockHeight,
          runNum,
        });
        controller.writeSlogObject({
          type: 'cosmic-swingset-bootstrap-block-finish',
          blockTime,
        });
        return undefined;
      }

      case ActionType.COMMIT_BLOCK: {
        const { blockHeight, blockTime } = action;
        verboseBlocks &&
          blockManagerConsole.info('block', blockHeight, 'commit');
        if (blockHeight !== savedHeight) {
          throw Error(
            `Committed height ${blockHeight} does not match saved height ${savedHeight}`,
          );
        }

        controller.writeSlogObject({
          type: 'cosmic-swingset-commit-block-start',
          blockHeight,
          blockTime,
        });

        // Save the kernel's computed state just before the chain commits.
        const start2 = Date.now();
        await saveOutsideState(savedHeight, blockTime);
        const saveTime = Date.now() - start2;
        controller.writeSlogObject({
          type: 'cosmic-swingset-commit-block-finish',
          blockHeight,
          blockTime,
        });

        blockParams = undefined;

        blockManagerConsole.debug(
          `wrote SwingSet checkpoint [run=${runTime}ms, chainSave=${chainTime}ms, kernelSave=${saveTime}ms]`,
        );

        afterCommitWorkDone = afterCommit(blockHeight, blockTime);

        return undefined;
      }

      case ActionType.BEGIN_BLOCK: {
        const { blockHeight, blockTime, params } = action;
        blockParams = parseParams(params);
        verboseBlocks &&
          blockManagerConsole.info('block', blockHeight, 'begin');
        runTime = 0;

        if (blockNeedsExecution(blockHeight)) {
          // We are not reevaluating, so compute a new queueAllowed
          updateQueueAllowed(blockHeight, blockTime, blockParams);
        }

        controller.writeSlogObject({
          type: 'cosmic-swingset-begin-block',
          blockHeight,
          blockTime,
          queueAllowed: savedQueueAllowed,
        });

        return { queue_allowed: encodeQueueSizes(savedQueueAllowed) };
      }

      case ActionType.END_BLOCK: {
        const { blockHeight, blockTime } = action;
        controller.writeSlogObject({
          type: 'cosmic-swingset-end-block-start',
          blockHeight,
          blockTime,
        });

        blockParams || Fail`blockParams missing`;

        if (!blockNeedsExecution(blockHeight)) {
          // We are reevaluating, so do not do any work, and send exactly the
          // same downcalls to the chain.
          //
          // This is necessary only after a restart when Tendermint is reevaluating the
          // block that was interrupted and not committed.
          //
          // We assert that the return values are identical, which allows us to silently
          // clear the queue.
          try {
            replayChainSends();
          } catch (e) {
            // Very bad!
            decohered = e;
            throw e;
          }
        } else {
          // And now we actually process the queued actions down here, during
          // END_BLOCK, but still reentrancy-protected.

          provideInstallationPublisher();

          await processAction(action.type, async () =>
            endBlock(
              blockHeight,
              blockTime,
              blockParams,
              actionQueue.consumeAll(),
            ),
          );

          // We write out our on-chain state as a number of chainSends.
          const start = Date.now();
          await saveChainState();
          chainTime = Date.now() - start;

          // Advance our saved state variables.
          savedHeight = blockHeight;
          savedBlockTime = blockTime;
        }
        controller.writeSlogObject({
          type: 'cosmic-swingset-end-block-finish',
          blockHeight,
          blockTime,
        });

        return undefined;
      }

      default: {
        throw Fail`Unrecognized action ${action}; are you sure you didn't mean to queue it?`;
      }
    }
  }

  function shutdown() {
    return controller.shutdown();
  }

  return {
    blockingSend,
    shutdown,
    savedHeight,
    savedBlockTime,
    savedChainSends: JSON.parse(kvStore.get(getHostKey('chainSends')) || '[]'),
  };
}
