// @ts-check

/* global WeakRef FinalizationRegistry */
/* eslint-disable no-constant-condition */
import fs from 'fs';
// import '@endo/init';
import '@agoric/internal/src/install-ses-debug.js';
import { Fail, q } from '@endo/errors';
// SL import readline from 'readline';
import sqlite3 from 'better-sqlite3';
import process from 'process';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import { createHash } from 'crypto';
import { pipeline } from 'stream';
import { performance } from 'perf_hooks';
// eslint-disable-next-line import/no-extraneous-dependencies
import { file as tmpFile, tmpName } from 'tmp';
// eslint-disable-next-line import/no-extraneous-dependencies
import yargsParser from 'yargs-parser';
import { makeMeasureSeconds } from '@agoric/internal';
import { makeSnapStore } from '../../swing-store/src/snapStore.js';
import { makeTranscriptStore } from '../../swing-store/src/transcriptStore.js';
import { makeBundleStore } from '../../swing-store/src/bundleStore.js';
import { waitUntilQuiescent } from '@agoric/internal/src/lib-nodejs/waitUntilQuiescent.js';
import { makeStartXSnap } from '../src/controller/startXSnap.js';
import {
  makeWorkerBundleHandler,
  makeXsnapBundleData,
} from '../src/controller/bundle-handler.js';
import { makeXsSubprocessFactory } from '../src/kernel/vat-loader/manager-subprocess-xsnap.js';
// import { requireIdentical } from '../src/kernel/vat-loader/transcript.js';
import { makeDummyMeterControl } from '../src/kernel/dummyMeterControl.js';
import { makeGcAndFinalize } from '@agoric/internal/src/lib-nodejs/gc-and-finalize.js';
import engineGC from '@agoric/internal/src/lib-nodejs/engine-gc.js';
import { makeSyscallSimulator } from '../src/kernel/vat-warehouse.js';

const pipe = promisify(pipeline);

export const optionsDefault = {
  absoluteSdkPath: '',
  startXsnapWorkerPath: '',
  loadXsnapWorkerPath: '',
  rebuildBundles: false,
  ignoreSnapshotHashDifference: true,
  ignoreConcurrentWorkerDivergences: true,
  forcedSnapshotInitial: null,
  forcedSnapshotInterval: null,
  forcedReloadFromSnapshot: true,
  keepAllSnapshots: false,
  keepNoSnapshots: false,
  keepWorkerInitial: 0,
  keepWorkerRecent: 10,
  keepWorkerInterval: 10,
  keepWorkerExplicitLoad: true,
  keepWorkerHashDifference: true,
  keepWorkerTransactionNums: [],
  skipExtraVcSyscalls: true,
  simulateVcSyscalls: true,
  synchronizeSyscalls: false,
  useCustomSnapStore: false,
  recordXsnapTrace: false,
  useXsnapDebug: false,
  // SL
  swingStoreDb: null,
  transcriptStoreDb: null,
  bundleStoreDb: null,
  snapStoreRDb: null,
  snapSaveDir: null,
  startPos: null,
  vatID: null,
};

