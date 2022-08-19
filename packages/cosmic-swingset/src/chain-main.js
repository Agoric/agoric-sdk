import path from 'path';
import v8 from 'node:v8';
import process from 'node:process';
import fs from 'node:fs';
import { performance } from 'perf_hooks';
import { resolve as importMetaResolve } from 'import-meta-resolve';
import engineGC from '@agoric/swingset-vat/src/lib-nodejs/engine-gc.js';
import { waitUntilQuiescent } from '@agoric/swingset-vat/src/lib-nodejs/waitUntilQuiescent.js';
import {
  importMailbox,
  exportMailbox,
} from '@agoric/swingset-vat/src/devices/mailbox/mailbox.js';
import { makeBufferedStorage } from '@agoric/swingset-vat/src/lib/storageAPI.js';

import { assert, details as X } from '@agoric/assert';
import { makeSlogSenderFromModule } from '@agoric/telemetry';

import * as STORAGE_PATH from '@agoric/vats/src/chain-storage-paths.js';
import stringify from './json-stable-stringify.js';
import { launch } from './launch-chain.js';
import makeBlockManager from './block-manager.js';
import { getTelemetryProviders } from './kernel-stats.js';

// eslint-disable-next-line no-unused-vars
let whenHellFreezesOver = null;

const AG_COSMOS_INIT = 'AG_COSMOS_INIT';

const TELEMETRY_SERVICE_NAME = 'agd-cosmos';

const toNumber = specimen => {
  const number = parseInt(specimen, 10);
  assert(
    String(number) === String(specimen),
    X`Could not parse ${JSON.stringify(specimen)} as a number`,
  );
  return number;
};

const makeChainStorage = (call, prefix = '', options = {}) => {
  assert(
    prefix === '' || prefix.endsWith('.'),
    X`prefix ${prefix} must end with a dot`,
  );

  const { fromChainShape, toChainShape } = options;

  // In addition to the wrapping write buffer, keep a simple cache of
  // read values for has and get.
  let cache;
  function resetCache() {
    cache = new Map();
  }
  resetCache();
  const storage = {
    has(key) {
      return storage.get(key) !== undefined;
    },
    get(key) {
      if (cache.has(key)) return cache.get(key);

      // Fetch the value and cache it until the next commit or abort.
      const retStr = call(stringify({ method: 'get', key: `${prefix}${key}` }));
      const ret = JSON.parse(retStr);
      const chainShapeValue = ret ? JSON.parse(ret) : undefined;
      const value =
        chainShapeValue === undefined || !fromChainShape
          ? chainShapeValue
          : fromChainShape(chainShapeValue);
      cache.set(key, value);
      return value;
    },
    set(key, value) {
      // Set the value and cache it until the next commit or abort (which is
      // expected immediately, since the buffered wrapper only calls set
      // *during* a commit).
      cache.set(key, value);
      const chainShapeValue =
        value === undefined || !toChainShape ? value : toChainShape(value);
      const valueStr = value === undefined ? '' : stringify(chainShapeValue);
      call(
        stringify({
          method: 'set',
          key: `${prefix}${key}`,
          value: valueStr,
        }),
      );
    },
    delete(key) {
      // Deletion in chain storage manifests as set-to-undefined.
      storage.set(key, undefined);
    },
    // eslint-disable-next-line require-yield
    *getKeys(_start, _end) {
      throw new Error('not implemented');
    },
  };
  const {
    kvStore: buffered,
    commit,
    abort,
  } = makeBufferedStorage(storage, {
    // Enqueue a write of any retrieved value, to handle callers like mailbox.js
    // that expect local mutations to be automatically written back.
    onGet(key, value) {
      buffered.set(key, value);
    },

    // Reset the read cache upon commit or abort.
    onCommit: resetCache,
    onAbort: resetCache,
  });
  return { ...buffered, commit, abort };
};

/**
 * Create a queue backed by chain storage.
 *
 * The queue uses the following storage layout, prefixed by `prefix`, such as
 * `actionQueue.`:
 * - `<prefix>head`: the index of the first entry of the queue.
 * - `<prefix>tail`: the index *past* the last entry in the queue.
 * - `<prefix><index>`: the contents of the queue at the given index.
 *
 * For the `actionQueue`, the Cosmos side of the queue will push into the queue,
 * updating `<prefix>tail` and `<prefix><index>`.  The JS side will shift the
 * queue, updating `<prefix>head` and reading and deleting `<prefix><index>`.
 *
 * Parallel access is not supported, only a single outstanding operation at a
 * time.
 *
 * @param {(obj: any) => any} call send a message to the chain's storage API and
 * receive a reply
 * @param {string} [prefix] string to prepend to the queue's storage keys
 */
