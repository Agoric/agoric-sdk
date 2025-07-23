/* eslint-env node */

import fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import nativePath from 'node:path';

import tmp from 'tmp';
import { Fail } from '@endo/errors';

import {
  SwingsetMessageType,
  QueuedActionType,
} from '@agoric/internal/src/action-types.js';
import * as STORAGE_PATH from '@agoric/internal/src/chain-storage-paths.js';
import { deepCopyJsonable } from '@agoric/internal/src/js-utils.js';
import { makeTempDirFactory } from '@agoric/internal/src/tmpDir.js';
import { makeRunUtils } from '@agoric/swingset-vat/tools/run-utils.js';
import { initSwingStore } from '@agoric/swing-store';
import {
  extractPortNums,
  makeLaunchChain,
  makeQueueStorage,
} from '../src/chain-main.js';
import { DEFAULT_SIM_SWINGSET_PARAMS } from '../src/sim-params.js';
import { makeQueue } from '../src/helpers/make-queue.js';

/** @import {EReturn} from '@endo/far'; */
/** @import { BlockInfo, InitMsg } from '@agoric/internal/src/chain-utils.js' */
/** @import { ManagerType, SwingSetConfig } from '@agoric/swingset-vat' */
/** @import { InboundQueue } from '../src/launch-chain.js'; */

const tmpDir = makeTempDirFactory(tmp);

/**
 * @template T
 * @typedef {(input: T) => T} Replacer
 */

/** @type {Replacer<object>} */
const stripUndefined = obj =>
  Object.fromEntries(
    Object.entries(obj).filter(([_key, value]) => value !== undefined),
  );

/** @type {InitMsg} */
export const defaultInitMessage = harden({
  type: SwingsetMessageType.AG_COSMOS_INIT,
  blockHeight: 100,
  blockTime: Math.floor(Date.parse('2020-01-01T00:00Z') / 1000),
  chainID: 'localtest',
  params: DEFAULT_SIM_SWINGSET_PARAMS,
  supplyCoins: [],

  // cosmos-sdk module port mappings are generally ignored in testing, but
  // relevant in live blockchains.
  // Include them with unpredictable values.
  ...Object.fromEntries(
    Object.entries({
      storagePort: 0,
      swingsetPort: 0,
      vbankPort: 0,
      vibcPort: 0,
    })
      .sort(() => Math.random() - 0.5)
      .map(([name, _zero], i) => [name, i + 1]),
  ),
});
/** @type {InitMsg} */
export const defaultBootstrapMessage = harden({
  ...deepCopyJsonable(defaultInitMessage),
  blockHeight: 1,
  blockTime: Math.floor(Date.parse('2010-01-01T00:00Z') / 1000),
  isBootstrap: true,
  supplyCoins: [
    { denom: 'ubld', amount: `${50_000n * 10n ** 6n}` },
    { denom: 'uist', amount: `${1_000_000n * 10n ** 6n}` },
  ],
});

/**
 * This is intended as the minimum practical definition needed for testing that
 * runs with a mock chain on the other side of a bridge. The bootstrap vat is a
 * generic object that exposes reflective methods for inspecting and
 * interacting with devices and other vats, and is also capable of handling
 * 'CORE_EVAL' requests containing a list of { json_permits, js_code } 'evals'
 * by evaluating the code in an environment constrained by the permits (and it
 * registers itself with the bridge vat as the recipient of such requests).
 *
 * @type {SwingSetConfig}
 */
const baseConfig = harden({
  defaultReapInterval: 'never',
  defaultReapGCKrefs: 'never',
  defaultManagerType: undefined,
  bootstrap: 'bootstrap',
  vats: {
    bootstrap: {
      sourceSpec: '@agoric/vats/tools/bootstrap-chain-reflective.js',
      creationOptions: {
        critical: true,
      },
      parameters: {
        baseManifest: 'MINIMAL',
      },
    },
  },
  bundles: {
    agoricNames: {
      sourceSpec: '@agoric/vats/src/vat-agoricNames.js',
    },
    bridge: {
      sourceSpec: '@agoric/vats/src/vat-bridge.js',
    },
  },
});

