/* eslint-env node */

import * as fsPromises from 'node:fs/promises';
import * as pathNamespace from 'node:path';
import { assert, Fail } from '@endo/errors';
import * as ActionType from '@agoric/internal/src/action-types.js';
import { makeBootMsg } from '@agoric/internal/src/chain-utils.js';
import { initSwingStore } from '@agoric/swing-store';
import { makeSlogSender } from '@agoric/telemetry';
import { launch } from '../src/launch-chain.js';
import { DEFAULT_SIM_SWINGSET_PARAMS } from '../src/sim-params.js';
import { makeBufferedStorage } from '../src/helpers/bufferedStorage.js';
import { makeQueue, makeQueueStorageMock } from '../src/helpers/make-queue.js';

/** @import { BlockInfo, BootMsg } from '@agoric/internal/src/chain-utils.js' */
/** @import { SwingSetConfig } from '@agoric/swingset-vat' */

/**
 * @template T
 * @typedef {(input: T) => T} Replacer
 */

/** @type {Replacer<object>} */
const clone = obj => JSON.parse(JSON.stringify(obj));

// TODO: Replace compareByCodePoints and makeKVStoreFromMap with imports when
// available.
// https://github.com/Agoric/agoric-sdk/pull/10299

const compareByCodePoints = (left, right) => {
  const leftIter = left[Symbol.iterator]();
  const rightIter = right[Symbol.iterator]();
  for (;;) {
    const { value: leftChar } = leftIter.next();
    const { value: rightChar } = rightIter.next();
    if (leftChar === undefined && rightChar === undefined) {
      return 0;
    } else if (leftChar === undefined) {
      // left is a prefix of right.
      return -1;
    } else if (rightChar === undefined) {
      // right is a prefix of left.
      return 1;
    }
    const leftCodepoint = /** @type {number} */ (leftChar.codePointAt(0));
    const rightCodepoint = /** @type {number} */ (rightChar.codePointAt(0));
    if (leftCodepoint < rightCodepoint) return -1;
    if (leftCodepoint > rightCodepoint) return 1;
  }
};

/**
 * @param {Map<string, string>} map
 */
const makeKVStoreFromMap = map => {
  let sortedKeys;
  let priorKeyReturned;
  let priorKeyIndex;

  const ensureSorted = () => {
    if (!sortedKeys) {
      sortedKeys = [...map.keys()];
      sortedKeys.sort(compareByCodePoints);
    }
  };

  const clearGetNextKeyCache = () => {
    priorKeyReturned = undefined;
    priorKeyIndex = -1;
  };
  clearGetNextKeyCache();

  const clearSorted = () => {
    sortedKeys = undefined;
    clearGetNextKeyCache();
  };

  /** @type {KVStore} */
  const fakeStore = harden({
    has: key => map.has(key),
    get: key => map.get(key),
    getNextKey: priorKey => {
      assert.typeof(priorKey, 'string');
      ensureSorted();
      const start =
        compareByCodePoints(priorKeyReturned, priorKey) <= 0
          ? priorKeyIndex + 1
          : 0;
      for (let i = start; i < sortedKeys.length; i += 1) {
        const key = sortedKeys[i];
        if (compareByCodePoints(key, priorKey) <= 0) continue;
        priorKeyReturned = key;
        priorKeyIndex = i;
        return key;
      }
      // reached end without finding the key, so clear our cache
      clearGetNextKeyCache();
      return undefined;
    },
    set: (key, value) => {
      if (!map.has(key)) clearSorted();
      map.set(key, value);
    },
    delete: key => {
      if (map.has(key)) clearSorted();
      map.delete(key);
    },
  });
  return fakeStore;
};