const makeChainQueue = (call, prefix = '') => {
  const storage = makeChainStorage(call, prefix);
  /** @type {IterableIterator<unknown> | null} */
  let currentIterator = null;
  const queue = {
    push: obj => {
      const tail = BigInt(storage.get('tail') || 0);
      storage.set(`${tail}`, obj);
      storage.set('tail', tail + 1n);
      storage.commit();
    },
    getDepth: () => {
      const head = BigInt(storage.get('head') || 0);
      const tail = BigInt(storage.get('tail') || 0);
      return Number(tail - head);
    },
    /** @returns {IterableIterator<unknown>} */
    consumeAll: () => {
      let done = false;
      let head = BigInt(storage.get('head') || 0);
      let tail = 0;
      const iterator = {
        [Symbol.iterator]: () => iterator,
        next: () => {
          assert.equal(iterator, currentIterator);
          if (done) return { done };
          if (tail <= head) {
            // Check if new elements have been added since iteration started
            tail = BigInt(storage.get('tail') || 0);
          }
          if (head < tail) {
            // Still within the queue.
            const headKey = `${head}`;
            const value = storage.get(headKey);
            storage.delete(headKey);
            head += 1n;
            return { value, done };
          }
          // Reached the end, so clean up our indices.
          storage.delete('head');
          storage.delete('tail');
          storage.commit();
          done = true;
          return { done };
        },
        return: () => {
          assert.equal(iterator, currentIterator);
          if (done) return { done };
          // We're done consuming, so save our state.
          storage.set('head', head);
          storage.commit();
          done = true;
          return { done };
        },
        throw: err => {
          assert.equal(iterator, currentIterator);
          if (done) return { done };
          // Don't change our state.
          storage.abort();
          done = true;
          throw err;
        },
      };
      currentIterator = iterator;
      return iterator;
    },
  };
  return queue;
};