// TODO: switch to full yargs for documenting output
const argv = yargsParser(process.argv.slice(2), {
  string: [
    // Set the absolute path of the SDK to use for bundling
    // This can help if there are symlinks in the path that should be respected
    // to match the path of the SDK that produced the initial transcript
    // For e.g. set to '/src' if replaying a docker based loadgen transcript
    'absoluteSdkPath',

    // Overrides the xsnap-worker binary to use when creating a new vat, or
    // when loading a snapshot. By default the binary used is the one bundled
    // with the agoric-sdk for both. The path is first resolved relative to the
    // replay tool, and if that fails, falls-back relative to the cwd.
    'startXsnapWorkerPath',
    'loadXsnapWorkerPath',
  ],

  boolean: [
    // Rebuild the bundles when starting the replay.
    // Disable if bundles were previously extracted form a Kernel DB, or to
    // save a few seconds and rely upon previously built versions instead.
    'rebuildBundles',

    // Enable to continue if snapshot hash doesn't match hash in transcript's
    // 'save', or when the hash of the concurrent workers snapshots don't all
    // match each other.
    'ignoreSnapshotHashDifference',

    // Enable to continue if concurrent workers do not produce the exact same
    // set of syscalls for a delivery. With special virtual collection syscall
    // handling (see below), all workers would normally have to diverge from
    // the transcript in the same way for the delivery to be considered valid.
    'ignoreConcurrentWorkerDivergences',

    // If a snapshot of a worker is taken, create a new worker from that
    // snapshot, even if no explicit snapshot load instruction is found in the
    // input transcript.
    'forcedReloadFromSnapshot',

    // Keep all snapshots generated during the test. By default only divergent
    // snapshots are kept. Not implemented is using custom snapStore
    // Mutually exclusive with `keepNoSnapshots`
    'keepAllSnapshots',

    // Keep no snapshots generated during the test. By default only divergent
    // snapshots are kept. Not implemented is using custom snapStore
    // Mutually exclusive with `keepAllSnapshots`
    'keepNoSnapshots',

    // Mark workers loaded from an explicit transcript load instruction as
    // being ineligible from being reaped.
    'keepWorkerExplicitLoad',

    // When `forcedReloadFromSnapshot` is enabled, if the hash of the/ snapshot
    // had differences (see `ignoreSnapshotHashDifference`), mark the worker(s)
    // created for this/these snapshot(s) as being ineligible from being reaped.
    'keepWorkerHashDifference',

    // Ignore Virtual Collection metadata syscalls that were recorded in the
    // transcript but which are not performed by the worker.
    'skipExtraVcSyscalls',

    // Simulate Virtual Collection metadata syscalls which were not recorded in
    // the transcript but which are performed by the worker. This only works if
    // previous syscalls for the same metadata were recorded.
    'simulateVcSyscalls',

    // Deliver all syscall responses in lockstep between concurrent workers.
    // When this option is disabled, concurrent workers are only synchronized
    // at delivery boundaries.
    'synchronizeSyscalls',

    // Use a simplified snapstore which derives the snapshot filename from the
    // transcript and doesn't compress the snapshot
    'useCustomSnapStore',

    // Enable to output xsnap debug traces corresponding to the transcript replay
    'recordXsnapTrace',

    // Use the debug version of the xsnap worker
    'useXsnapDebug',
  ],
  number: [
    // Force making a snapshot after the "initial" deliveryNum, and every
    // "interval" delivery after. The default Swingset config is after delivery
    // 2 and every 1000 deliveries after (1002, 2002, etc.)
    'forcedSnapshotInitial',
    'forcedSnapshotInterval',

    // Do not reap the first n "initial" and m "recent" workers.
    // This may keep less workers than the first n or m * forcedSnapshotInterval
    // if there are snapshots with different hashes taken for the same delivery
    'keepWorkerInitial',
    'keepWorkerRecent',

    // Keep all workers which are made at deliveryNum which are a multiple of
    // n * forcedSnapshotInterval from the first transcript delivery replayed.
    // For example if the value of this option is 10, the snapshot interval is
    // the default of 1000, and the first transcript loaded is 52002, then all
    // workers loaded from delivery 62002, 72002, etc. won't be reaped.
    'keepWorkerInterval',
  ],
  array: [
    {
      // Keep all workers which are made at the explicitly provided deliveryNum
      key: 'keepWorkerTransactionNums',
      number: true,
    },
  ],
  default: optionsDefault,
  config: {
    config: true,
  },
  configuration: {
    'duplicate-arguments-array': false,
    'flatten-duplicate-arrays': false,
    'greedy-arrays': true,
  },
});

function verifyFilterOptions(options) {
  const filteredOptions = { ...optionsDefault };
  const xsnapWorkerPathOpts = new Set([
    'startXsnapWorkerPath',
    'loadXsnapWorkerPath',
  ]);

  if (!options.vatID)
    throw new Error("vatID is required!");

  if (!options.swingStoreDb && (!options.transcriptStoreDb || !options.bundleStoreDb || !options.snapStoreRDb))
    throw new Error("swingStoreDb or {transcriptStoreDb, bundleStoreDb, snapStoreRDb} is required!");

  if (options.keepAllSnapshots && options.keepNoSnapshots) {
    throw new Error(
      `Mutually exclusive options configured: 'keepAllSnapshots' and 'keepNoSnapshots'`,
    );
  }

  for (const [key, value] of Object.entries(options)) {
    if (xsnapWorkerPathOpts.has(key)) {
      const xsnapWorkerPathOptName = key;
      const xsnapWorkerPath = value;
      if (!xsnapWorkerPath) continue; // eslint-disable-line no-continue
      const sdkRoot = new URL('../../../', import.meta.url);
      const sdkRelativeWorkerPath = fileURLToPath(
        new URL(xsnapWorkerPath, sdkRoot),
      );
      const cwdRelativeWorkerPath = path.resolve(xsnapWorkerPath);
      if (fs.existsSync(sdkRelativeWorkerPath)) {
        filteredOptions[xsnapWorkerPathOptName] = sdkRelativeWorkerPath;
      } else if (fs.existsSync(cwdRelativeWorkerPath)) {
        filteredOptions[xsnapWorkerPathOptName] = cwdRelativeWorkerPath;
      } else {
        throw new Error(
          `Couldn't resolve path "${xsnapWorkerPath}" for option "${xsnapWorkerPathOptName}"`,
        );
      }
    } else {
      filteredOptions[key] = value;
    }
  }

  return filteredOptions;
}

