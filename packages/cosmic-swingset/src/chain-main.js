import { resolve as pathResolve } from 'path';
import v8 from 'node:v8';
import process from 'node:process';
import fs from 'node:fs';
import { performance } from 'perf_hooks';
import { resolve as importMetaResolve } from 'import-meta-resolve';
import { E } from '@endo/far';
import engineGC from '@agoric/swingset-vat/src/lib-nodejs/engine-gc.js';
import { waitUntilQuiescent } from '@agoric/swingset-vat/src/lib-nodejs/waitUntilQuiescent.js';
import {
  importMailbox,
  exportMailbox,
} from '@agoric/swingset-vat/src/devices/mailbox/mailbox.js';

import { Fail } from '@agoric/assert';
import { makeSlogSender, tryFlushSlogSender } from '@agoric/telemetry';

import { makeChainStorageRoot } from '@agoric/internal/src/lib-chainStorage.js';
import { makeMarshal } from '@endo/marshal';
import { makePublishKit, pipeTopicToStorage } from '@agoric/notifier';

import * as STORAGE_PATH from '@agoric/internal/src/chain-storage-paths.js';
import { BridgeId as BRIDGE_ID } from '@agoric/internal';
import { makeReadCachingStorage } from './bufferedStorage.js';
import stringify from './json-stable-stringify.js';
import { launch } from './launch-chain.js';
import { getTelemetryProviders } from './kernel-stats.js';
import { makeQueue } from './make-queue.js';

// eslint-disable-next-line no-unused-vars
let whenHellFreezesOver = null;

const AG_COSMOS_INIT = 'AG_COSMOS_INIT';

const TELEMETRY_SERVICE_NAME = 'agd-cosmos';

const toNumber = specimen => {
  const number = parseInt(specimen, 10);
  String(number) === String(specimen) ||
    Fail`Could not parse ${JSON.stringify(specimen)} as a number`;
  return number;
};