export default async function main(progname, args, { env, homedir, agcc }) {
  const portNums = {};

  // TODO: use the 'basedir' pattern

  // Try to determine the cosmos chain home.
  function getFlagValue(flagName, deflt) {
    let flagValue = deflt;
    const envValue =
      env[`AG_CHAIN_COSMOS_${flagName.toUpperCase().replace(/-/g, '_')}`];
    if (envValue !== undefined) {
      flagValue = envValue;
    }
    const flag = `--${flagName}`;
    const flagEquals = `--${flagName}=`;
    for (let i = 0; i < args.length; i += 1) {
      const arg = args[i];
      if (arg === flag) {
        i += 1;
        flagValue = args[i];
      } else if (arg.startsWith(flagEquals)) {
        flagValue = arg.substr(flagEquals.length);
      }
    }
    return flagValue;
  }

  // We try to find the actual cosmos state directory (default=~/.ag-chain-cosmos), which
  // is better than scribbling into the current directory.
  const cosmosHome = getFlagValue('home', `${homedir}/.ag-chain-cosmos`);
  const stateDBDir = `${cosmosHome}/data/ag-cosmos-chain-state`;

  // console.log('Have AG_COSMOS', agcc);

  const portHandlers = {};
  let lastPort = 0;
  function registerPortHandler(portHandler) {
    lastPort += 1;
    const port = lastPort;
    portHandlers[port] = async (...phArgs) => {
      try {
        return await portHandler(...phArgs);
      } catch (e) {
        console.error('portHandler threw', e);
        throw e;
      }
    };
    return port;
  }

  function fromGo(port, str, replier) {
    // console.error(`inbound ${port} ${str}`);
    const handler = portHandlers[port];
    if (!handler) {
      replier.reject(`invalid requested port ${port}`);
      return;
    }
    const action = JSON.parse(str);
    const p = Promise.resolve(handler(action));
    p.then(
      res => {
        // console.error(`Replying in Node to ${str} with`, res);
        replier.resolve(`${res}`);
      },
      rej => {
        // console.error(`Rejecting in Node to ${str} with`, rej);
        replier.reject(`${(rej && rej.stack) || rej}`);
      },
    );
  }

  // Actually run the main ag-chain-cosmos program.  Before we start the daemon,
  // there will be a call to nodePort/AG_COSMOS_INIT, otherwise exit.
  // eslint-disable-next-line no-use-before-define
  const nodePort = registerPortHandler(toSwingSet);

  // Need to keep the process alive until Go exits.
  whenHellFreezesOver = new Promise(() => {});
  agcc.runAgCosmosDaemon(nodePort, fromGo, [progname, ...args]);

  let savedChainSends = [];

  // Send a chain downcall, recording what we sent and received.
  function chainSend(...sendArgs) {
    const ret = agcc.send(...sendArgs);
    savedChainSends.push([sendArgs, ret]);
    return ret;
  }

  const clearChainSends = () => {
    const chainSends = savedChainSends;
    savedChainSends = [];
    return chainSends;
  };

  // Replay and clear the chain send queue.
  // While replaying each send, insist it has the same return result.
  function replayChainSends() {
    // Remove our queue.
    const chainSends = [...savedChainSends];

    // Just send all the things we saved.
    while (chainSends.length > 0) {
      const [sendArgs, expectedRet] = chainSends.shift();
      const actualRet = agcc.send(...sendArgs);

      // Enforce that we got back what we expected.
      if (actualRet !== expectedRet) {
        throw Error(
          `fatal: replaying chain send ${JSON.stringify(
            sendArgs,
          )} resulted in ${JSON.stringify(actualRet)}; expected ${expectedRet}`,
        );
      }
    }
  }

  // this storagePort changes for every single message. We define it out here
  // so the 'externalStorage' object can close over the single mutable
  // instance, and we update the 'portNums.storage' value each time toSwingSet is called
  async function launchAndInitializeSwingSet(bootMsg) {
    // this object is used to store the mailbox state.
    const mailboxStorage = makeChainStorage(
      msg => chainSend(portNums.storage, msg),
      `${STORAGE_PATH.MAILBOX}.`,
      {
        fromChainShape: data => {
          const ack = toNumber(data.ack);
          const outbox = data.outbox.map(([seq, msg]) => [toNumber(seq), msg]);
          return importMailbox({ outbox, ack });
        },
        toChainShape: exportMailbox,
      },
    );
    const actionQueue = makeChainQueue(
      msg => chainSend(portNums.storage, msg),
      `${STORAGE_PATH.ACTION_QUEUE}.`,
    );
    function setActivityhash(activityhash) {
      const msg = stringify({
        method: 'set',
        key: STORAGE_PATH.ACTIVITYHASH,
        value: activityhash,
      });
      chainSend(portNums.storage, msg);
    }
    function doOutboundBridge(dstID, msg) {
      const portNum = portNums[dstID];
      if (portNum === undefined) {
        console.error(
          `warning: doOutboundBridge called before AG_COSMOS_INIT gave us ${dstID}`,
        );
        // it is dark, and your exception is likely to be eaten by a vat
        throw Error(
          `warning: doOutboundBridge called before AG_COSMOS_INIT gave us ${dstID}`,
        );
      }
      const respStr = chainSend(portNum, stringify(msg));
      try {
        return JSON.parse(respStr);
      } catch (e) {
        assert.fail(X`cannot JSON.parse(${JSON.stringify(respStr)}): ${e}`);
      }
    }

    const argv = {
      ROLE: 'chain',
      bootMsg,
    };
    const vatconfig = new URL(
      await importMetaResolve(
        env.CHAIN_BOOTSTRAP_VAT_CONFIG ||
          argv.bootMsg.params.bootstrap_vat_config,
        import.meta.url,
      ),
    ).pathname;

    const { metricsProvider } = getTelemetryProviders({
      console,
      env,
      serviceName: TELEMETRY_SERVICE_NAME,
    });

    const {
      SLOGFILE,
      SLOGSENDER,
      LMDB_MAP_SIZE,
      SWING_STORE_TRACE,
      XSNAP_KEEP_SNAPSHOTS,
      NODE_HEAP_SNAPSHOTS = -1,
    } = env;
    const slogSender = await makeSlogSenderFromModule(SLOGSENDER, {
      stateDir: stateDBDir,
      env,
      serviceName: TELEMETRY_SERVICE_NAME,
    });

    const mapSize = (LMDB_MAP_SIZE && parseInt(LMDB_MAP_SIZE, 10)) || undefined;

    const defaultTraceFile = path.resolve(stateDBDir, 'store-trace.log');
    let swingStoreTraceFile;
    switch (SWING_STORE_TRACE) {
      case '0':
      case 'false':
        break;
      case '1':
      case 'true':
        swingStoreTraceFile = defaultTraceFile;
        break;
      default:
        if (SWING_STORE_TRACE) {
          swingStoreTraceFile = path.resolve(SWING_STORE_TRACE);
        } else if (getFlagValue('trace-store')) {
          swingStoreTraceFile = defaultTraceFile;
        }
    }

    const keepSnapshots =
      XSNAP_KEEP_SNAPSHOTS === '1' || XSNAP_KEEP_SNAPSHOTS === 'true';

    const nodeHeapSnapshots = Number.parseInt(NODE_HEAP_SNAPSHOTS, 10);

    let lastCommitTime = 0;
    let commitCallsSinceLastSnapshot = NaN;
    const snapshotBaseDir = path.resolve(stateDBDir, 'node-heap-snapshots');

    if (nodeHeapSnapshots >= 0) {
      fs.mkdirSync(snapshotBaseDir, { recursive: true });
    }

    const afterCommitCallback = async () => {
      // delay until all current promise reactions are drained so we can be sure
      // that the commit-block reply has been sent to agcc through replier.resolve
      await waitUntilQuiescent();

      let heapSnapshot;
      let heapSnapshotTime;

      const t0 = performance.now();
      engineGC();
      const t1 = performance.now();
      const memoryUsage = process.memoryUsage();
      const t2 = performance.now();
      const heapStats = v8.getHeapStatistics();
      const t3 = performance.now();

      commitCallsSinceLastSnapshot += 1;
      if (
        (nodeHeapSnapshots >= 0 && t0 - lastCommitTime > 30 * 1000) ||
        (nodeHeapSnapshots > 0 &&
          !(nodeHeapSnapshots > commitCallsSinceLastSnapshot))
      ) {
        commitCallsSinceLastSnapshot = 0;
        heapSnapshot = `Heap-${process.pid}-${Date.now()}.heapsnapshot`;
        const snapshotPath = path.resolve(snapshotBaseDir, heapSnapshot);
        v8.writeHeapSnapshot(snapshotPath);
        heapSnapshotTime = performance.now() - t3;
      }
      lastCommitTime = t0;

      return {
        memoryUsage,
        heapStats,
        heapSnapshot,
        statsTime: {
          forcedGc: t1 - t0,
          memoryUsage: t2 - t1,
          heapStats: t3 - t2,
          heapSnapshot: heapSnapshotTime,
        },
      };
    };

    const s = await launch({
      actionQueue,
      kernelStateDBDir: stateDBDir,
      mailboxStorage,
      clearChainSends,
      setActivityhash,
      bridgeOutbound: doOutboundBridge,
      vatconfig,
      argv,
      env,
      metricsProvider,
      slogFile: SLOGFILE,
      slogSender,
      mapSize,
      swingStoreTraceFile,
      keepSnapshots,
      afterCommitCallback,
    });
    return s;
  }

  let blockingSend;
  async function toSwingSet(action, _replier) {
    // console.log(`toSwingSet`, action);
    if (action.vibcPort) {
      portNums.dibc = action.vibcPort;
    }

    if (action.storagePort) {
      // Initialize the storage for this particular transaction.
      // console.log(` setting portNums.storage to`, action.storagePort);
      portNums.storage = action.storagePort;
    }

    if (action.vbankPort) {
      portNums.bank = action.vbankPort;
    }

    if (action.lienPort) {
      portNums.lien = action.lienPort;
    }

    if (!blockingSend) {
      const { savedChainSends: scs, ...fns } =
        await launchAndInitializeSwingSet(action);
      savedChainSends = scs;
      blockingSend = makeBlockManager({
        ...fns,
        replayChainSends,
        verboseBlocks: true,
      });
    }

    if (action.type === AG_COSMOS_INIT) {
      // console.error('got AG_COSMOS_INIT', action);
      return true;
    }

    return blockingSend(action);
  }
}
