import path from 'path';
import fs from 'fs';
import process from 'process';
import repl from 'repl';
import util from 'util';

import { makeStatLogger } from '@agoric/stat-logger';
import {
  buildTimer,
  loadSwingsetConfigFile,
  loadBasedir,
  initializeSwingset,
  makeSwingsetController,
} from '@agoric/swingset-vat';
import { buildLoopbox } from '@agoric/swingset-vat/src/devices/loopbox/loopbox.js';
import engineGC from '@agoric/internal/src/lib-nodejs/engine-gc.js';

import { initSwingStore, openSwingStore } from '@agoric/swing-store';
import { makeSlogSender } from '@agoric/telemetry';

import { dumpStore } from './dumpstore.js';
import { auditRefCounts } from './auditstore.js';
import { initEmulatedChain } from './chain.js';
import {
  organizeBenchmarkStats,
  printBenchmarkStats,
  organizeMainStats,
  printMainStats,
  outputStats,
} from './printStats.js';

const log = console.log;

function p(item) {
  return util.inspect(item, false, null, true);
}

function readClock() {
  return process.hrtime.bigint();
}

function usage() {
  log(`
Command line:
  runner [FLAGS...] CMD [{BASEDIR|--} [ARGS...]]

FLAGS may be:
  --resume         - resume execution using existing saved state
  --initonly       - initialize the swingset but exit without running it
  --sqlite         - runs using Sqlite3 as the data store (default)
  --memdb          - runs using the non-persistent in-memory data store
  --usexs          - run vats using the XS engine
  --usebundlecache - cache bundles created by swingset loader
  --dbdir DIR      - specify where the data store should go (default BASEDIR)
  --blockmode      - run in block mode (checkpoint every BLOCKSIZE blocks)
  --blocksize N    - set BLOCKSIZE to N cranks (default 200)
  --logtimes       - log block execution time stats while running
  --logmem         - log memory usage stats after each block
  --logdisk        - log disk space usage stats after each block
  --logstats       - log kernel stats after each block
  --logall         - log kernel stats, block times, memory use, and disk space
  --logtag STR     - tag for stats log file (default "runner")
  --slog FILE      - write swingset slog to FILE
  --teleslog       - transmit a slog feed to the local otel collector
  --forcegc        - run garbage collector after each block
  --batchsize N    - set BATCHSIZE to N cranks (default 200)
  --verbose        - output verbose debugging messages as it runs
  --activityhash   - print out the current activity hash after each crank
  --audit          - audit kernel promise reference counts after each crank
  --dump           - dump a kernel state store snapshot after each crank
  --dumpdir DIR    - place kernel state dumps in directory DIR (default ".")
  --dumptag STR    - prefix kernel state dump filenames with STR (default "t")
  --raw            - perform kernel state dumps in raw mode
  --stats          - print a performance stats report at the end of a run
  --statsfile FILE - output performance stats to FILE as a JSON object
  --benchmark N    - perform an N round benchmark after the initial run
  --sbench FILE    - run a whole-swingset benchmark with the driver vat in FILE
  --chain          - emulate the behavior of the Cosmos-based chain
  --indirect       - launch swingset from a vat instead of launching directly
  --config FILE    - read swingset config from FILE instead of inferring it

CMD is one of:
  help   - print this helpful usage information
  run    - launches or resumes the configured vats, which run to completion.
  batch  - launch or resume, then run BATCHSIZE cranks or until completion
  step   - steps the configured swingset one crank.
  shell  - starts a simple CLI allowing the swingset to be run or stepped or
           interrogated interactively.

BASEDIR is the base directory for locating the swingset's vat definitions and
  for storing the swingset's state.  If BASEDIR is omitted or '--' it defaults
  to, in order of preference:
    - the directory of the benchmark driver, if there is one
    - the directory of the config file, if there is one
    - the current working directory

Any remaining command line args are passed to the swingset's bootstrap vat in
the 'argv' vat parameter.
`);
}