/** @typedef {import('../src/types-external.js').KernelKeeper} KernelKeeper */
/** @typedef {import('@agoric/swing-store').SnapStore} SnapStore */
/** @typedef {import('@agoric/swing-store').SnapshotInfo} SnapshotInfo */
/**
 * @typedef {{
 *  manager: import('../src/types-internal.js').VatManager;
 *  xsnapPID: number | undefined;
 *  explicitWorkerPath: string | undefined;
 *  deliveryTimeTotal: number;
 *  deliveryTimeSinceLastSnapshot: number;
 *  loadSnapshotID: string | undefined;
 *  timeOfLastCommand: number;
 *  keep: boolean;
 *  firstTranscriptNum: number | null;
 *  completeStep: () => void;
 *  stepCompleted: Promise<void>
 * }} WorkerData
 */

// relative timings:
// 3.8s v8-false, 27.5s v8-gc
// 10.8s xs-no-gc, 15s xs-gc
/** @type {import('../src/types-external.js').ManagerType} */
const worker = 'xs-worker';

export async function replay(transcriptStore, bundleStore, snapStoreR, vatID, startPos, options) {
  /** @type {import('../src/types-internal.js').VatManagerFactory} */
  let factory;

  let suppressFallbackSnapStore = false;
  let loadSnapshotID = null;
  let saveSnapshotID = null;
  let lastTranscriptNum = startPos;
  let startTranscriptNum = startPos;
  const snapshotOverrideMap = new Map();

  const snapshotActivityFd = fs.openSync('snapshot-activity.jsonl', 'a');
  const kernelSlog =
    /** @type {import('../src/types-external.js').KernelSlog} */ (
      /** @type {Partial<import('../src/types-external.js').KernelSlog>} */ ({
        write() { },
        delivery: () => () => undefined,
        syscall: () => () => undefined,
      })
    );
  /**
   * @param {string} xsID 
   * @param {string} snapPath
   * @param {SnapStore} fallbackSnapStore
   */
  function makeFakeSnapStore(xsID, snapPath, fallbackSnapStore) {
    /** @type {SnapshotInfo} */
    let lastSavedSnapInfo;
    let lastSavedFileName;
    let lastLoadedSnapInfo;
    let lastLoadedFileName;
    /**
     * (c) ChatGPT
     * Saves a snapshot stream to a file and calculates its SHA-256 hash and size.
     *
     * @param {string} vatID
     * @param {number} snapPos
     * @param {AsyncIterable<Uint8Array>} snapshotStream
     * @returns {Promise<SnapshotResult>}
     */
    async function saveSnapshotFunc(vatID, snapPos, snapshotStream) {
      const tmpFileName = path.join(snapPath, `snapshot_${vatID}_${snapPos}_${Date.now()}.tmp`);
      const writeStream = fs.createWriteStream(tmpFileName);
      const hash = createHash('sha256');

      let uncompressedSize = 0;

      async function* processStream() {
        for await (const chunk of snapshotStream) {
          uncompressedSize += chunk.length;
          hash.update(chunk);
          yield chunk;
        }
      }

      try {
        await pipe(processStream(), writeStream);
      } finally {
        writeStream.end(); // Ensure the write stream is properly closed
      }

      const digest = hash.digest('hex');
      const filePath = path.join(snapPath, `${digest}.xss`);
      await fs.promises.rename(tmpFileName, filePath);
      lastSavedFileName = filePath;

      /** @type {SnapshotInfo} */
      const snapshotInfo = {
        snapPos: snapPos,
        hash: digest,
        uncompressedSize: uncompressedSize,
        compressedSize: uncompressedSize,
      };

      lastSavedSnapInfo = snapshotInfo;

      return harden({
        hash: digest,
        uncompressedSize,
        compressSeconds: 0,
        dbSaveSeconds: 0,
        archiveWriteSeconds: 0,
        compressedSize: uncompressedSize,
      });
    } // saveSnapshotFunc()

    /**
     * Loads the most recent snapshot for a given vat.
     *
     * @param {string} vatID
     * @returns {AsyncGenerator<Uint8Array, void, undefined>}
     */
    async function* loadSnapshotFunc(vatID) {
      // always load the last snapshot saved
      const fileName = lastSavedFileName;

      if (!fileName) {
        if (!suppressFallbackSnapStore && fallbackSnapStore) {
          const snapInfo = fallbackSnapStore.getSnapshotInfo(vatID);
          lastLoadedSnapInfo = snapInfo;
          lastLoadedFileName = `FALLBACK:${snapInfo.hash}`;
          console.dir(`Loading snapshot for vatID '${vatID}' from fallback snap store: ` + JSON.stringify(snapInfo) + '\n');
          for await (const chunk of fallbackSnapStore.loadSnapshot(vatID)) {
            yield chunk;
          }
          return;
        } else {
          throw new Error(`No previously saved snapshots for vatID '${vatID}'.`);
        }
      }
      console.dir(`Loading snapshot for vatID '${vatID}' from file: ${fileName}\n`);
      if (!fs.existsSync(fileName)) {
        throw new Error(`Snapshot file for vatID '${vatID}' does not exist.`);
      }

      const readStream = fs.createReadStream(fileName);
      for await (const chunk of readStream) {
        yield chunk;
      }
    }
    harden(loadSnapshotFunc);

    /**
     * @param {string} vatID 
     * @returns SnapshotInfo
     */
    function getSnapshotInfo(vatID) {
      return lastSavedSnapInfo ? lastSavedSnapInfo : suppressFallbackSnapStore ? undefined : fallbackSnapStore?.getSnapshotInfo(vatID);
    }

    // only custom snap store is supported
    return /** @type {SnapStore} */ ({
      saveSnapshot: saveSnapshotFunc,
      loadSnapshot: loadSnapshotFunc,
      deleteAllUnusedSnapshots: () => { },
      deleteVatSnapshots: (_vatID, _budget) => { return { done: true, cleanups: 0 }; },
      stopUsingLastSnapshot: (_vatID) => { },
      getSnapshotInfo: getSnapshotInfo,
    });
  } // makeFakeSnapStore()

  /**
   * 
   * @param {SnapStore} snapStore 
   * @returns KernelKeeper
   */
  function makeFakeKernelKeeper(snapStore) {
    const fakeKernelKeeper =
    /** @type {KernelKeeper} */ ({
        provideVatKeeper: vatID =>
        /** @type {import('../src/types-external.js').VatKeeper} */(
          /** @type {Partial<import('../src/types-external.js').VatKeeper>} */ ({
            addToTranscript: () => { },
            getSnapshotInfo: () => snapStore.getSnapshotInfo(vatID),
          })
        ),
        getRelaxDurabilityRules: () => false,
      });
    return fakeKernelKeeper;
  }

  const fakeSnapStore = makeFakeSnapStore('xs', options.snapSaveDir || process.env.PWD, snapStoreR);
  const fakeKernelKeeper = makeFakeKernelKeeper(fakeSnapStore);
  const testLog = () => {};
  const meterControl = makeDummyMeterControl();
  const gcTools = harden({
    WeakRef,
    FinalizationRegistry,
    waitUntilQuiescent,
    gcAndFinalize: makeGcAndFinalize(engineGC),
    meterControl,
  });
  const allVatPowers =
    /** @type {import('../src/types-external.js').VatPowers} */ (
      /** @type {Partial<import('../src/types-external.js').VatPowers>} */ ({
        testLog,
      })
    );

  /** @type {WorkerData[]} */
  const workers = [];

  if (worker !== 'xs-worker') {
    throw Error(`unhandled worker type ${worker}`);
  }

  const env = /** @type {Record<string, string>} */ ({});

  if (options.recordXsnapTrace) {
    env.XSNAP_TEST_RECORD = process.cwd();
  }
  if (options.useXsnapDebug) {
    env.XSNAP_DEBUG = 'true';
  }

  const capturePIDSpawn = /** @type {typeof spawn} */ (
    /** @param  {Parameters<typeof spawn>} args */
    (...args) => {
      const [command, ...rest] = args;
      const spawnedWorker = workers[workers.length - 1];
      const child = spawn(
        spawnedWorker.explicitWorkerPath || command,
        ...rest,
      );
      spawnedWorker.xsnapPID = child.pid;
      return child;
    }
  );

  const bundleData = makeXsnapBundleData();
  const bundleHandler = makeWorkerBundleHandler(bundleStore, bundleData);

  const startXSnap = makeStartXSnap({
    spawn: capturePIDSpawn,
    fs,
    tmpName,
    bundleHandler,
    snapStore: fakeSnapStore,
  });

  factory = makeXsSubprocessFactory({
    kernelKeeper: fakeKernelKeeper,
    kernelSlog,
    startXSnap,
    testLog,
  });

  let workersSynced = Promise.resolve();

  const updateWorkersSynced = () => {
    const stepsCompleted = Promise.all(
      workers.map(({ stepCompleted }) => stepCompleted),
    );
    const newWorkersSynced = stepsCompleted.then(
      workers.length > 0
        ? () => {
            if (workersSynced === newWorkersSynced) {
              updateWorkersSynced();
              // SL analyzeSyscallResults();
            }
          }
        : () => {},
    );
    workersSynced = newWorkersSynced;
  };

  /** @param {WorkerData} workerData */
  const completeWorkerStep = workerData => {
    workerData.completeStep();
    workerData.stepCompleted = new Promise(resolve => {
      workerData.completeStep = resolve;
    });
  };

  const updateDeliveryTime = workerData => {
    const deliveryTime = performance.now() - workerData.timeOfLastCommand;
    workerData.timeOfLastCommand = NaN;
    workerData.deliveryTimeTotal += deliveryTime;
    workerData.deliveryTimeSinceLastSnapshot += deliveryTime;
  };

  /**
   * @import {VatSyscallResult} from '@agoric/swingset-liveslots'
   */
  /** @type {Map<string, VatSyscallResult | undefined>} */
  const knownVCSyscalls = new Map();

  let vatParameters;
  let workerOptions = { type: 'xsnap', bundleIDs: [] };
  let source;

  /** @param {boolean} keep */
  const createManager = async keep => {
    let explicitWorkerPath;
    if (worker === 'xs-worker') {
      if (loadSnapshotID && options.loadXsnapWorkerPath) {
        explicitWorkerPath = options.loadXsnapWorkerPath;
      } else if (!loadSnapshotID && options.startXsnapWorkerPath) {
        explicitWorkerPath = options.startXsnapWorkerPath;
      }
    }

    /** @type {WorkerData} */
    const workerData = {
      manager: /** @type {WorkerData['manager']} */ (
        /** @type {unknown} */ (undefined)
      ),
      explicitWorkerPath,
      xsnapPID: NaN,
      deliveryTimeTotal: 0,
      deliveryTimeSinceLastSnapshot: 0,
      timeOfLastCommand: NaN,
      loadSnapshotID,
      keep,
      firstTranscriptNum: null,
      completeStep: () => {},
      stepCompleted: Promise.resolve(),
    };
    completeWorkerStep(workerData);
    workers.push(workerData);
    updateWorkersSynced();
    const managerOptions =
      /** @type {import('../src/types-internal.js').ManagerOptions} */ (
        /** @type {Partial<import('../src/types-internal.js').ManagerOptions>} */ ({
          sourcedConsole: console,
          workerOptions,
          useTranscript: true,
        })
      );
    workerData.manager = await factory.createFromBundle(
      vatID,
      source?.bundleID ? bundleStore.getBundle(source.bundleID) : null,
      managerOptions,
      {}
    );
    return workerData;
  };

  let loadLock = Promise.resolve();
  const loadSnapshot = async (data, keep = false) => {
    if (worker !== 'xs-worker') {
      return;
    }
    await loadLock;

    await Promise.all(
      workers
        .filter(
          ({ firstTranscriptNum, keep: keepRequested }, idx) =>
            firstTranscriptNum != null &&
            !(
              keepRequested ||
              (options.keepWorkerInterval &&
                Math.floor(
                  (firstTranscriptNum - startTranscriptNum) /
                  options.forcedSnapshotInterval,
                ) %
              options.keepWorkerInterval ===
                  0) ||
              idx < options.keepWorkerInitial ||
              idx >= workers.length - options.keepWorkerRecent ||
              options.keepWorkerTransactionNums.includes(firstTranscriptNum)
            ),
        )
        .map(async workerData => {
          workers.splice(workers.indexOf(workerData), 1);
          updateWorkersSynced();

          const {
            manager,
            xsnapPID,
            deliveryTimeSinceLastSnapshot,
            deliveryTimeTotal,
            firstTranscriptNum,
          } = workerData;
          // eslint-disable-next-line no-await-in-loop
          await manager?.shutdown();
          console.dir(
            `Shutdown worker PID ${xsnapPID} (start delivery ${firstTranscriptNum}).\n    Delivery time since last snapshot ${
              Math.round(deliveryTimeSinceLastSnapshot) / 1000
            }s. Delivery time total ${
              Math.round(deliveryTimeTotal) / 1000
            }s. Up ${
              lastTranscriptNum - (firstTranscriptNum ?? NaN)
            } deliveries.`,
          );
        }),
    );

    loadSnapshotID = data.snapshotID;
    /** @type {() => void} */
    let releaseLock;
    loadLock = new Promise(resolve => {
      releaseLock = resolve;
    });
    // @ts-expect-error
    assert(releaseLock);
    try {
      if (snapshotOverrideMap.has(loadSnapshotID)) {
        loadSnapshotID = snapshotOverrideMap.get(loadSnapshotID);
      }
      const existingWorkerData = workers.find(
        workerData => workerData.loadSnapshotID === loadSnapshotID,
      );
      if (existingWorkerData) {
        existingWorkerData.keep ||= !!keep;
        console.dir(
          `found an existing manager for snapshot ${loadSnapshotID}, skipping duplicate creation`,
        );
        return;
      }
      if (data.vatID) {
        vatID = data.vatID;
      }
      const { xsnapPID } = await createManager(keep);
      console.dir(
        `created manager from snapshot ${loadSnapshotID}, worker PID: ${xsnapPID}`,
      );
      fs.writeSync(
        snapshotActivityFd,
        `${JSON.stringify({
          type: 'load',
          xsnapPID,
          vatID,
          snapshotID: data.snapshotID,
          loadSnapshotID,
        })}\n`,
      );
    } finally {
      loadSnapshotID = null;
      releaseLock();
    }
  };

  if (startPos === null || startPos === undefined) {
    ({ startPos: startPos } = transcriptStore.getCurrentSpanBounds(vatID));
  }

  try {
    let replayItemCount = 0;
    for await (const { position: transcriptNum, item } of transcriptStore.readVatTranscriptRange(vatID, startPos)) {
      replayItemCount += 1;
      const transcriptEntry = JSON.parse(item);
      const { d: delivery, r: expectedResult, sc: sysCalls } = transcriptEntry;
      const deliveryType = delivery?.[0];
      console.dir(`>>> ${transcriptNum}: ${deliveryType}`);

      if (deliveryType === 'load-snapshot') {
        if (worker === 'xs-worker') {
          console.dir(`loading snapshot: ${delivery?.[1]?.snapshotID})\n`);
          await loadSnapshot(delivery?.[1], options.keepWorkerExplicitLoad);
        } else if (!workers.length) {
          throw Error(
            `Cannot replay transcript in ${worker} starting with a heap snapshot load.`,
          );
        }
      } else if (!workers.length) {
        if (deliveryType !== 'initialize-worker') {
          throw Error(
            `first line of transcript was not a create-vat or heap-snapshot-load`,
          );
        }
        ({ source, workerOptions } = delivery?.[1]);
        suppressFallbackSnapStore = true;
        const { xsnapPID } = await createManager(options.keepWorkerExplicitLoad);
        console.dir(
          `manager created from bundle source, worker PID: ${xsnapPID}`,
          `\n\tsource: ${JSON.stringify(source)}`,
          `\n\tworkerOptions: ${JSON.stringify(workerOptions)}`
        );
        fs.writeSync(
          snapshotActivityFd,
          `${JSON.stringify({
            type: 'create',
            xsnapPID,
            vatID,
          })}\n`,
        );
      } else if (deliveryType === 'save-snapshot') {
        // throw new Error('save-snapshot is not implemented!');
        saveSnapshotID = expectedResult?.snapshotID;
        console.dir(`save-snapshot expecting hash: ${saveSnapshotID}`);

        /** @param {WorkerData} workerData */
        const doWorkerSnapshot = async workerData => {
          const { manager, xsnapPID, firstTranscriptNum } = workerData;
          if (!manager?.makeSnapshot) return null;
          const { hash, dbSaveSeconds, } = await manager.makeSnapshot(
            transcriptNum,
            fakeSnapStore,
            false // SL never restart
          );
          fs.writeSync(
            snapshotActivityFd,
            `${JSON.stringify({
              type: 'save',
              xsnapPID,
              vatID,
              transcriptNum: lastTranscriptNum,
              snapshotID: hash,
              saveSnapshotID,
            })}\n`,
          );
          if (hash !== saveSnapshotID) {
            const errorMessage = `Snapshot hash does not match. ${hash} !== ${saveSnapshotID} for worker PID ${xsnapPID} (start delivery ${firstTranscriptNum})`;
            if (options.ignoreSnapshotHashDifference) {
              console.warn(errorMessage);
            } else {
              throw new Error(errorMessage);
            }
          } else {
            console.dir(
              `made snapshot ${hash} of worker PID ${xsnapPID} (start delivery ${firstTranscriptNum}).\n    Save time = ${Math.round(dbSaveSeconds * 1000) / 1000
              }s. Delivery time since last snapshot ${Math.round(workerData.deliveryTimeSinceLastSnapshot) / 1000
              }s. Up ${lastTranscriptNum - (workerData.firstTranscriptNum ?? NaN)
              } deliveries.`,
            );
          }
          workerData.deliveryTimeSinceLastSnapshot = 0;
          return hash;
        };
        const savedSnapshots = await (options.useCustomSnapStore
          ? workers.reduce(
            async (hashes, workerData) => [
              ...(await hashes),
              await doWorkerSnapshot(workerData),
            ],
            Promise.resolve(/** @type {string[]} */([])),
          )
          : Promise.all(workers.map(doWorkerSnapshot)));
        saveSnapshotID = null;

        const uniqueSnapshotIDs = new Set(savedSnapshots);
        let divergent = uniqueSnapshotIDs.size > 1;
        if (
          !uniqueSnapshotIDs.has(expectedResult?.snapshotID) &&
          (divergent || savedSnapshots[0] !== null)
        ) {
          divergent = true;
          snapshotOverrideMap.set(
            expectedResult?.snapshotID.snapshotID,
            /** @type {string} */(savedSnapshots[0]),
          );
        }
        if (options.forcedReloadFromSnapshot) {
          for (const snapshotID of uniqueSnapshotIDs) {
            // eslint-disable-next-line no-await-in-loop
            await loadSnapshot(
              { snapshotID, vatID },
              options.keepWorkerHashDifference && divergent,
            );
          }
        }

        /* SL
        if (
          !options.useCustomSnapStore &&
          (options.keepNoSnapshots || (!divergent && !options.keepAllSnapshots))
        ) {
          for (const snapshotID of uniqueSnapshotIDs) {
            if (snapshotID) {
              snapStore.prepareToDelete(snapshotID);
            }
          }
          await snapStore.commitDeletes(true);
        } */
      } else {
        lastTranscriptNum = transcriptNum;

        const makeSnapshot =
          options.forcedSnapshotInterval &&
          (transcriptNum - options.forcedSnapshotInitial) %
          options.forcedSnapshotInterval ===
          0;

        /** @type {({snapshotID: string; workerData: WorkerData;} | null)[]} */
        const snapshotData = await Promise.all(
          workers.map(async workerData => {
            const { manager, xsnapPID } = workerData;
            workerData.timeOfLastCommand = performance.now();
            const { syscallHandler, finishSimulation } = makeSyscallSimulator(kernelSlog, vatID, transcriptNum, transcriptEntry);
            const deliveryResult = await manager.deliver(delivery, syscallHandler);
            Array.isArray(deliveryResult) || Fail`Delivery result is not an Array`;
            deliveryResult[0] === expectedResult?.status ||
              Fail`Delivery result mismatch. Expected: ${q(expectedResult?.status)} Received: ${q(deliveryResult[0])}`

            finishSimulation();
            updateDeliveryTime(workerData);
            workerData.firstTranscriptNum ??= transcriptNum - 1;
            completeWorkerStep(workerData);
            await workersSynced;

            // enable this to write periodic snapshots, for #5975 leak
            if (makeSnapshot && manager.makeSnapshot) {
              const { hash, dbSaveSeconds, } = await manager.makeSnapshot(
                transcriptNum,
                fakeSnapStore,
                false // SL do not restart
              );
              fs.writeSync(
                snapshotActivityFd,
                `${JSON.stringify({
                  type: 'save',
                  xsnapPID,
                  vatID,
                  transcriptNum,
                  hash,
                })}\n`,
              );
              console.dir(
                `made snapshot ${hash} after delivery ${transcriptNum} to worker PID ${xsnapPID} (start delivery ${workerData.firstTranscriptNum
                }).\n    Save time = ${Math.round(dbSaveSeconds * 1000) / 1000
                }s. Delivery time since last snapshot ${Math.round(workerData.deliveryTimeSinceLastSnapshot) / 1000
                }s. Up ${transcriptNum - workerData.firstTranscriptNum
                } deliveries.`,
              );
              workerData.deliveryTimeSinceLastSnapshot = 0;
              return { snapshotID: hash, workerData };
            } else {
              return null;
            }
          }),
        );
        const uniqueSnapshotIDs = [
          ...new Set(snapshotData.map(data => data?.snapshotID)),
        ].filter(snapshotID => snapshotID != null);

        const divergent = uniqueSnapshotIDs.length !== 1;

        if (makeSnapshot && divergent) {
          const errorMessage = `Snapshot hashes do not match each other: ${uniqueSnapshotIDs.join(
            ', ',
          )}`;
          if (options.ignoreSnapshotHashDifference) {
            console.warn(errorMessage);
          } else {
            throw new Error(errorMessage);
          }
        }

        if (options.forcedReloadFromSnapshot) {
          /** @type Set<String | undefined> */
          let reloadSnapshotIDs = new Set(uniqueSnapshotIDs);
          if (
            !options.keepWorkerHashDifference &&
            uniqueSnapshotIDs.length > options.keepWorkerRecent
          ) {
            reloadSnapshotIDs = new Set(
              snapshotData
                .filter(data => data && data.workerData.keep)
                .map(data => data?.snapshotID),
            );
            for (const data of snapshotData.reverse()) {
              if (reloadSnapshotIDs.size >= options.keepWorkerRecent) break;
              reloadSnapshotIDs.add(data?.snapshotID);
            }
          }
          for (const snapshotID of reloadSnapshotIDs) {
            // eslint-disable-next-line no-await-in-loop
            await loadSnapshot(
              {
                snapshotID,
                vatID,
              },
              options.keepWorkerHashDifference && divergent,
            );
          }
        }

        const loadSnapshots = [].concat(
          options.loadSnapshots?.[transcriptNum] || [],
        );
        for (const snapshotID of loadSnapshots) {
          // eslint-disable-next-line no-await-in-loop
          await loadSnapshot(
            {
              snapshotID,
              vatID,
            },
            options.keepWorkerExplicitLoad ||
            (options.keepWorkerHashDifference &&
              (loadSnapshots.length > 1 ||
                !uniqueSnapshotIDs.includes(snapshotID))),
          );
        }

        /* SL if (
          !options.useCustomSnapStore &&
          (options.keepNoSnapshots || (!divergent && !options.keepAllSnapshots))
        ) {
          for (const snapshotID of uniqueSnapshotIDs) {
            if (snapshotID) {
              snapStore.prepareToDelete(snapshotID);
            }
          }
          await snapStore.commitDeletes(true);
        }*/
      }
    } // for await (const line of trSpanIterator)
    if (replayItemCount === 0) {
      throw new Error(`No items found in transcriptStore for vatID ${vatID}`);
    }
    console.dir(
      `Replay finished for vatID ${vatID} (${replayItemCount} items).`,
    );
  } finally {
    fs.closeSync(snapshotActivityFd);
    await Promise.all(
      workers.map(
        async ({
          xsnapPID,
          manager,
          deliveryTimeSinceLastSnapshot,
          deliveryTimeTotal,
          firstTranscriptNum,
        }) => {
          await manager?.shutdown();
          console.dir(
            `Shutdown worker PID ${xsnapPID} (start delivery ${firstTranscriptNum}).\n    Delivery time since last snapshot ${
              Math.round(deliveryTimeSinceLastSnapshot) / 1000
            }s. Delivery time total ${
              Math.round(deliveryTimeTotal) / 1000
            }s. Up ${
              lastTranscriptNum - (firstTranscriptNum ?? NaN)
            } deliveries.`,
          );
        },
      ),
    );
  }
}