/**
 * Start a SwingSet kernel to be used by tests and benchmarks, returning objects
 * and functions for representing a (mock) blockchain to which it is connected.
 *
 * Not all `launch`/`buildSwingset` inputs are exposed as inputs here, but that
 * should be fixed if/when the need arises (while continuing to construct
 * defaults as appropriate).
 *
 * The shutdown() function _must_ be called after the test or benchmarks are
 * complete, else V8 will see the xsnap workers still running, and will never
 * exit (leading to a timeout error). Ava tests should use
 * t.after.always(shutdown), because the normal t.after() hooks are not run if a
 * test fails.
 *
 * @param {((destPort: string, msg: unknown) => unknown)} receiveBridgeSend
 * @param {object} [options]
 * @param {string | null} [options.bundleDir] relative to working directory
 * @param {SwingSetConfig['bundles']} [options.bundles] extra bundles configuration
 * @param {Partial<SwingSetConfig>} [options.configOverrides] extensions to the
 *   default SwingSet configuration (may be overridden by more specific options
 *   such as `defaultManagerType`)
 * @param {string} [options.debugName]
 * @param {ManagerType} [options.defaultManagerType] As documented at
 *   {@link ../../../docs/env.md#swingset_worker_type}, the implicit default of
 *   'local' can be overridden by a SWINGSET_WORKER_TYPE environment variable.
 * @param {typeof process['env']} [options.env]
 * @param {Replacer<InitMsg>} [options.fixupInitMessage] a final opportunity to make
 *   any changes
 * @param {Replacer<SwingSetConfig>} [options.fixupConfig] a final opportunity
 *   to make any changes
 * @param {import('@agoric/telemetry').SlogSender} [options.slogSender]
 * @param {import('../src/chain-main.js').CosmosSwingsetConfig} [options.swingsetConfig]
 * @param {import('@agoric/swing-store').SwingStore} [options.swingStore]
 *   defaults to a new in-memory store
 * @param {SwingSetConfig['vats']} [options.vats] extra static vat configuration
 * @param {string} [options.baseBootstrapManifest] identifies the colletion of
 *   "behaviors" to run at bootstrap for creating and configuring the initial
 *   population of vats (see
 *   {@link ../../vats/tools/bootstrap-chain-reflective.js})
 * @param {string[]} [options.addBootstrapBehaviors] additional specific
 *   behavior functions to augment the selected manifest (see
 *   {@link ../../vats/src/core})
 * @param {string[]} [options.bootstrapCoreEvals] code defining functions to be
 *   called with a set of powers, each in their own isolated compartment
 * @param {object} [powers]
 * @param {Pick<import('node:fs/promises'), 'mkdir'>} [powers.fsp]
 * @param {typeof import('node:path').resolve} [powers.resolvePath]
 */