function fail(message, printUsage) {
  log(message);
  if (printUsage) {
    usage();
  }
  process.exit(1);
}

/**
 * In swingset benchmark mode, the configured swingset is loaded indirectly,
 * interposing a benchmark controller vat we provide here as the swingset's
 * bootstrap vat.  In addition, the benchmark author is expected to provide a
 * benchmark driver vat from a file specified on the command line.  This
 * benchmark driver vat is expected to expose the methods `setup` and
 * `runBenchmarkRound`.  The controller vat's `bootstrap` method invokes the
 * swingset's "real" `bootstrap` method and then tells the benchmark driver vat
 * to perform setup for the benchmark.  The controller vat then orchestrates the
 * execution of the directed number of bootstrap rounds.
 *
 * In order to perform the controller interposition and benchmark orchestration,
 * this function generates a new swingset configuration with selective
 * modifications and changes to the original swingset configuration.
 *
 * @param {*} baseConfig  The original configuration being adapted for benchmark use
 * @param {string} swingsetBenchmarkDriverPath  Path to the benchmark driver vat source
 * @param {string[]} bootstrapArgv  Bootstrap args from the swingset-runner command line
 *
 * @returns {*} a new configuration that is a copy of `baseConfig` with modifications applied.
 */
function generateSwingsetBenchmarkConfig(
  baseConfig,
  swingsetBenchmarkDriverPath,
  bootstrapArgv,
) {
  if (baseConfig.vats.benchmarkBootstrap) {
    fail(
      `you can't have a vat named benchmarkBootstrap in a benchmark swingset`,
    );
  }
  if (baseConfig.vats.benchmarkDriver) {
    fail(`you can't have a vat named benchmarkDriver in a benchmark swingset`);
  }
  // eslint-disable-next-line prefer-const
  let { benchmarkDriver, ...baseConfigOptions } = baseConfig;
  if (!benchmarkDriver) {
    benchmarkDriver = {
      sourceSpec: swingsetBenchmarkDriverPath,
    };
  }
  const config = {
    ...baseConfigOptions,
    bootstrap: 'benchmarkBootstrap',
    defaultManagerType: 'local',
    vats: {
      benchmarkBootstrap: {
        sourceSpec: new URL('vat-benchmarkBootstrap.js', import.meta.url)
          .pathname,
        parameters: {
          config: {
            bootstrap: baseConfig.bootstrap,
          },
        },
      },
      benchmarkDriver,
      ...baseConfig.vats,
    },
  };
  if (!config.vats[baseConfig.bootstrap].parameters) {
    config.vats[baseConfig.bootstrap].parameters = {};
  }
  config.vats[baseConfig.bootstrap].parameters.argv = bootstrapArgv;
  return config;
}

function generateIndirectConfig(baseConfig) {
  const config = {
    bootstrap: 'launcher',
    bundles: {},
    vats: {
      launcher: {
        sourceSpec: new URL('vat-launcher.js', import.meta.url).pathname,
        parameters: {
          config: {
            bootstrap: baseConfig.bootstrap,
            vats: {},
          },
        },
      },
    },
  };
  if (baseConfig.vats) {
    for (const vatName of Object.keys(baseConfig.vats)) {
      const baseVat = { ...baseConfig.vats[vatName] };
      let newBundleName = `bundle-${vatName}`;
      if (baseVat.sourceSpec) {
        config.bundles[newBundleName] = { sourceSpec: baseVat.sourceSpec };
        delete baseVat.sourceSpec;
      } else if (baseVat.bundleSpec) {
        config.bundles[newBundleName] = { bundleSpec: baseVat.bundleSpec };
        delete baseVat.bundleSpec;
      } else if (baseVat.bundle) {
        config.bundles[newBundleName] = { bundle: baseVat.bundle };
        delete baseVat.bundle;
      } else if (baseVat.bundleName) {
        newBundleName = baseVat.bundleName;
        config.bundles[newBundleName] = baseConfig.bundles[baseVat.bundleName];
      } else {
        fail(`this can't happen`);
      }
      baseVat.bundleName = newBundleName;
      config.vats.launcher.parameters.config.vats[vatName] = baseVat;
    }
  }
  if (baseConfig.bundles) {
    for (const bundleName of Object.keys(baseConfig.bundles)) {
      config.bundles[bundleName] = baseConfig.bundles[bundleName];
    }
  }
  return config;
}