/*
 * Based on options content, open appropriate swing/transcript/bundle/snap-Store[s],
 * respecting the overrides, as necessary.
 */
export function openStores({ swingStoreDb, transcriptStoreDb, bundleStoreDb, snapStoreRDb }) {
  const noop = () => { };

  // single master database
  const db = swingStoreDb ? sqlite3(swingStoreDb) : null;

  // apply overrides, if any
  const tsDb = transcriptStoreDb ? sqlite3(transcriptStoreDb, { fileMustExist: true, readonly: false }) : db;
  const bsDb = bundleStoreDb ? sqlite3(bundleStoreDb, { fileMustExist: true, readonly: true }) : db;
  const ssRDb = snapStoreRDb ? sqlite3(snapStoreRDb, { fileMustExist: true, readonly: true }) : db;

  console.dir(`swingStore DB: ${db?.name}`);
  console.dir(`transcriptStore DB: ${tsDb?.name}`);
  console.dir(`bundleStore DB: ${bsDb?.name}`);
  console.dir(`snapStore DB: ${ssRDb?.name}`);

  const transcriptStore = tsDb ? makeTranscriptStore(tsDb, noop) : null;
  const bundleStore = bsDb ? makeBundleStore(bsDb, noop) : null;
  const snapStoreR = ssRDb
    ? makeSnapStore(ssRDb, noop, { measureSeconds: makeMeasureSeconds(performance.now) }, noop, { keepSnapshots: false, },)
    : null;

  return harden({
    transcriptStore,
    bundleStore,
    snapStoreR,
  });
}

export function findStartPos(snapStore, vatID) {
  const { snapPos } = snapStore.getSnapshotInfo(vatID);

  if (snapPos === null || snapPos === undefined)
    throw new Error("Did not find any inUse snapshots in snapStore!");

  return snapPos + 1;
}

export async function run(runOptions) {
  const options = verifyFilterOptions(runOptions);
  console.dir(runOptions, { depth: null });

  const { transcriptStore, bundleStore, snapStoreR } = openStores(options);

  let startPos = options.startPos;
  if (options.startPos === null || options.startPos === undefined) {
    startPos = findStartPos(snapStoreR, options.vatID);
    console.dir(`No startPos provided, derived startPos = ${startPos}`);
  }

  await replay(transcriptStore, bundleStore, snapStoreR, options.vatID, startPos, options);
}

// If the script is run directly, execute the main function.
if (import.meta.url === `file://${process.argv[1]}`) {
  run(argv).catch(err => {
    console.dir('RUN ERR', err);
    process.exit(process.exitCode || 1);
  });
}