export const makeCosmicSwingsetTestKit = async (
  receiveBridgeSend,
  {
    // Options for the SwingSet controller/kernel.
    bundleDir = 'bundles',
    bundles,
    configOverrides,
    defaultManagerType,
    debugName,
    env = process.env,
    fixupInitMessage,
    fixupConfig,
    slogSender,
    swingsetConfig,
    swingStore,
    vats,

    // Options for vats (particularly the reflective bootstrap vat).
    baseBootstrapManifest,
    addBootstrapBehaviors,
    bootstrapCoreEvals,
  } = {},
  { fsp = fsPromises, resolvePath = nativePath.resolve } = {},
) => {
  await null;
  /** @type {SwingSetConfig} */
  let config = {
    ...deepCopyJsonable(baseConfig),
    ...configOverrides,
    ...stripUndefined({ defaultManagerType }),
  };
  if (bundleDir) {
    bundleDir = resolvePath(bundleDir);
    config.bundleCachePath = bundleDir;
    await fsp.mkdir(bundleDir, { recursive: true });
  }
  config.bundles = { ...config.bundles, ...bundles };
  config.vats = { ...config.vats, ...vats };

  // @ts-expect-error we assume that config.bootstrap is not undefined
  const bootstrapVatDesc = config.vats[config.bootstrap];
  Object.assign(
    bootstrapVatDesc.parameters,
    stripUndefined({
      baseManifest: baseBootstrapManifest,
      addBehaviors: addBootstrapBehaviors,
      coreProposalCodeSteps: bootstrapCoreEvals,
    }),
  );

  if (fixupConfig) config = fixupConfig(config);

  let initMessage = deepCopyJsonable(defaultInitMessage);
  if (fixupInitMessage) initMessage = fixupInitMessage(initMessage);
  initMessage?.type === SwingsetMessageType.AG_COSMOS_INIT ||
    Fail`initMessage must be AG_COSMOS_INIT`;
  if (initMessage.isBootstrap === undefined && !swingStore) {
    initMessage.isBootstrap = true;
  }
  const portNums = extractPortNums(initMessage);
  const knownPorts = new Map(
    Object.entries(portNums).map(([name, value]) => [value, name]),
  );

  if (!swingStore) swingStore = initSwingStore(); // in-memory
  const { hostStorage } = swingStore;

  const fakeAgcc = {
    /** @type {(destPort: unknown, msgJson: string) => string} */
    send: (destPort, msgJson) => {
      const portName =
        knownPorts.get(destPort) || Fail`unknown cosmos port ${destPort}`;
      const msg = JSON.parse(msgJson);
      const result = receiveBridgeSend(portName, msg);
      return JSON.stringify(result);
    },
  };
  const actionQueueStorage = makeQueueStorage(
    msg => fakeAgcc.send(portNums.storage, msg),
    STORAGE_PATH.ACTION_QUEUE,
  );
  const highPriorityQueueStorage = makeQueueStorage(
    msg => fakeAgcc.send(portNums.storage, msg),
    STORAGE_PATH.HIGH_PRIORITY_QUEUE,
  );

  const [dbDir, cleanupDB] = tmpDir(debugName || 'testdb');
  const launchChain = makeLaunchChain(fakeAgcc, dbDir, {
    env,
    fs,
    path: nativePath,
    tmp,
    testingOverrides: {
      debugName,
      slogSender,
      swingStore,
      vatconfig: config,
      withInternals: true,
    },
  });
  const launchResult = await launchChain({
    ...initMessage,
    resolvedConfig: swingsetConfig,
  });
  const {
    blockingSend,
    shutdown: shutdownKernel,
    internals,
  } = /** @type {EReturn<import('../src/launch-chain.js').launchAndShareInternals>} */ (
    launchResult
  );
  /** @type {(options?: { kernelOnly?: boolean }) => Promise<void>} */
  const shutdown = async ({ kernelOnly = false } = {}) => {
    await shutdownKernel();
    if (kernelOnly) return;
    await hostStorage.close();
    await cleanupDB();
  };
  const { controller, bridgeInbound, timer } = internals;
  const { queueAndRun, EV } = makeRunUtils(controller);

  // Remember information about the current block, starting with the init
  // message.
  let {
    isBootstrap: needsBootstrap,
    blockHeight: lastBlockHeight,
    blockTime: lastBlockTime,
    params: lastBlockParams,
  } = initMessage;
  let lastBlockWalltime = Date.now();
  await blockingSend(initMessage);

  /**
   * @returns {BlockInfo}
   */
  const getLastBlockInfo = () => ({
    blockHeight: lastBlockHeight,
    blockTime: lastBlockTime,
    params: lastBlockParams,
  });

  // Advance block time at a nominal rate of one second per real millisecond,
  // but introduce discontinuities as necessary to maintain monotonicity.
  const nextBlockTime = () => {
    const delta = Math.floor(Date.now() - lastBlockWalltime);
    return lastBlockTime + (delta > 0 ? delta : 1);
  };

  let blockTxCount = 0;

  /**
   * @param {Partial<BlockInfo>} [blockInfo]
   */
  const runNextBlock = async ({
    blockHeight = needsBootstrap ? lastBlockHeight : lastBlockHeight + 1,
    blockTime = needsBootstrap ? lastBlockTime : nextBlockTime(),
    params = lastBlockParams,
  } = {}) => {
    needsBootstrap ||
      blockHeight > lastBlockHeight ||
      Fail`blockHeight ${blockHeight} must be greater than ${lastBlockHeight}`;
    needsBootstrap ||
      blockTime > lastBlockTime ||
      Fail`blockTime ${blockTime} must be greater than ${lastBlockTime}`;
    needsBootstrap = false;
    lastBlockWalltime = Date.now();
    lastBlockHeight = blockHeight;
    lastBlockTime = blockTime;
    lastBlockParams = params;
    blockTxCount = 0;
    const context = { blockHeight, blockTime };
    await blockingSend({
      type: SwingsetMessageType.BEGIN_BLOCK,
      ...context,
      params,
    });
    await blockingSend({ type: SwingsetMessageType.END_BLOCK, ...context });
    await blockingSend({ type: SwingsetMessageType.COMMIT_BLOCK, ...context });
    await blockingSend({
      type: SwingsetMessageType.AFTER_COMMIT_BLOCK,
      ...context,
    });
    return getLastBlockInfo();
  };

  /** @type {InboundQueue} */
  const actionQueue = makeQueue(actionQueueStorage);
  /** @type {InboundQueue} */
  const highPriorityQueue = makeQueue(highPriorityQueueStorage);
  /**
   * @param {{ type: QueuedActionType } & Record<string, unknown>} action
   * @param {InboundQueue} [queue]
   */
  const pushQueueRecord = (action, queue = actionQueue) => {
    blockTxCount += 1;
    queue.push({
      action,
      context: {
        blockHeight: lastBlockHeight + 1,
        txHash: blockTxCount,
        msgIdx: '',
      },
    });
  };
  /**
   * @param {string} fnText must evaluate to a function that will be invoked in
   *   a core eval compartment with a "powers" argument as attenuated by
   *   `jsonPermits` (with no attenuation by default).
   * @param {string} [jsonPermits] must deserialize into a BootstrapManifestPermit
   * @param {InboundQueue} [queue]
   */
  const pushCoreEval = (
    fnText,
    jsonPermits = 'true',
    queue = highPriorityQueue,
  ) => {
    // Fail noisily if fnText does not evaluate to a function.
    // This must be refactored if there is ever a need for such input.
    const fn = new Compartment().evaluate(fnText);
    typeof fn === 'function' || Fail`text must evaluate to a function`;
    /** @type {import('@agoric/vats/src/core/lib-boot.js').BootstrapManifestPermit} */
    // eslint-disable-next-line no-unused-vars
    const permit = JSON.parse(jsonPermits);
    /** @type {import('@agoric/cosmic-proto/swingset/swingset.js').CoreEvalSDKType} */
    const coreEvalDesc = {
      json_permits: jsonPermits,
      js_code: fnText,
    };
    const action = {
      type: QueuedActionType.CORE_EVAL,
      evals: [coreEvalDesc],
    };
    pushQueueRecord(action, queue);
  };

  return {
    // SwingSet-oriented references.
    actionQueue,
    highPriorityQueue,
    shutdown,
    swingStore,

    // Controller-oriented helpers.
    controller,
    bridgeInbound,
    timer,
    queueAndRun,
    EV,

    // Functions specific to this kit.
    getLastBlockInfo,
    pushQueueRecord,
    pushCoreEval,
    runNextBlock,
  };
};
