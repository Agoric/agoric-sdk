// @ts-check

/* global WeakRef FinalizationRegistry */
/* eslint-disable no-constant-condition */
import fs from 'fs';
// import '@endo/init';
import '../tools/install-ses-debug.js';
import zlib from 'zlib';
import readline from 'readline';
import process from 'process';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { createHash } from 'crypto';
import { pipeline } from 'stream';
import { performance } from 'perf_hooks';
// eslint-disable-next-line import/no-extraneous-dependencies
import { file as tmpFile, tmpName, dirSync as tmpDirSync } from 'tmp';
// eslint-disable-next-line import/no-extraneous-dependencies
import sqlite3 from 'better-sqlite3';
// eslint-disable-next-line import/no-extraneous-dependencies
import yargsParser from 'yargs-parser';
import { makeMeasureSeconds } from '@agoric/internal';
import { makeWithQueue } from '@agoric/internal/src/queue.js';
import { makeSnapStore } from '@agoric/swing-store';
import { getLockdownBundle } from '@agoric/xsnap-lockdown';
import { getSupervisorBundle } from '@agoric/swingset-xsnap-supervisor';
import { waitUntilQuiescent } from '../src/lib-nodejs/waitUntilQuiescent.js';
import { makeStartXSnap } from '../src/controller/startXSnap.js';
import { makeXsSubprocessFactory } from '../src/kernel/vat-loader/manager-subprocess-xsnap.js';
import { makeLocalVatManagerFactory } from '../src/kernel/vat-loader/manager-local.js';
import { requireIdentical } from '../src/kernel/vat-loader/transcript.js';
import { makeDummyMeterControl } from '../src/kernel/dummyMeterControl.js';
import { makeGcAndFinalize } from '../src/lib-nodejs/gc-and-finalize.js';
import engineGC from '../src/lib-nodejs/engine-gc.js';

const pipe = promisify(pipeline);