const makePrefixedBridgeStorage = (
  call,
  prefix,
  setterMethod,
  fromBridgeValue = x => x,
  toBridgeValue = x => x,
) => {
  prefix.endsWith('.') || Fail`prefix ${prefix} must end with a dot`;

  return harden({
    get: key => {
      const retStr = call(
        stringify({ method: 'get', args: [`${prefix}${key}`] }),
      );
      const ret = JSON.parse(retStr);
      if (ret == null) {
        return undefined;
      }
      const bridgeValue = JSON.parse(ret);
      return fromBridgeValue(bridgeValue);
    },
    set: (key, value) => {
      const path = `${prefix}${key}`;
      const entry =
        value == null ? [path] : [path, stringify(toBridgeValue(value))];
      call(
        stringify({
          method: setterMethod,
          args: [entry],
        }),
      );
    },
  });
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

  /**
   * @param {object} options
   * @param {string} [options.envName]
   * @param {string} [options.flagName]
   * @param {string} options.trueValue
   * @returns {string | undefined}
   */
  function getPathFromEnv({ envName, flagName, trueValue }) {
    let option;
    if (envName) {
      option = env[envName];
    } else if (flagName) {
      option = getFlagValue(flagName);
    } else {
      return undefined;
    }

    switch (option) {
      case '0':
      case 'false':
      case false:
        return undefined;
      case '1':
      case 'true':
      case true:
        return trueValue;
      default:
        if (option) {
          return pathResolve(option);
        } else if (envName && flagName) {
          return getPathFromEnv({ flagName, trueValue });
        } else {
          return undefined;
        }
    }
  }

  // We try to find the actual cosmos state directory (default=~/.ag-chain-cosmos), which
  // is better than scribbling into the current directory.
  const cosmosHome = getFlagValue('home', `${homedir}/.ag-chain-cosmos`);
  const stateDBDir = `${cosmosHome}/data/ag-cosmos-chain-state`;
  fs.mkdirSync(stateDBDir, { recursive: true });

  // console.log('Have AG_COSMOS', agcc);

  const portHandlers = {};
  let lastPort = 0;
  function registerPortHandler(portHandler) {
    lastPort += 1;
    const port = lastPort;
    portHandlers[port] = async (...phArgs) =>
      E.resolve(portHandler(...phArgs)).catch(e => {
        console.error('portHandler threw', e);
        throw e;
      });
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
    E.when(
      p,
      res => {
        // console.error(`Replying in Node to ${str} with`, res);
        replier.resolve(stringify(res !== undefined ? res : null));
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
    const sendToChain = msg => chainSend(portNums.storage, msg);
    // this object is used to store the mailbox state.
    const fromBridgeMailbox = data => {
      const ack = toNumber(data.ack);
      const outbox = data.outbox.map(([seq, msg]) => [toNumber(seq), msg]);
      return importMailbox({ outbox, ack });
    };
    const mailboxStorage = makeReadCachingStorage(
      makePrefixedBridgeStorage(
        sendToChain,
        `${STORAGE_PATH.MAILBOX}.`,
        'legacySet',
        fromBridgeMailbox,
        exportMailbox,
      ),
    );
    const actionQueue = makeQueue(
      makeReadCachingStorage(
        makePrefixedBridgeStorage(
          sendToChain,
          `${STORAGE_PATH.ACTION_QUEUE}.`,
          'setWithoutNotify',
        ),
      ),
    );
    function setActivityhash(activityhash) {
      const entry = [STORAGE_PATH.ACTIVITYHASH, activityhash];
      const msg = stringify({
        method: 'set',
        args: [entry],
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
        throw Fail`cannot JSON.parse(${JSON.stringify(respStr)}): ${e}`;
      }
    }

    const toStorage = message => {
      return doOutboundBridge(BRIDGE_ID.STORAGE, message);
    };

    const makeInstallationPublisher = () => {
      const installationStorageNode = makeChainStorageRoot(
        toStorage,
        STORAGE_PATH.BUNDLES,
        { sequence: true },
      );
      const marshaller = makeMarshal();
      const { publisher, subscriber } = makePublishKit();
      pipeTopicToStorage(subscriber, installationStorageNode, marshaller);
      return publisher;
    };

    const argv = {
      ROLE: 'chain',
      bootMsg,
    };
    const vatHref = await importMetaResolve(
      env.CHAIN_BOOTSTRAP_VAT_CONFIG ||
        argv.bootMsg.params.bootstrap_vat_config,
      import.meta.url,
    );
    const vatconfig = new URL(vatHref).pathname;

    const { metricsProvider } = getTelemetryProviders({
      console,
      env,
      serviceName: TELEMETRY_SERVICE_NAME,
    });

    const { XSNAP_KEEP_SNAPSHOTS, NODE_HEAP_SNAPSHOTS = -1 } = env;
    const slogSender = await makeSlogSender({
      stateDir: stateDBDir,
      env,
      serviceName: TELEMETRY_SERVICE_NAME,
    });

    const swingStoreTraceFile = getPathFromEnv({
      envName: 'SWING_STORE_TRACE',
      flagName: 'trace-store',
      trueValue: pathResolve(stateDBDir, 'store-trace.log'),
    });

    const keepSnapshots =
      XSNAP_KEEP_SNAPSHOTS === '1' || XSNAP_KEEP_SNAPSHOTS === 'true';

    const nodeHeapSnapshots = Number.parseInt(NODE_HEAP_SNAPSHOTS, 10);

    let lastCommitTime = 0;
    let commitCallsSinceLastSnapshot = NaN;
    const snapshotBaseDir = pathResolve(stateDBDir, 'node-heap-snapshots');

    if (nodeHeapSnapshots >= 0) {
      fs.mkdirSync(snapshotBaseDir, { recursive: true });
    }

    const afterCommitCallback = async () => {
      const slogSenderFlushed = tryFlushSlogSender(slogSender, {
        env,
        log: console.warn,
      });

      // delay until all current promise reactions are drained so we can be sure
      // that the commit-block reply has been sent to agcc through replier.resolve
      await Promise.all([slogSenderFlushed, waitUntilQuiescent()]);

      try {
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
          const snapshotPath = pathResolve(snapshotBaseDir, heapSnapshot);
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
      } catch (err) {
        console.warn('Failed to gather memory stats', err);
        return {};
      }
    };

    const s = await launch({
      actionQueue,
      kernelStateDBDir: stateDBDir,
      makeInstallationPublisher,
      mailboxStorage,
      clearChainSends,
      replayChainSends,
      setActivityhash,
      bridgeOutbound: doOutboundBridge,
      vatconfig,
      argv,
      env,
      verboseBlocks: true,
      metricsProvider,
      slogSender,
      swingStoreTraceFile,
      keepSnapshots,
      afterCommitCallback,
    });

    savedChainSends = s.savedChainSends;

    return s.blockingSend;
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

    // Ensure that initialization has completed.
    blockingSend = await (blockingSend || launchAndInitializeSwingSet(action));

    if (action.type === AG_COSMOS_INIT) {
      // console.error('got AG_COSMOS_INIT', action);
      return true;
    }

    return blockingSend(action);
  }
}