export const defaultBootMsg = harden(
  makeBootMsg({
    type: ActionType.AG_COSMOS_INIT,
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
  }),
);
export const defaultBootstrapMessage = harden({
  ...clone(defaultBootMsg),
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
 * generic 'relay' that exposes reflective methods for inspecting and
 * interacting with devices and other vats, and is also capable of handling
 * 'CORE_EVAL' requests containing a list of { json_permits, js_code } 'evals'
 * by evaluating the code in an environment constrained by the permits (and it
 * registers itself with the bridge vat as the recipient of such requests).
 *
 * @type {import('@agoric/swingset-vat').SwingSetConfig}
 */
const baseConfig = harden({
  defaultReapInterval: 'never',
  defaultManagerType: undefined,
  bootstrap: 'bootstrap',
  vats: {
    bootstrap: {
      sourceSpec: '@agoric/vats/tools/bootstrap-relay.js',
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
 * @param {import('@agoric/swingset-vat').ManagerType} [options.defaultManagerType]
 *   As documented at {@link ../../../docs/env.md#swingset_worker_type}, the
 *   implicit default of 'local' can be overridden by a SWINGSET_WORKER_TYPE
 *   environment variable.
 * @param {typeof process['env']} [options.env]
 * @param {Replacer<BootMsg>} [options.fixupBootMsg] a final opportunity to make
 *   any changes
 * @param {Replacer<SwingSetConfig>} [options.fixupConfig] a final opportunity
 *   to make any changes
 * @param {import('@agoric/telemetry').SlogSender} [options.slogSender]
 * @param {import('../src/chain-main.js').CosmosSwingsetConfig} [options.swingsetConfig]
 * @param {SwingSetConfig['vats']} [options.vats] extra static vat configuration
 * @param {string} [options.baseBootstrapManifest] see {@link ../../vats/tools/bootstrap-relay.js}
 * @param {string} [options.addBootstrapBehaviors] see {@link ../../vats/tools/bootstrap-relay.js}
 * @param {object} [powers]
 * @param {Pick<import('node:fs/promises'), 'mkdir'>} [powers.fsp]
 * @param {typeof (import('node:path')['resolve'])} [powers.resolvePath]
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
    fixupBootMsg,
    fixupConfig,
    slogSender,
    swingsetConfig = {},
    vats,

    // Options for vats (particularly the bootstrap-relay vat).
    baseBootstrapManifest,
    addBootstrapBehaviors,
  },
  { fsp = fsPromises, resolvePath = pathNamespace.resolve } = {},
) => {
  await null;
  /** @type {SwingSetConfig} */
  let config = {
    ...clone(baseConfig),
    ...configOverrides,
    defaultManagerType,
  };
  if (bundleDir) {
    bundleDir = resolvePath(bundleDir);
    config.bundleCachePath = bundleDir;
    await fsp.mkdir(bundleDir, { recursive: true });
  }
  config.bundles = { ...config.bundles, ...bundles };
  config.vats = { ...config.vats, ...vats };

  const bootstrapVatDesc = config.vats[config.bootstrap];
  const bootstrapVatParams = bootstrapVatDesc.parameters;
  if (baseBootstrapManifest) {
    bootstrapVatParams.baseManifest = baseBootstrapManifest;
  }
  if (addBootstrapBehaviors) {
    bootstrapVatParams.addBehaviors = addBootstrapBehaviors;
  }

  if (fixupConfig) config = fixupConfig(config);

  const swingStore = initSwingStore(); // in-memory
  const { hostStorage } = swingStore;

  const actionQueueStorage = makeQueueStorageMock().storage;
  const highPriorityQueueStorage = makeQueueStorageMock().storage;
  const mailboxStorage = makeBufferedStorage(makeKVStoreFromMap(new Map()));

  const savedChainSends = [];
  const clearChainSends = async () => savedChainSends.splice(0);
  const replayChainSends = (..._args) => {
    throw Error('not implemented');
  };

  let bootMsg = clone(defaultBootMsg);
  if (fixupBootMsg) bootMsg = fixupBootMsg(bootMsg);
  let {
    blockHeight: lastBlockHeight,
    blockTime: lastBlockTime,
    params: lastBlockParams,
  } = bootMsg;
  let lastBlockWalltime = Date.now();

  // Advance block time at a nominal rate of one second per real millisecond,
  // but introduce discontinuities as necessary to maintain monotonicity.
  const nextBlockTime = () => {
    const delta = Math.floor(Date.now() - lastBlockWalltime);
    return lastBlockTime + (delta > 0 ? delta : 1);
  };

  if (!slogSender && (env.SLOGFILE || env.SLOGSENDER)) {
    slogSender = await makeSlogSender({ env });
  }

  const { blockingSend, shutdown: shutdownKernel } = await launch({
    swingStore,
    actionQueueStorage,
    highPriorityQueueStorage,
    mailboxStorage,
    clearChainSends,
    replayChainSends,
    receiveBridgeSend,
    vatconfig: config,
    argv: { bootMsg },
    env,
    debugName,
    slogSender,
    swingsetConfig,
  });
  const shutdown = async () => {
    await Promise.all([shutdownKernel, hostStorage.close()]);
  };

  /**
   * @returns {BlockInfo}
   */
  const getLastBlockInfo = () => ({
    blockHeight: lastBlockHeight,
    blockTime: lastBlockTime,
    params: lastBlockParams,
  });

  let blockTxCount = 0;

  /**
   * @param {Partial<BlockInfo>} [blockInfo]
   */
  const runNextBlock = async ({
    blockHeight = lastBlockHeight + 1,
    blockTime = nextBlockTime(),
    params = lastBlockParams,
  } = {}) => {
    blockHeight > lastBlockHeight ||
      Fail`blockHeight ${blockHeight} must be greater than ${lastBlockHeight}`;
    blockTime > lastBlockTime ||
      Fail`blockTime ${blockTime} must be greater than ${lastBlockTime}`;
    lastBlockWalltime = Date.now();
    lastBlockHeight = blockHeight;
    lastBlockTime = blockTime;
    lastBlockParams = params;
    blockTxCount = 0;
    const context = { blockHeight, blockTime };
    await blockingSend({
      type: ActionType.BEGIN_BLOCK,
      ...context,
      params,
    });
    await blockingSend({ type: ActionType.END_BLOCK, ...context });
    await blockingSend({ type: ActionType.COMMIT_BLOCK, ...context });
    await blockingSend({ type: ActionType.AFTER_COMMIT_BLOCK, ...context });
    return getLastBlockInfo();
  };

  const makeQueueRecord = action => {
    blockTxCount += 1;
    return {
      action,
      context: {
        blockHeight: lastBlockHeight + 1,
        txHash: blockTxCount,
        msgIdx: '',
      },
    };
  };

  return {
    // SwingSet-oriented references.
    actionQueue: makeQueue(actionQueueStorage),
    highPriorityActionQueue: makeQueue(highPriorityQueueStorage),
    mailboxStorage,
    shutdown,
    swingStore,

    // Functions specific to this kit.
    getLastBlockInfo,
    makeQueueRecord,
    runNextBlock,
  };
};