/* eslint-disable no-use-before-define */

/**
 * Command line utility to run a swingset for development and testing purposes.
 */
export async function main() {
  const argv = process.argv.slice(2);

  let forceReset = true;
  let dbMode = '--sqlite';
  let blockSize = 200;
  let batchSize = 200;
  let blockMode = false;
  let logTimes = false;
  let logMem = false;
  let logDisk = false;
  let logStats = false;
  let logTag = 'runner';
  let slogFile = null;
  let teleslog = false;
  let forceGC = false;
  let verbose = false;
  let doDumps = false;
  let doAudits = false;
  let dumpDir = '.';
  let dumpTag = 't';
  let rawMode = false;
  let shouldPrintStats = false;
  let launchIndirectly = false;
  let benchmarkRounds = 0;
  let configPath = null;
  let statsFile = null;
  let dbDir = null;
  let initOnly = false;
  let useXS = false;
  let useBundleCache = false;
  let activityHash = false;
  let emulateChain = false;
  let swingsetBenchmarkDriverPath = null;

  while (argv[0] && argv[0].startsWith('-')) {
    const flag = argv.shift();
    switch (flag) {
      case '--activityhash':
        activityHash = true;
        break;
      case '--init':
        forceReset = true;
        break;
      case '--resume':
      case '--noinit':
        forceReset = false;
        break;
      case '--initonly':
        forceReset = true;
        initOnly = true;
        break;
      case '--logtimes':
        logTimes = true;
        break;
      case '--logmem':
        logMem = true;
        break;
      case '--logdisk':
        logDisk = true;
        break;
      case '--logstats':
        logStats = true;
        break;
      case '--logall':
        logTimes = true;
        logMem = true;
        logDisk = true;
        logStats = true;
        break;
      case '--logtag':
        logTag = argv.shift();
        break;
      case '--slog':
        slogFile = argv.shift();
        break;
      case '--teleslog':
        teleslog = true;
        break;
      case '--config':
        configPath = argv.shift();
        break;
      case '--forcegc':
        forceGC = true;
        break;
      case '--blockmode':
        blockMode = true;
        break;
      case '--blocksize':
        blockSize = Number(argv.shift());
        break;
      case '--batchsize':
        batchSize = Number(argv.shift());
        break;
      case '--benchmark':
        benchmarkRounds = Number(argv.shift());
        break;
      case '--dump':
        doDumps = true;
        break;
      case '--dumpdir':
        dumpDir = argv.shift();
        doDumps = true;
        break;
      case '--dumptag':
        dumpTag = argv.shift();
        doDumps = true;
        break;
      case '--dbdir':
        dbDir = argv.shift();
        break;
      case '--raw':
        rawMode = true;
        doDumps = true;
        break;
      case '--stats':
        shouldPrintStats = true;
        break;
      case '--statsfile':
        statsFile = argv.shift();
        break;
      case '--indirect':
        launchIndirectly = true;
        break;
      case '--audit':
        doAudits = true;
        break;
      case '--memdb':
      case '--sqlite':
        dbMode = flag;
        break;
      case '--usexs':
      case '--useXS':
        useXS = true;
        break;
      case '--usebundlecache':
      case '--useBundleCache':
        useBundleCache = true;
        break;
      case '--chain':
        emulateChain = true;
        break;
      case '--sbench':
        swingsetBenchmarkDriverPath = argv.shift();
        break;
      case '-v':
      case '--verbose':
        verbose = true;
        break;
      default:
        fail(`invalid flag ${flag}`, true);
    }
  }

  const command = argv.shift();
  if (
    command !== 'run' &&
    command !== 'shell' &&
    command !== 'step' &&
    command !== 'batch' &&
    command !== 'help'
  ) {
    fail(`'${command}' is not a valid runner command`, true);
  }
  if (command === 'help') {
    usage();
    process.exit(0);
  }

  if (forceGC) {
    if (!logMem) {
      log('Warning: --forcegc without --logmem may be a mistake');
    }
  }

  // Prettier demands that the conditional not be parenthesized.  Prettier is wrong.
  // prettier-ignore
  let basedir = (argv[0] === '--' || argv[0] === undefined) ? undefined : argv.shift();
  const bootstrapArgv = argv[0] === '--' ? argv.slice(1) : argv;

  let config;
  await null;
  if (configPath) {
    config = await loadSwingsetConfigFile(configPath);
    if (config === null) {
      fail(`config file ${configPath} not found`);
    }
    if (!basedir) {
      basedir = swingsetBenchmarkDriverPath
        ? path.dirname(swingsetBenchmarkDriverPath)
        : path.dirname(configPath);
    }
  } else {
    if (!basedir) {
      basedir = swingsetBenchmarkDriverPath
        ? path.dirname(swingsetBenchmarkDriverPath)
        : '.';
    }
    config = loadBasedir(basedir);
  }
  if (config.bundleCachePath) {
    const base = new URL(configPath, `file://${process.cwd()}/`);
    config.bundleCachePath = new URL(config.bundleCachePath, base).pathname;
  } else if (useBundleCache) {
    config.bundleCachePath = path.join(basedir, 'bundles');
  }

  const timer = buildTimer();
  config.devices = {
    timer: {
      sourceSpec: timer.srcPath,
    },
  };
  const deviceEndowments = {
    timer: { ...timer.endowments },
  };
  if (config.loopboxSenders) {
    const { loopboxSrcPath, loopboxEndowments } = buildLoopbox('immediate');
    config.devices.loopbox = {
      sourceSpec: loopboxSrcPath,
      parameters: {
        senders: config.loopboxSenders,
      },
    };
    delete config.loopboxSenders;
    deviceEndowments.loopbox = { ...loopboxEndowments };
  }
  if (emulateChain) {
    const bridge = await initEmulatedChain(config, configPath);
    config.devices.bridge = {
      sourceSpec: bridge.srcPath,
    };
    deviceEndowments.bridge = { ...bridge.endowments };
  }
  if (!config.defaultManagerType) {
    if (useXS) {
      config.defaultManagerType = 'xs-worker';
    } else {
      config.defaultManagerType = 'local';
    }
  }
  config.pinBootstrapRoot = true;

  if (swingsetBenchmarkDriverPath) {
    config = generateSwingsetBenchmarkConfig(
      config,
      swingsetBenchmarkDriverPath,
      bootstrapArgv,
    );
  }
  if (launchIndirectly) {
    config = generateIndirectConfig(config);
  }

  let swingStore;
  switch (dbMode) {
    case '--memdb':
      if (dbDir) {
        fail('--dbdir only valid with --sqlite');
      }
      swingStore = initSwingStore(null);
      break;
    case '--sqlite': {
      if (!dbDir) {
        dbDir = basedir;
      }
      const kernelStateDBDir = path.join(dbDir, 'swingset-kernel-state');
      const dbOptions = {};
      if (forceReset) {
        swingStore = initSwingStore(kernelStateDBDir, dbOptions);
      } else {
        swingStore = openSwingStore(kernelStateDBDir, dbOptions);
      }
      break;
    }
    default:
      fail(`invalid database mode ${dbMode}`, true);
  }
  const { kernelStorage, hostStorage } = swingStore;
  const runtimeOptions = {};
  if (verbose) {
    runtimeOptions.verbose = true;
  }
  if (slogFile) {
    runtimeOptions.slogFile = slogFile;
    if (forceReset) {
      try {
        fs.unlinkSync(slogFile);
      } catch (e) {
        if (e.code !== 'ENOENT') {
          fail(`${e}`);
        }
      }
    }
  }
  let slogSender;
  if (teleslog || slogFile) {
    const slogEnv = {
      ...process.env,
      SLOGFILE: slogFile,
    };
    const slogOpts = {
      stateDir: dbDir,
      env: slogEnv,
    };
    if (slogFile) {
      slogEnv.SLOGSENDER = '';
    }
    if (teleslog) {
      const {
        SLOGSENDER: envSlogSender,
        TELEMETRY_SERVICE_NAME = 'agd-cosmos',
        OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318',
      } = process.env;
      const SLOGSENDER = [
        ...(envSlogSender ? envSlogSender.split(',') : []),
        '@agoric/telemetry/src/otel-trace.js',
      ].join(',');
      slogEnv.SLOGSENDER = SLOGSENDER;
      slogEnv.OTEL_EXPORTER_OTLP_ENDPOINT = OTEL_EXPORTER_OTLP_ENDPOINT;
      slogOpts.serviceName = TELEMETRY_SERVICE_NAME;
    }
    slogSender = await makeSlogSender(slogOpts);
    runtimeOptions.slogSender = slogSender;
  }
  let bootstrapResult;
  if (forceReset) {
    bootstrapResult = await initializeSwingset(
      config,
      bootstrapArgv,
      kernelStorage,
      { verbose },
      runtimeOptions,
    );
    await hostStorage.commit();
    if (initOnly) {
      await hostStorage.close();
      return;
    }
  }
  const controller = await makeSwingsetController(
    kernelStorage,
    deviceEndowments,
    runtimeOptions,
  );
  if (benchmarkRounds > 0) {
    // Pin the vat root that will run benchmark rounds so it'll still be there
    // when it comes time to run them.
    controller.pinVatRoot(config.bootstrap);
  }

  let blockNumber = 0;
  let statLogger = null;
  if (logTimes || logMem || logDisk) {
    let headers = ['block', 'steps'];
    if (logTimes) {
      headers.push('btime', 'ctime');
    }
    if (logMem) {
      headers = headers.concat(['rss', 'heapTotal', 'heapUsed', 'external']);
    }
    if (logDisk) {
      headers.push('disk');
    }
    if (logStats) {
      const statNames = Object.keys(controller.getStats());
      headers = headers.concat(statNames);
    }
    statLogger = makeStatLogger(logTag, headers);
  }

  let mainStats;
  let benchmarkStats;

  let crankNumber = 0;
  switch (command) {
    case 'run': {
      await commandRun(0, blockMode);
      break;
    }
    case 'batch': {
      await commandRun(batchSize, blockMode);
      break;
    }
    case 'step': {
      try {
        const steps = await controller.step();
        if (activityHash) {
          log(`activityHash: ${controller.getActivityhash()}`);
        }
        await hostStorage.commit();
        await hostStorage.close();
        log(`runner stepped ${steps} crank${steps === 1 ? '' : 's'}`);
      } catch (err) {
        kernelFailure(err);
      }
      break;
    }
    case 'shell': {
      const cli = repl.start({
        prompt: 'runner> ',
        replMode: repl.REPL_MODE_STRICT,
      });
      cli.on('exit', () => {
        hostStorage.close();
      });
      cli.context.dump2 = () => controller.dump();
      cli.defineCommand('commit', {
        help: 'Commit current kernel state to persistent storage',
        action: async () => {
          await hostStorage.commit();
          log('committed');
          cli.displayPrompt();
        },
      });
      cli.defineCommand('dump', {
        help: 'Dump the kernel tables',
        action: () => {
          const d = controller.dump();
          log('Kernel Table:');
          log(p(d.kernelTable));
          log('Promises:');
          log(p(d.promises));
          log('Run Queue:');
          log(p(d.runQueue));
          cli.displayPrompt();
        },
      });
      cli.defineCommand('block', {
        help: 'Execute a block of <n> cranks, without commit',
        action: async requestedSteps => {
          const steps = await runBlock(requestedSteps, false);
          log(`executed ${steps} cranks in block`);
          cli.displayPrompt();
        },
      });
      cli.defineCommand('benchmark', {
        help: 'Run <n> rounds of the benchmark protocol',
        action: async rounds => {
          const [steps, deltaT] = await runBenchmark(rounds);
          log(`benchmark ${rounds} rounds, ${steps} cranks in ${deltaT} ns`);
          cli.displayPrompt();
        },
      });
      cli.defineCommand('run', {
        help: 'Crank until the run queue is empty, without commit',
        action: async () => {
          const [steps, deltaT] = await runBatch(0, false);
          log(`ran ${steps} cranks in ${deltaT} ns`);
          cli.displayPrompt();
        },
      });
      cli.defineCommand('step', {
        help: 'Step the swingset one crank, without commit',
        action: async () => {
          await null;
          try {
            const steps = await controller.step();
            log(steps ? 'stepped one crank' : "didn't step, queue is empty");
            cli.displayPrompt();
          } catch (err) {
            kernelFailure(err);
          }
        },
      });
      break;
    }
    default:
      fail(`invalid command ${command}`);
  }
  if (statLogger) {
    statLogger.close();
  }
  if (slogSender) {
    await slogSender.forceFlush();
  }
  await controller.shutdown();

  function getCrankNumber() {
    return Number(kernelStorage.kvStore.get('crankNumber'));
  }

  function kernelStateDump() {
    const dumpPath = `${dumpDir}/${dumpTag}${crankNumber}`;
    dumpStore(kernelStorage, dumpPath, rawMode);
  }

  async function runBenchmark(rounds) {
    const cranksPre = getCrankNumber();
    const rawStatsPre = controller.getStats();
    let totalSteps = 0;
    let totalDeltaT = 0n;
    await null;
    for (let i = 0; i < rounds; i += 1) {
      const roundResult = controller.queueToVatRoot(
        config.bootstrap,
        'runBenchmarkRound',
        [],
        'ignore',
      );
      const [steps, deltaT] = await runBatch(0, true);
      const status = controller.kpStatus(roundResult);
      if (status === 'unresolved') {
        log(`benchmark round ${i + 1} did not finish`);
      } else {
        const resolution = JSON.stringify(controller.kpResolution(roundResult));
        log(`benchmark round ${i + 1} ${status}: ${resolution}`);
      }
      totalSteps += steps;
      totalDeltaT += deltaT;
    }
    const cranksPost = getCrankNumber();
    const rawStatsPost = controller.getStats();
    benchmarkStats = organizeBenchmarkStats(
      rawStatsPre,
      rawStatsPost,
      cranksPost - cranksPre,
      rounds,
    );
    printBenchmarkStats(benchmarkStats);
    return [totalSteps, totalDeltaT];
  }

  async function runBlock(requestedSteps, doCommit) {
    const blockStartTime = readClock();
    let actualSteps = 0;
    if (verbose) {
      log('==> running block');
    }
    controller.writeSlogObject({
      type: 'cosmic-swingset-run-start',
      blockHeight: blockNumber,
      blockTime: blockStartTime,
    });
    await null;
    while (requestedSteps > 0) {
      requestedSteps -= 1;
      try {
        const stepped = await controller.step();
        if (stepped < 1) {
          break;
        }
        crankNumber += stepped;
        actualSteps += stepped;
      } catch (err) {
        kernelFailure(err);
      }
      if (doDumps) {
        kernelStateDump();
      }
      if (doAudits) {
        auditRefCounts(kernelStorage.kvStore);
      }
      if (activityHash) {
        log(`activityHash: ${controller.getActivityhash()}`);
      }
      if (verbose) {
        log(`===> end of crank ${crankNumber - 1}`);
      }
    }
    const commitStartTime = readClock();
    if (doCommit) {
      await hostStorage.commit();
    }
    const blockEndTime = readClock();
    controller.writeSlogObject({
      type: 'kernel-stats',
      stats: controller.getStats(),
    });
    controller.writeSlogObject({
      type: 'cosmic-swingset-run-finish',
      blockHeight: blockNumber,
      blockTime: blockEndTime,
    });
    if (forceGC) {
      engineGC();
    }
    if (statLogger) {
      blockNumber += 1;
      let data = [blockNumber, actualSteps];
      if (logTimes) {
        data.push(blockEndTime - blockStartTime);
        data.push(blockEndTime - commitStartTime);
      }
      if (logMem) {
        const mem = process.memoryUsage();
        data = data.concat([
          mem.rss,
          mem.heapTotal,
          mem.heapUsed,
          mem.external,
        ]);
      }
      if (logDisk) {
        const diskUsage = dbMode === '--sqlite' ? hostStorage.diskUsage() : 0;
        data.push(diskUsage);
      }
      if (logStats) {
        data = data.concat(Object.values(controller.getStats()));
      }
      statLogger.log(data);
    }
    if (activityHash) {
      log(`activityHash: ${controller.getActivityhash()}`);
    }
    return actualSteps;
  }

  async function runBatch(stepLimit, doCommit) {
    const startTime = readClock();
    let totalSteps = 0;
    let steps;
    const runAll = stepLimit === 0;
    await null;
    do {
      steps = await runBlock(blockSize, doCommit);
      totalSteps += steps;
      stepLimit -= steps;
    } while ((runAll || stepLimit > 0) && steps >= blockSize);
    return [totalSteps, readClock() - startTime];
  }

  function kernelFailure(err) {
    log(`kernel failure in crank ${crankNumber}: ${err}`, err);
    process.exit(1);
  }

  async function commandRun(stepLimit, runInBlockMode) {
    if (doDumps) {
      kernelStateDump();
    }
    if (doAudits) {
      auditRefCounts(kernelStorage.kvStore);
    }

    let [totalSteps, deltaT] = await runBatch(stepLimit, runInBlockMode);
    if (!runInBlockMode) {
      await hostStorage.commit();
    }
    const cranks = getCrankNumber();
    const rawStats = controller.getStats();
    mainStats = organizeMainStats(rawStats, cranks);
    if (shouldPrintStats) {
      printMainStats(mainStats);
    }
    if (benchmarkRounds > 0) {
      const [moreSteps, moreDeltaT] = await runBenchmark(benchmarkRounds);
      totalSteps += moreSteps;
      deltaT += moreDeltaT;
    }
    if (bootstrapResult) {
      const status = controller.kpStatus(bootstrapResult);
      if (status === 'unresolved') {
        log('bootstrap result still pending');
      } else if (status === 'unknown') {
        log(`bootstrap result ${bootstrapResult} is unknown to the kernel`);
        bootstrapResult = null;
      } else {
        const resolution = JSON.stringify(
          controller.kpResolution(bootstrapResult),
        );
        log(`bootstrap result ${status}: ${resolution}`);
        bootstrapResult = null;
      }
    }
    await hostStorage.close();
    if (statsFile) {
      outputStats(statsFile, mainStats, benchmarkStats);
    }
    if (totalSteps) {
      const per = deltaT / BigInt(totalSteps);
      log(
        `runner finished ${totalSteps} cranks in ${deltaT} ns (${per}/crank)`,
      );
    } else {
      log(`runner finished replay in ${deltaT} ns`);
    }
  }
}
