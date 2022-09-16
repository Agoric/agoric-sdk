/* global process */
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
import { openSwingStore, DEFAULT_LMDB_MAP_SIZE } from '@agoric/swing-store';
import { BridgeId as BRIDGE_ID } from '@agoric/internal';

import { extractCoreProposalBundles } from '@agoric/deploy-script-support/src/extract-proposal.js';

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
import * as ActionType from './action-types.js';
import { parseParams } from './params.js';

const console = anylogger('launch-chain');
const blockManagerConsole = anylogger('block-manager');

/**
 * Return the key in the reserved "host.*" section of the swing-store
 *
 * @param {string} path
 */
const getHostKey = path => `host.${path}`;

async function buildSwingset(
  mailboxStorage,
  bridgeOutbound,
  hostStorage,
  vatconfig,
  argv,
  env,
  { debugName = undefined, slogCallbacks, slogFile, slogSender },
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
    if (swingsetIsInitialized(hostStorage)) {
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

    await initializeSwingset(config, argv, hostStorage, { debugPrefix });
  }
  await ensureSwingsetInitialized();
  const controller = await makeSwingsetController(
    hostStorage,
    deviceEndowments,
    {
      env,
      slogCallbacks,
      slogFile,
      slogSender,
    },
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
    emptyCrank() {
      return true;
    },
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
  metricsProvider = DEFAULT_METER_PROVIDER,
  slogFile = undefined,
  slogSender,
  mapSize = DEFAULT_LMDB_MAP_SIZE,
  swingStoreTraceFile,
  keepSnapshots,
  afterCommitCallback = async () => ({}),
}) {
  console.info('Launching SwingSet kernel');

  const { kvStore, streamStore, snapStore, commit } = openSwingStore(
    kernelStateDBDir,
    { mapSize, traceFile: swingStoreTraceFile, keepSnapshots },
  );
  const hostStorage = {
    kvStore,
    streamStore,
    snapStore,
  };

  // Not to be confused with the gas model, this meter is for OpenTelemetry.
  const metricMeter = metricsProvider.getMeter('ag-chain-cosmos');
  const slogCallbacks = makeSlogCallbacks({
    metricMeter,
  });

  console.debug(`buildSwingset`);
  const { controller, mb, bridgeInbound, timer } = await buildSwingset(
    mailboxStorage,
    bridgeOutbound,
    hostStorage,
    vatconfig,
    argv,
    env,
    {
      debugName,
      slogCallbacks,
      slogFile,
      slogSender,
    },
  );

  /** @type {PublishKit<unknown>['publisher'] | undefined} */
  let installationPublisher;

  // Artificially create load if set.
  const END_BLOCK_SPIN_MS = env.END_BLOCK_SPIN_MS
    ? parseInt(env.END_BLOCK_SPIN_MS, 10)
    : 0;

  const { crankScheduler } = exportKernelStats({
    controller,
    metricMeter,
    log: console,
  });

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

  async function saveOutsideState(blockHeight, blockTime) {
    controller.writeSlogObject({
      type: 'cosmic-swingset-commit-block-start',
      blockHeight,
      blockTime,
    });
    const chainSends = clearChainSends();
    kvStore.set(getHostKey('height'), `${blockHeight}`);
    kvStore.set(getHostKey('blockTime'), `${blockTime}`);
    kvStore.set(getHostKey('chainSends'), JSON.stringify(chainSends));

    await commit();
    void Promise.resolve()
      .then(afterCommitCallback)
      .then((afterCommitStats = {}) => {
        controller.writeSlogObject({
          type: 'cosmic-swingset-after-commit-block',
          blockHeight,
          blockTime,
          ...afterCommitStats,
        });
      });

    controller.writeSlogObject({
      type: 'cosmic-swingset-commit-block-finish',
      blockHeight,
      blockTime,
    });
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

  async function beginBlock(blockHeight, blockTime, _params) {
    if (
      installationPublisher === undefined &&
      makeInstallationPublisher !== undefined
    ) {
      installationPublisher = makeInstallationPublisher();
    }

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

  let latestParams;
  let computedHeight = Number(kvStore.get(getHostKey('height')) || 0);
  let savedBlockTime = Number(kvStore.get(getHostKey('blockTime')) || 0);
  let runTime = 0;
  let chainTime;
  let beginBlockAction;
  let decohered;

  async function performAction(action) {
    // blockManagerConsole.error('Performing action', action);
    let p;
    switch (action.type) {
      case ActionType.BOOTSTRAP_BLOCK: {
        p = bootstrapBlock(action.blockTime);
        break;
      }
      case ActionType.BEGIN_BLOCK: {
        latestParams = parseParams(action.params);
        p = beginBlock(action.blockHeight, action.blockTime, latestParams);
        break;
      }

      case ActionType.DELIVER_INBOUND: {
        p = deliverInbound(action.peer, action.messages, action.ack);
        break;
      }

      case ActionType.VBANK_BALANCE_UPDATE: {
        p = doBridgeInbound(BRIDGE_ID.BANK, action);
        break;
      }

      case ActionType.IBC_EVENT: {
        p = doBridgeInbound(BRIDGE_ID.DIBC, action);
        break;
      }

      case ActionType.PLEASE_PROVISION: {
        p = doBridgeInbound(BRIDGE_ID.PROVISION, action);
        break;
      }

      case ActionType.INSTALL_BUNDLE: {
        p = installBundle(action.bundle);
        break;
      }

      case ActionType.CORE_EVAL: {
        p = doBridgeInbound(BRIDGE_ID.CORE, action);
        break;
      }

      case ActionType.WALLET_ACTION: {
        p = doBridgeInbound(BRIDGE_ID.WALLET, action);
        break;
      }

      case ActionType.WALLET_SPEND_ACTION: {
        p = doBridgeInbound(BRIDGE_ID.WALLET, action);
        break;
      }

      case ActionType.END_BLOCK: {
        p = endBlock(action.blockHeight, action.blockTime, latestParams);
        if (END_BLOCK_SPIN_MS) {
          // Introduce a busy-wait to artificially put load on the chain.
          p = p.then(res => {
            const startTime = Date.now();
            while (Date.now() - startTime < END_BLOCK_SPIN_MS);
            return res;
          });
        }
        break;
      }

      default: {
        assert.fail(X`${action.type} not recognized`);
      }
    }
    return p;
  }

  async function processAction(action) {
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

    const p = performAction(action);
    // Just attach some callbacks, but don't use the resulting neutered result
    // promise.
    p.then(finish, e => {
      // None of these must fail, and if they do, log them verbosely before
      // returning to the chain.
      blockManagerConsole.error(action.type, 'error:', e);
      finish();
    });
    // Return the original promise so that the caller gets the original
    // resolution or rejection.
    return p;
  }

  async function blockingSend(action) {
    if (decohered) {
      throw decohered;
    }

    // blockManagerConsole.warn(
    //   'FIGME: blockHeight',
    //   action.blockHeight,
    //   'received',
    //   action.type,
    // );
    switch (action.type) {
      case ActionType.BOOTSTRAP_BLOCK: {
        // This only runs for the very first block on the chain.
        verboseBlocks && blockManagerConsole.info('block bootstrap');
        if (computedHeight !== 0) {
          throw Error(
            `Cannot run a bootstrap block at height ${computedHeight}`,
          );
        }
        await processAction(action);
        break;
      }

      case ActionType.COMMIT_BLOCK: {
        verboseBlocks &&
          blockManagerConsole.info('block', action.blockHeight, 'commit');
        if (action.blockHeight !== computedHeight) {
          throw Error(
            `Committed height ${action.blockHeight} does not match computed height ${computedHeight}`,
          );
        }

        // Save the kernel's computed state just before the chain commits.
        const start2 = Date.now();
        await saveOutsideState(computedHeight, action.blockTime);

        const saveTime = Date.now() - start2;

        blockManagerConsole.debug(
          `wrote SwingSet checkpoint [run=${runTime}ms, chainSave=${chainTime}ms, kernelSave=${saveTime}ms]`,
        );

        break;
      }

      case ActionType.BEGIN_BLOCK: {
        verboseBlocks &&
          blockManagerConsole.info('block', action.blockHeight, 'begin');
        runTime = 0;
        beginBlockAction = action;
        break;
      }

      case ActionType.END_BLOCK: {
        // eslint-disable-next-line no-use-before-define
        if (computedHeight > 0 && computedHeight !== action.blockHeight) {
          // We only tolerate the trivial case.
          const restoreHeight = action.blockHeight - 1;
          if (restoreHeight !== computedHeight) {
            // Keep throwing forever.
            decohered = Error(
              // TODO unimplemented
              `Unimplemented reset state from ${computedHeight} to ${restoreHeight}`,
            );
            throw decohered;
          }
        }

        if (computedHeight === action.blockHeight) {
          // We are reevaluating, so send exactly the same downcalls to the chain.
          //
          // This is necessary only after a restart when Tendermint is reevaluating the
          // block that was interrupted and not committed.
          //
          // We assert that the return values are identical, which allows us to silently
          // clear the queue.
          for (const _ of actionQueue.consumeAll());
          try {
            replayChainSends();
          } catch (e) {
            // Very bad!
            decohered = e;
            throw e;
          }
        } else {
          // And now we actually process the queued actions down here, during
          // END_BLOCK, but still reentrancy-protected

          // Process our begin, queued actions, and end.
          await processAction(beginBlockAction); // BEGIN_BLOCK
          for (const a of actionQueue.consumeAll()) {
            // eslint-disable-next-line no-await-in-loop
            await processAction(a);
          }
          await processAction(action); // END_BLOCK

          // We write out our on-chain state as a number of chainSends.
          const start = Date.now();
          await saveChainState();
          chainTime = Date.now() - start;

          // Advance our saved state variables.
          beginBlockAction = undefined;
          computedHeight = action.blockHeight;
          savedBlockTime = action.blockTime;
        }

        break;
      }

      default: {
        assert.fail(
          X`Unrecognized action ${action}; are you sure you didn't mean to queue it?`,
        );
      }
    }
  }

  return {
    blockingSend,
    savedHeight: computedHeight,
    savedBlockTime,
    savedChainSends: JSON.parse(kvStore.get(getHostKey('chainSends')) || '[]'),
  };
}