// TODO: switch to full yargs for documenting output
const argv = yargsParser(process.argv.slice(2), {
  boolean: [
    // Use built bundles from the current SDK
    // Disable if bundles were previously extracted form a Kernel DB.
    'useSdkBundles',

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
  default: {
    useSdkBundles: false,
    ignoreSnapshotHashDifference: true,
    ignoreConcurrentWorkerDivergences: true,
    forcedSnapshotInitial: 2,
    forcedSnapshotInterval: 1000,
    forcedReloadFromSnapshot: true,
    keepWorkerInitial: 0,
    keepWorkerRecent: 10,
    keepWorkerInterval: 10,
    keepWorkerExplicitLoad: true,
    keepWorkerHashDifference: true,
    keepWorkerTransactionNums: [],
    skipExtraVcSyscalls: true,
    simulateVcSyscalls: true,
    useCustomSnapStore: false,
    recordXsnapTrace: false,
    useXsnapDebug: false,
  },
  config: {
    config: true,
  },
  configuration: {
    'duplicate-arguments-array': false,
    'flatten-duplicate-arrays': false,
    'greedy-arrays': true,
  },
});

/** @type {(filename: string) => Promise<string>} */
async function fileHash(filename) {
  const hash = createHash('sha256');
  const input = fs.createReadStream(filename);
  await pipe(input, hash);
  return hash.digest('hex');
}

const measureSeconds = makeMeasureSeconds(performance.now.bind(performance));

function makeSnapStoreIO() {
  return {
    createReadStream: fs.createReadStream,
    createWriteStream: fs.createWriteStream,
    measureSeconds,
    open: fs.promises.open,
    stat: fs.promises.stat,
    tmpFile,
    tmpName,
    unlink: fs.promises.unlink,
  };
}

// relative timings:
// 3.8s v8-false, 27.5s v8-gc
// 10.8s xs-no-gc, 15s xs-gc
/** @type {import('../src/types-external.js').ManagerType} */
const worker = 'xs-worker';

async function replay(transcriptFile) {
  let vatID; // we learn this from the first line of the transcript
  /** @type {import('../src/types-internal.js').VatManagerFactory} */
  let factory;

  let loadSnapshotID = null;
  let saveSnapshotID = null;
  let lastTranscriptNum = 0;
  let startTranscriptNum;
  const snapshotOverrideMap = new Map();

  const snapshotActivityFd = fs.openSync('snapshot-activity.jsonl', 'a');

  const fakeKernelKeeper =
    /** @type {import('../src/types-external.js').KernelKeeper} */ ({
      provideVatKeeper: _vatID =>
        /** @type {import('../src/types-external.js').VatKeeper} */ (
          /** @type {Partial<import('../src/types-external.js').VatKeeper>} */ ({
            addToTranscript: () => {},
            getSnapshotInfo: () => loadSnapshotID && { hash: loadSnapshotID },
          })
        ),
      getRelaxDurabilityRules: () => false,
    });

  let bundleIDs;
  /** @type {import('../src/controller/bundle-handler.js').BundleHandler} */
  const bundleHandler = harden({
    getCurrentBundleIDs: async () => {
      return bundleIDs || ['lockdown-bundle', 'supervisor-bundle'];
    },
    getBundle: async id => {
      const rawBundle = await fs.promises.readFile(id, { encoding: 'utf-8' });
      const bundle = harden(JSON.parse(rawBundle));
      return bundle;
    },
  });

  const kernelSlog =
    /** @type {import('../src/types-external.js').KernelSlog} */ (
      /** @type {Partial<import('../src/types-external.js').KernelSlog>} */ ({
        write() {},
        delivery: () => () => undefined,
        syscall: () => () => undefined,
      })
    );

  if (argv.ignoreSnapshotHashDifference && !argv.useCustomSnapStore) {
    console.warn(
      'Ignore snapshot difference implies usage of custom snapStore',
    );
    argv.useCustomSnapStore = true;
  }

  /** @type {SnapStore} */
  let snapStore;
  /** @type {(() => void) | undefined} */
  let cleanupSnapStore;

  if (argv.useCustomSnapStore) {
    snapStore = /** @type {SnapStore} */ ({
      async saveSnapshot(_vatID, endPos, saveRaw) {
        const snapFile = `${vatID}-${endPos}-${
          saveSnapshotID || 'unknown'
        }.xss`;
        const { duration: rawSaveSeconds } = await measureSeconds(() =>
          saveRaw(snapFile),
        );
        const hash = await fileHash(snapFile);
        const filePath = `${vatID}-${hash}.xss`;
        await fs.promises.rename(snapFile, filePath);
        return { hash, rawSaveSeconds };
      },
      async loadSnapshot(_vatID, loadRaw) {
        const snapFile = `${vatID}-${loadSnapshotID}.xss`;
        return loadRaw(snapFile);
      },
    });
  } else {
    const tmpDb = tmpDirSync({
      prefix: `ag-replay-${transcriptFile}`,
      unsafeCleanup: true,
    });
    cleanupSnapStore = tmpDb.removeCallback;
    snapStore = makeSnapStore(
      sqlite3(`${tmpDb.name}/snapstore.sqlite`),
      () => {},
      makeSnapStoreIO(),
      undefined,
      {
        keepSnapshots: true,
      },
    );
  }
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
  /**
   * @typedef {{
   *  manager: import('../src/types-internal.js').VatManager;
   *  xsnapPID: number | undefined;
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
  /** @type {WorkerData[]} */
  const workers = [];

  if (worker === 'xs-worker') {
    /** @type {import('../src/types-external.js').Bundle[] | undefined} */
    let overrideBundles;
    if (argv.useSdkBundles) {
      overrideBundles = await Promise.all([
        /** @type {Promise<*>} */ (getLockdownBundle()),
        /** @type {Promise<*>} */ (getSupervisorBundle()),
      ]);
    }

    const capturePIDSpawn = /** @type {typeof spawn} */ (
      /** @param  {Parameters<typeof spawn>} args */
      (...args) => {
        const child = spawn(...args);
        workers[workers.length - 1].xsnapPID = child.pid;
        return child;
      }
    );
    const startXSnap = makeStartXSnap({
      snapStore,
      spawn: capturePIDSpawn,
      debug: argv.useXsnapDebug,
      workerTraceRootPath: argv.recordXsnapTrace ? process.cwd() : undefined,
      overrideBundles,
      bundleHandler,
    });
    factory = makeXsSubprocessFactory({
      allVatPowers,
      kernelKeeper: fakeKernelKeeper,
      kernelSlog,
      startXSnap,
      testLog,
    });
  } else if (worker === 'local') {
    factory = makeLocalVatManagerFactory({
      allVatPowers,
      kernelKeeper: fakeKernelKeeper,
      vatEndowments: {},
      gcTools,
      kernelSlog,
    });
  } else {
    throw Error(`unhandled worker type ${worker}`);
  }

  const [
    bestRequireIdentical,
    extraSyscall,
    missingSyscall,
    vcSyscallRE,
    supportsRelaxedSyscalls,
  ] = await (async () => {
    /** @type {any} */
    const transcriptModule = await import(
      '../src/kernel/vat-loader/transcript.js'
    );

    /** @type {RegExp} */
    const syscallRE =
      transcriptModule.vcSyscallRE || /^vc\.\d+\.\|(?:schemata|label)$/;

    if (
      typeof transcriptModule.requireIdenticalExceptStableVCSyscalls !==
      'function'
    ) {
      return [
        requireIdentical,
        Symbol('never extra'),
        Symbol('never missing'),
        syscallRE,
        false,
      ];
    }

    /** @type {{requireIdenticalExceptStableVCSyscalls: import('../src/kernel/vat-loader/transcript.js').CompareSyscalls}} */
    const { requireIdenticalExceptStableVCSyscalls } = transcriptModule;

    if (
      typeof transcriptModule.extraSyscall === 'symbol' &&
      typeof transcriptModule.missingSyscall === 'symbol'
    ) {
      return [
        requireIdenticalExceptStableVCSyscalls,
        /** @type {symbol} */ (transcriptModule.extraSyscall),
        /** @type {symbol} */ (transcriptModule.missingSyscall),
        syscallRE,
        true,
      ];
    }

    /** @type {unknown} */
    const dynamicExtraSyscall = requireIdenticalExceptStableVCSyscalls(
      'vat0',
      ['vatstoreGet', 'vc.0.|label'],
      ['vatstoreGet', 'ignoreExtraSyscall'],
    );
    /** @type {unknown} */
    const dynamicMissingSyscall = requireIdenticalExceptStableVCSyscalls(
      'vat0',
      ['vatstoreGet', 'ignoreMissingSyscall'],
      ['vatstoreGet', 'vc.0.|label'],
    );

    return [
      requireIdenticalExceptStableVCSyscalls,
      typeof dynamicExtraSyscall === 'symbol'
        ? dynamicExtraSyscall
        : Symbol('never extra'),
      typeof dynamicMissingSyscall === 'symbol'
        ? dynamicMissingSyscall
        : Symbol('never missing'),
      syscallRE,
      typeof dynamicExtraSyscall === 'symbol' &&
        typeof dynamicMissingSyscall === 'symbol',
    ];
  })();

  if (
    (argv.simulateVcSyscalls || argv.skipExtraVcSyscalls) &&
    !supportsRelaxedSyscalls
  ) {
    console.warn(
      'Transcript replay does not support relaxed replay. Cannot simulate or skip syscalls',
    );
  }

  /** @type {Partial<Record<ReturnType<typeof getResultKind>, Map<string, number[]>>>} */
  let syscallResults = {};

  const getResultKind = result => {
    if (result === extraSyscall) {
      return 'extra';
    } else if (result === missingSyscall) {
      return 'missing';
    } else if (result) {
      return 'error';
    } else {
      return 'success';
    }
  };

  const reportWorkerResult = ({
    xsnapPID,
    result,
    originalSyscall,
    newSyscall,
  }) => {
    if (!result) return;
    if (workers.length <= 1) return;
    const resultKind = getResultKind(result);
    let kindSummary = syscallResults[resultKind];
    if (!kindSummary) {
      /** @type {Map<string, number[]>} */
      kindSummary = new Map();
      syscallResults[resultKind] = kindSummary;
    }
    const syscallKey = JSON.stringify(
      resultKind === 'extra' ? originalSyscall : newSyscall,
    );
    let workerList = kindSummary.get(syscallKey);
    if (!workerList) {
      workerList = [];
      kindSummary.set(syscallKey, workerList);
    }
    workerList.push(xsnapPID);
  };

  const analyzeSyscallResults = () => {
    const numWorkers = workers.length;
    let divergent = false;
    for (const [kind, kindSummary] of Object.entries(syscallResults)) {
      for (const [syscallKey, workerList] of kindSummary.entries()) {
        if (workerList.length !== numWorkers) {
          console.error(
            `Divergent ${kind} syscall on deliveryNum= ${lastTranscriptNum}:\n  Worker PIDs ${workerList.join(
              ', ',
            )} recorded ${kind} ${syscallKey}`,
          );
          divergent = true;
        }
      }
    }
    syscallResults = {};
    if (divergent && !argv.ignoreConcurrentWorkerDivergences) {
      throw new Error('Divergent execution between workers');
    }
  };

  let workersSynced = Promise.resolve();

  const updateWorkersSynced = () => {
    const stepsCompleted = Promise.all(
      workers.map(({ stepCompleted }) => stepCompleted),
    );
    const newWorkersSynced = stepsCompleted.then(() => {
      if (workersSynced === newWorkersSynced) {
        updateWorkersSynced();
        analyzeSyscallResults();
      }
    });
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

  /** @type {Map<string, import('@agoric/swingset-liveslots').VatSyscallResult | undefined>} */
  const knownVCSyscalls = new Map();

  /**
   * @param {import('../src/types-external.js').VatSyscallObject} vso
   */
  const vatSyscallHandler = vso => {
    if (vso[0] === 'vatstoreGet') {
      const response = knownVCSyscalls.get(vso[1]);

      if (!response) {
        throw new Error(`Unknown vc vatstore entry ${vso[1]}`);
      }

      return response;
    }

    throw new Error(`Unexpected syscall ${vso[0]}(${vso.slice(1).join(', ')})`);
  };

  /**
   * @param {WorkerData} workerData
   * @returns {import('../src/kernel/vat-loader/transcript.js').CompareSyscalls}
   */
  const makeCompareSyscalls = workerData => {
    const doCompare = (
      _vatID,
      originalSyscall,
      newSyscall,
      originalResponse,
    ) => {
      const error = bestRequireIdentical(vatID, originalSyscall, newSyscall);
      if (
        error &&
        JSON.stringify(originalSyscall).indexOf('error:liveSlots') !== -1
      ) {
        return undefined; // Errors are serialized differently, sometimes
      }

      if (error) {
        console.error(
          `during transcript num= ${lastTranscriptNum} for worker PID ${workerData.xsnapPID} (start delivery ${workerData.firstTranscriptNum})`,
        );

        if (
          // @ts-expect-error may be a symbol in some versions
          error === extraSyscall &&
          !argv.skipExtraVcSyscalls
        ) {
          return new Error('Extra syscall disallowed');
        }
      }

      const newSyscallKind = newSyscall[0];

      if (
        // @ts-expect-error may be a symbol in some versions
        error === missingSyscall &&
        !argv.simulateVcSyscalls
      ) {
        return new Error('Missing syscall disallowed');
      }

      if (
        argv.simulateVcSyscalls &&
        supportsRelaxedSyscalls &&
        !error &&
        (newSyscallKind === 'vatstoreGet' ||
          newSyscallKind === 'vatstoreSet') &&
        vcSyscallRE.test(newSyscall[1])
      ) {
        if (newSyscallKind === 'vatstoreGet') {
          if (originalResponse !== undefined) {
            knownVCSyscalls.set(newSyscall[1], originalResponse);
          } else if (!knownVCSyscalls.has(newSyscall[1])) {
            console.warn(
              `Cannot store vc syscall result for vatstoreGet(${newSyscall[1]})`,
            );
            knownVCSyscalls.set(newSyscall[1], undefined);
          }
        } else if (newSyscallKind === 'vatstoreSet') {
          knownVCSyscalls.set(newSyscall[1], ['ok', newSyscall[2]]);
        }
      }

      return error;
    };
    const compareSyscalls = (
      _vatID,
      originalSyscall,
      newSyscall,
      originalResponse,
    ) => {
      updateDeliveryTime(workerData);
      const result = doCompare(
        _vatID,
        originalSyscall,
        newSyscall,
        originalResponse,
      );
      reportWorkerResult({
        xsnapPID: workerData.xsnapPID,
        result,
        originalSyscall,
        newSyscall,
      });
      workerData.timeOfLastCommand = performance.now();
      return result;
    };
    return compareSyscalls;
  };

  let vatParameters;
  let vatSourceBundleID;
  let vatSourceBundle;

  /** @param {boolean} keep */
  const createManager = async keep => {
    /** @type {WorkerData} */
    const workerData = {
      manager: /** @type {WorkerData['manager']} */ (
        /** @type {unknown} */ (undefined)
      ),
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
          vatParameters,
          compareSyscalls: makeCompareSyscalls(workerData),
          useTranscript: true,
          workerOptions: {
            type: worker === 'xs-worker' ? 'xsnap' : worker,
            bundleIDs: await bundleHandler.getCurrentBundleIDs(),
          },
        })
      );
    if (!vatSourceBundle && !loadSnapshotID) {
      vatSourceBundle = await bundleHandler.getBundle(vatSourceBundleID);
    }
    workerData.manager = await factory.createFromBundle(
      vatID,
      vatSourceBundle,
      managerOptions,
      {},
      vatSyscallHandler,
    );
    return workerData;
  };

  const withWorkerQueue = makeWithQueue();

  const loadSnapshot = withWorkerQueue(async (data, keep = false) => {
    if (worker !== 'xs-worker') {
      return;
    }
    await Promise.all(
      workers
        .filter(
          ({ firstTranscriptNum, keep: keepRequested }, idx) =>
            firstTranscriptNum != null &&
            !(
              keepRequested ||
              (argv.keepWorkerInterval &&
                Math.floor(
                  (firstTranscriptNum - startTranscriptNum) /
                    argv.forcedSnapshotInterval,
                ) %
                  argv.keepWorkerInterval ===
                  0) ||
              idx < argv.keepWorkerInitial ||
              idx >= workers.length - argv.keepWorkerRecent ||
              argv.keepWorkerTransactionNums.includes(firstTranscriptNum)
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
          await manager.shutdown();
          console.log(
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
    try {
      if (snapshotOverrideMap.has(loadSnapshotID)) {
        loadSnapshotID = snapshotOverrideMap.get(loadSnapshotID);
      }
      const existingWorkerData = workers.find(
        workerData => workerData.loadSnapshotID === loadSnapshotID,
      );
      if (existingWorkerData) {
        existingWorkerData.keep ||= !!keep;
        console.log(
          `found an existing manager for snapshot ${loadSnapshotID}, skipping duplicate creation`,
        );
        return;
      }
      if (data.vatID) {
        vatID = data.vatID;
      }
      const { xsnapPID } = await createManager(keep);
      console.log(
        `created manager from snapshot ${loadSnapshotID}, worker PID: ${xsnapPID}`,
      );
      fs.writeSync(
        snapshotActivityFd,
        `${JSON.stringify({
          transcriptFile,
          type: 'load',
          xsnapPID,
          vatID,
          snapshotID: data.snapshotID,
          loadSnapshotID,
        })}\n`,
      );
    } finally {
      loadSnapshotID = null;
    }
  });

  const snapshotWorker = withWorkerQueue(
    /** @param {WorkerData} workerData */
    async workerData => {
      const { manager, xsnapPID, firstTranscriptNum } = workerData;
      if (!manager.makeSnapshot) return null;
      const { hash, rawSaveSeconds } = await manager.makeSnapshot(
        lastTranscriptNum,
        snapStore,
      );
      fs.writeSync(
        snapshotActivityFd,
        `${JSON.stringify({
          transcriptFile,
          type: 'save',
          xsnapPID,
          vatID,
          transcriptNum: lastTranscriptNum,
          snapshotID: hash,
          saveSnapshotID,
        })}\n`,
      );
      if (saveSnapshotID && hash !== saveSnapshotID) {
        const errorMessage = `Snapshot hash does not match. ${hash} !== ${saveSnapshotID} for worker PID ${xsnapPID} (start delivery ${firstTranscriptNum})`;
        if (argv.ignoreSnapshotHashDifference) {
          console.warn(errorMessage);
        } else {
          throw new Error(errorMessage);
        }
      } else {
        console.log(
          `made snapshot ${hash} after delivery ${lastTranscriptNum} of worker PID ${xsnapPID} (start delivery ${firstTranscriptNum}).\n    Save time = ${
            Math.round(rawSaveSeconds * 1000) / 1000
          }s. Delivery time since last snapshot ${
            Math.round(workerData.deliveryTimeSinceLastSnapshot) / 1000
          }s. Up ${
            lastTranscriptNum - (workerData.firstTranscriptNum ?? NaN)
          } deliveries.`,
        );
      }
      workerData.deliveryTimeSinceLastSnapshot = 0;
      return hash;
    },
  );

  /** @type {import('stream').Readable} */
  let transcriptF = fs.createReadStream(transcriptFile);
  if (transcriptFile.endsWith('.gz')) {
    transcriptF = transcriptF.pipe(zlib.createGunzip());
  }
  const lines = readline.createInterface({ input: transcriptF });
  let lineNumber = 1;
  try {
    for await (const line of lines) {
      if (lineNumber % 1000 === 0) {
        console.log(` (slog line ${lineNumber})`);
      }
      lineNumber += 1;
      const data = JSON.parse(line);
      if (data.type === 'heap-snapshot-load') {
        if (worker === 'xs-worker') {
          await loadSnapshot(data, argv.keepWorkerExplicitLoad);
        } else if (!workers.length) {
          throw Error(
            `Cannot replay transcript in ${worker} starting with a heap snapshot load.`,
          );
        }
      } else if (!workers.length) {
        if (data.type !== 'create-vat') {
          throw Error(
            `first line of transcript was not a create-vat or heap-snapshot-load`,
          );
        }
        ({
          vatParameters,
          vatSourceBundle,
          vatSourceBundleID,
          bundleIDs,
          vatID,
        } = data);
        const { xsnapPID } = await createManager(argv.keepWorkerExplicitLoad);
        console.log(
          `manager created from bundle source, worker PID: ${xsnapPID}`,
        );
        fs.writeSync(
          snapshotActivityFd,
          `${JSON.stringify({
            transcriptFile,
            type: 'create',
            xsnapPID,
            vatID,
          })}\n`,
        );
      } else if (data.type === 'heap-snapshot-save') {
        saveSnapshotID = data.snapshotID;

        const savedSnapshots = await Promise.all(workers.map(snapshotWorker));
        saveSnapshotID = null;

        const uniqueSnapshotIDs = new Set(savedSnapshots);
        let divergent = uniqueSnapshotIDs.size > 1;
        if (
          !uniqueSnapshotIDs.has(data.snapshotID) &&
          (divergent || savedSnapshots[0] !== null)
        ) {
          divergent = true;
          snapshotOverrideMap.set(
            data.snapshotID,
            /** @type {string} */ (savedSnapshots[0]),
          );
        }
        if (argv.forcedReloadFromSnapshot) {
          for (const snapshotID of uniqueSnapshotIDs) {
            // eslint-disable-next-line no-await-in-loop
            await loadSnapshot(
              { ...data, snapshotID },
              argv.keepWorkerHashDifference && divergent,
            );
          }
        }
      } else {
        const { transcriptNum, d: delivery, syscalls } = data;
        lastTranscriptNum = transcriptNum;
        if (startTranscriptNum == null) {
          startTranscriptNum = transcriptNum - 1;
        }
        const makeSnapshot =
          argv.forcedSnapshotInterval &&
          (transcriptNum - argv.forcedSnapshotInitial) %
            argv.forcedSnapshotInterval ===
            0;
        // syscalls = [{ d, response }, ..]
        // console.log(`replaying:`);
        // console.log(
        //   `delivery ${transcriptNum} (L ${lineNumber}):`,
        //   JSON.stringify(delivery).slice(0, 200),
        // );
        // for (const s of syscalls) {
        //   // s.response = 'nope';
        //   console.log(
        //     ` syscall:`,
        //     s.response[0],
        //     JSON.stringify(s.d).slice(0, 200),
        //     JSON.stringify(s.response[1]).slice(0, 200),
        //   );
        // }
        const snapshotIDs = await Promise.all(
          workers.map(async workerData => {
            workerData.timeOfLastCommand = performance.now();
            await workerData.manager.replayOneDelivery(
              delivery,
              syscalls,
              transcriptNum,
            );
            updateDeliveryTime(workerData);
            workerData.firstTranscriptNum ??= transcriptNum - 1;
            completeWorkerStep(workerData);
            await workersSynced;

            // console.log(`dr`, dr);

            return makeSnapshot ? snapshotWorker(workerData) : null;
          }),
        );
        const uniqueSnapshotIDs = [...new Set(snapshotIDs)].filter(
          snapshotID => snapshotID != null,
        );

        const divergent = uniqueSnapshotIDs.length !== 1;

        if (makeSnapshot && divergent) {
          const errorMessage = `Snapshot hashes do not match each other: ${uniqueSnapshotIDs.join(
            ', ',
          )}`;
          if (argv.ignoreSnapshotHashDifference) {
            console.warn(errorMessage);
          } else {
            throw new Error(errorMessage);
          }
        }

        if (argv.forcedReloadFromSnapshot) {
          for (const snapshotID of uniqueSnapshotIDs) {
            // eslint-disable-next-line no-await-in-loop
            await loadSnapshot(
              {
                snapshotID,
                vatID,
              },
              argv.keepWorkerHashDifference && divergent,
            );
          }
        }

        const loadSnapshots = [].concat(
          argv.loadSnapshots?.[transcriptNum] || [],
        );
        for (const snapshotID of loadSnapshots) {
          // eslint-disable-next-line no-await-in-loop
          await loadSnapshot(
            {
              snapshotID,
              vatID,
            },
            argv.keepWorkerExplicitLoad ||
              (argv.keepWorkerHashDifference &&
                (loadSnapshots.length > 1 ||
                  !uniqueSnapshotIDs.includes(snapshotID))),
          );
        }
      }
    }
  } finally {
    lines.close();
    fs.closeSync(snapshotActivityFd);
    cleanupSnapStore?.();
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
          console.log(
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

async function run() {
  console.dir(argv, { depth: null });
  if (argv._.length < 1) {
    console.log(`replay-transcript.js transcript.sst`);
    return;
  }
  const [transcriptFile] = argv._;
  console.log(`using transcript ${transcriptFile}`);
  await replay(transcriptFile);
}

run().catch(err => {
  console.log('RUN ERR', err);
  process.exit(process.exitCode || 1);
});
