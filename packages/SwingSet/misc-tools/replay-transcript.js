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
import bundleSource from '@endo/bundle-source';
import { makeMeasureSeconds } from '@agoric/internal';
import { makeSnapStore } from '@agoric/swing-store';
import { waitUntilQuiescent } from '../src/lib-nodejs/waitUntilQuiescent.js';
import { makeStartXSnap } from '../src/controller/controller.js';
import { makeXsSubprocessFactory } from '../src/kernel/vat-loader/manager-subprocess-xsnap.js';
import { makeLocalVatManagerFactory } from '../src/kernel/vat-loader/manager-local.js';
import { makeNodeSubprocessFactory } from '../src/kernel/vat-loader/manager-subprocess-node.js';
import { startSubprocessWorker } from '../src/lib-nodejs/spawnSubprocessWorker.js';
import { requireIdentical } from '../src/kernel/vat-loader/transcript.js';
import { makeDummyMeterControl } from '../src/kernel/dummyMeterControl.js';
import { makeGcAndFinalize } from '../src/lib-nodejs/gc-and-finalize.js';
import engineGC from '../src/lib-nodejs/engine-gc.js';

const pipe = promisify(pipeline);

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
  default: {
    absoluteSdkPath: '',
    startXsnapWorkerPath: '',
    loadXsnapWorkerPath: '',
    rebuildBundles: false,
    ignoreSnapshotHashDifference: true,
    ignoreConcurrentWorkerDivergences: true,
    forcedSnapshotInitial: 2,
    forcedSnapshotInterval: 1000,
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

if (argv.keepAllSnapshots && argv.keepNoSnapshots) {
  throw new Error(
    `Mutually exclusive options configured: 'keepAllSnapshots' and 'keepNoSnapshots'`,
  );
}

for (const xsnapWorkerPathArg of [
  'startXsnapWorkerPath',
  'loadXsnapWorkerPath',
]) {
  const xsnapWorkerPath = argv[xsnapWorkerPathArg];
  if (!xsnapWorkerPath) continue; // eslint-disable-line no-continue
  const sdkRoot = new URL('../../../', import.meta.url);
  const sdkRelativeWorkerPath = fileURLToPath(
    new URL(xsnapWorkerPath, sdkRoot),
  );
  const cwdRelativeWorkerPath = path.resolve(xsnapWorkerPath);
  if (fs.existsSync(sdkRelativeWorkerPath)) {
    argv[xsnapWorkerPathArg] = sdkRelativeWorkerPath;
  } else if (fs.existsSync(cwdRelativeWorkerPath)) {
    argv[xsnapWorkerPathArg] = cwdRelativeWorkerPath;
  } else {
    throw new Error(
      `Couldn't resolve path "${xsnapWorkerPath}" for argument "${xsnapWorkerPathArg}"`,
    );
  }
}

/** @type {(filename: string) => Promise<string>} */
async function fileHash(filename) {
  const hash = createHash('sha256');
  const input = fs.createReadStream(filename);
  await pipe(input, hash);
  return hash.digest('hex');
}

function makeSnapStoreIO() {
  return {
    createReadStream: fs.createReadStream,
    createWriteStream: fs.createWriteStream,
    fsync: fs.fsync,
    measureSeconds: makeMeasureSeconds(performance.now),
    open: fs.promises.open,
    rename: fs.promises.rename,
    resolve: path.resolve,
    stat: fs.promises.stat,
    tmpFile,
    tmpName,
    unlink: fs.promises.unlink,
  };
}

async function makeBundles() {
  const controllerUrl = new URL(
    `${
      argv.absoluteSdkPath ? `${argv.absoluteSdkPath}/packages/SwingSet` : '..'
    }/src/controller/initializeSwingset.js`,
    import.meta.url,
  );
  const srcGE = async rel =>
    bundleSource(new URL(rel, controllerUrl).pathname, {
      format: 'nestedEvaluate',
    });
  const lockdown = await srcGE(
    '../supervisors/subprocess-xsnap/lockdown-subprocess-xsnap.js',
  );
  const supervisor = await srcGE(
    '../supervisors/subprocess-xsnap/supervisor-subprocess-xsnap.js',
  );
  fs.writeFileSync('lockdown-bundle', JSON.stringify(lockdown));
  fs.writeFileSync('supervisor-bundle', JSON.stringify(supervisor));
  console.log(`xs bundles written`);
}

// relative timings:
// 3.8s v8-false, 27.5s v8-gc
// 10.8s xs-no-gc, 15s xs-gc
/** @type {import('../src/types-external.js').ManagerType} */
const worker = 'xs-worker';

async function replay(transcriptFile) {
  let vatID; // we learn this from the first line of the transcript
  /** @type {import('../src/types-external.js').VatManagerFactory} */
  let factory;

  let loadSnapshotID = null;
  let saveSnapshotID = null;
  let lastTranscriptNum;
  let startTranscriptNum;
  const snapshotOverrideMap = new Map();

  const snapshotActivityFd = fs.openSync('snapshot-activity.jsonl', 'a');

  const fakeKernelKeeper =
    /** @type {import('../src/types-external.js').KernelKeeper} */ ({
      provideVatKeeper: _vatID =>
        /** @type {import('../src/types-external.js').VatKeeper} */ (
          /** @type {Partial<import('../src/types-external.js').VatKeeper>} */ ({
            addToTranscript: () => {},
            getLastSnapshot: () =>
              loadSnapshotID && { snapshotID: loadSnapshotID },
          })
        ),
      getRelaxDurabilityRules: () => false,
    });

  const kernelSlog =
    /** @type {import('../src/types-external.js').KernelSlog} */ (
      /** @type {Partial<import('../src/types-external.js').KernelSlog>} */ ({
        write() {},
        delivery: () => () => undefined,
        syscall: () => () => undefined,
      })
    );

  const snapStore = argv.useCustomSnapStore
    ? /** @type {SnapStore} */ ({
        async save(saveRaw) {
          const snapFile = `${saveSnapshotID || 'unknown'}.xss`;
          await saveRaw(snapFile);
          const hash = await fileHash(snapFile);
          const filePath = `${hash}.xss`;
          await fs.promises.rename(snapFile, filePath);
          return { hash, filePath };
        },
        async load(hash, loadRaw) {
          const snapFile = `${hash}.xss`;
          return loadRaw(snapFile);
        },
      })
    : makeSnapStore(process.cwd(), makeSnapStoreIO());
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
   *  manager: import('../src/types-external.js').VatManager;
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
  /** @type {WorkerData[]} */
  const workers = [];

  if (worker === 'xs-worker') {
    // eslint-disable-next-line no-constant-condition
    if (argv.rebuildBundles) {
      console.log(`creating xsnap helper bundles`);
      await makeBundles();
      console.log(`xsnap helper bundles created`);
    }
    const bundles = [
      JSON.parse(fs.readFileSync('lockdown-bundle', 'utf-8')),
      JSON.parse(fs.readFileSync('supervisor-bundle', 'utf-8')),
    ];
    const env = /** @type {Record<string, string>} */ ({});
    if (argv.recordXsnapTrace) {
      env.XSNAP_TEST_RECORD = process.cwd();
    }
    if (argv.useXsnapDebug) {
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
    const startXSnap = makeStartXSnap(bundles, {
      snapStore,
      env,
      spawn: capturePIDSpawn,
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
  } else if (worker === 'node-subprocess') {
    // this worker type cannot do blocking syscalls like vatstoreGet, so it's
    // kind of useless for vats that use virtual objects
    function startSubprocessWorkerNode() {
      const supercode = new URL(
        '../src/supervisors/subprocess-node/supervisor-subprocess-node.js',
        import.meta.url,
      ).pathname;
      return startSubprocessWorker(process.execPath, ['-r', 'esm', supercode]);
    }
    factory = makeNodeSubprocessFactory({
      startSubprocessWorker: startSubprocessWorkerNode,
      kernelKeeper: fakeKernelKeeper,
      kernelSlog,
      testLog,
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
    const transcriptModule = await import(
      '../src/kernel/vat-loader/transcript.js'
    );

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

    const { requireIdenticalExceptStableVCSyscalls } = transcriptModule;

    if (
      typeof transcriptModule.extraSyscall === 'symbol' &&
      typeof transcriptModule.missingSyscall === 'symbol'
    ) {
      return [
        requireIdenticalExceptStableVCSyscalls,
        transcriptModule.extraSyscall,
        transcriptModule.missingSyscall,
        syscallRE,
        true,
      ];
    }

    const dynamicExtraSyscall = requireIdenticalExceptStableVCSyscalls(
      'vat0',
      ['vatstoreGet', 'vc.0.|label'],
      ['vatstoreGet', 'ignoreExtraSyscall'],
    );
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
    const newWorkersSynced = stepsCompleted.then(
      workers.length > 0
        ? () => {
            if (workersSynced === newWorkersSynced) {
              updateWorkersSynced();
              analyzeSyscallResults();
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

  /** @type {Map<string, VatSyscallResult | undefined>} */
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
   * @returns {import('../src/kernel/vat-loader/transcript.js').CompareSyscalls<boolean>}
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

        if (error === extraSyscall && !argv.skipExtraVcSyscalls) {
          return new Error('Extra syscall disallowed');
        }
      }

      const newSyscallKind = newSyscall[0];

      if (error === missingSyscall && !argv.simulateVcSyscalls) {
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
      const finish = () => {
        workerData.timeOfLastCommand = performance.now();
        return result;
      };
      if (argv.synchronizeSyscalls && result !== missingSyscall) {
        completeWorkerStep(workerData);
        return workersSynced.then(finish);
      } else {
        return finish();
      }
    };
    return compareSyscalls;
  };

  let vatParameters;
  let vatSourceBundle;

  /** @param {boolean} keep */
  const createManager = async keep => {
    let explicitWorkerPath;
    if (worker === 'xs-worker') {
      if (loadSnapshotID && argv.loadXsnapWorkerPath) {
        explicitWorkerPath = argv.loadXsnapWorkerPath;
      } else if (!loadSnapshotID && argv.startXsnapWorkerPath) {
        explicitWorkerPath = argv.startXsnapWorkerPath;
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
      /** @type {import('../src/types-external.js').ManagerOptions} */ (
        /** @type {Partial<import('../src/types-external.js').ManagerOptions>} */ ({
          sourcedConsole: console,
          vatParameters,
          compareSyscalls: makeCompareSyscalls(workerData),
          useTranscript: true,
        })
      );
    workerData.manager = await factory.createFromBundle(
      vatID,
      vatSourceBundle,
      managerOptions,
      {},
      vatSyscallHandler,
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
      releaseLock();
    }
  };

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
        ({ vatParameters, vatSourceBundle } = data);
        vatID = data.vatID;
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

        /** @param {WorkerData} workerData */
        const doWorkerSnapshot = async workerData => {
          const { manager, xsnapPID, firstTranscriptNum } = workerData;
          if (!manager?.makeSnapshot) return null;
          const { hash, rawSaveSeconds } = await manager.makeSnapshot(
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
          if (hash !== saveSnapshotID) {
            const errorMessage = `Snapshot hash does not match. ${hash} !== ${saveSnapshotID} for worker PID ${xsnapPID} (start delivery ${firstTranscriptNum})`;
            if (argv.ignoreSnapshotHashDifference) {
              console.warn(errorMessage);
            } else {
              throw new Error(errorMessage);
            }
          } else {
            console.log(
              `made snapshot ${hash} of worker PID ${xsnapPID} (start delivery ${firstTranscriptNum}).\n    Save time = ${
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
        };
        const savedSnapshots = await (argv.useCustomSnapStore
          ? workers.reduce(
              async (hashes, workerData) => [
                ...(await hashes),
                await doWorkerSnapshot(workerData),
              ],
              Promise.resolve(/** @type {string[]} */ ([])),
            )
          : Promise.all(workers.map(doWorkerSnapshot)));
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

        if (
          !argv.useCustomSnapStore &&
          (argv.keepNoSnapshots || (!divergent && !argv.keepAllSnapshots))
        ) {
          for (const snapshotID of uniqueSnapshotIDs) {
            if (snapshotID) {
              snapStore.prepareToDelete(snapshotID);
            }
          }
          await snapStore.commitDeletes(true);
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
        const snapshotData = await Promise.all(
          workers.map(async workerData => {
            const { manager, xsnapPID } = workerData;
            workerData.timeOfLastCommand = performance.now();
            await manager.replayOneDelivery(delivery, syscalls, transcriptNum);
            updateDeliveryTime(workerData);
            workerData.firstTranscriptNum ??= transcriptNum - 1;
            completeWorkerStep(workerData);
            await workersSynced;

            // console.log(`dr`, dr);

            // enable this to write periodic snapshots, for #5975 leak
            if (makeSnapshot && manager.makeSnapshot) {
              const { hash: snapshotID, rawSaveSeconds } =
                await manager.makeSnapshot(snapStore);
              fs.writeSync(
                snapshotActivityFd,
                `${JSON.stringify({
                  transcriptFile,
                  type: 'save',
                  xsnapPID,
                  vatID,
                  transcriptNum,
                  snapshotID,
                })}\n`,
              );
              console.log(
                `made snapshot ${snapshotID} after delivery ${transcriptNum} to worker PID ${xsnapPID} (start delivery ${
                  workerData.firstTranscriptNum
                }).\n    Save time = ${
                  Math.round(rawSaveSeconds * 1000) / 1000
                }s. Delivery time since last snapshot ${
                  Math.round(workerData.deliveryTimeSinceLastSnapshot) / 1000
                }s. Up ${
                  transcriptNum - workerData.firstTranscriptNum
                } deliveries.`,
              );
              workerData.deliveryTimeSinceLastSnapshot = 0;
              return { snapshotID, workerData };
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
          if (argv.ignoreSnapshotHashDifference) {
            console.warn(errorMessage);
          } else {
            throw new Error(errorMessage);
          }
        }

        if (argv.forcedReloadFromSnapshot) {
          let reloadSnapshotIDs = new Set(uniqueSnapshotIDs);
          if (
            !argv.keepWorkerHashDifference &&
            uniqueSnapshotIDs.length > argv.keepWorkerRecent
          ) {
            reloadSnapshotIDs = new Set(
              snapshotData
                .filter(data => data && data.workerData.keep)
                .map(data => data?.snapshotID),
            );
            for (const data of snapshotData.reverse()) {
              if (reloadSnapshotIDs.size >= argv.keepWorkerRecent) break;
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

        if (
          !argv.useCustomSnapStore &&
          (argv.keepNoSnapshots || (!divergent && !argv.keepAllSnapshots))
        ) {
          for (const snapshotID of uniqueSnapshotIDs) {
            if (snapshotID) {
              snapStore.prepareToDelete(snapshotID);
            }
          }
          await snapStore.commitDeletes(true);
        }
      }
    }
  } finally {
    lines.close();
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
