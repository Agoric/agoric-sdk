import process from 'node:process';
import fs from 'node:fs';

import '@endo/init/pre-bundle-source.js';
import '@endo/init';

import { Fail } from '@agoric/assert';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { makeAgoricNamesRemotesFromFakeStorage } from '@agoric/vats/tools/board-utils.js';
import { makeStandaloneSwingsetTestKit } from './supports.js';
import { makeWalletFactoryDriver } from './drivers.js';

// When I was a child my family took a lot of roadtrips around California to go
// camping and backpacking and so on.  It was not uncommon in those days (nor is
// it uncommon today) to encounter points of historical interest alongside the
// road.  These would invariably be indicated by the presence of a roadside sign
// saying something like "Historical Landmark 500 ft", followed 500 feet later
// by a pulloff with a stone pedestal with a bronze plaque on it describing
// whatever the heck it was.  At one point we passed one of these and as
// pedantic 10 year olds are wont to do I pointed out to my parents that it was
// the thing of interest itself that was the historical landmark, and that the
// stone pedestal with the bronze plaque on it was not the historical landmark
// but was in fact an historical landmark marker.  It then followed that the
// sign beside the road indicating that one of these was coming up was thus an
// historical landmark marker marker.  I further mused that since these signs
// were clearly not hand painted, somewhere in the bowels of Caltrans there had
// to be a machine which produced these signs, and that machine would be an
// historical landmark marker marker maker.  And, of course, somewhere in the
// world there had to be a company that manufactured these machines (since every
// state would need at least one) and that company would then be an historical
// landmark marker marker maker maker.  I have no idea where in this naming
// taxonomy the name of this module should sit, but it's probably somewhere.

/**
 * The benchmark context object.  The benchmarkerator provides this to
 * benchmarks when they run.
 *
 * @typedef {{
 *    options: Record<string, string>,
 *    argv: string[],
 *    actors: Record<string, import('./drivers.js').SmartWalletDriver>,
 *    label?: string,
 *    rounds?: number,
 *    config?: Record<string, unknown>,
 * }} BenchmarkContext
 *
 * BenchmarkContext:
 *  // Named options from the command line
 *  options: Record<string, string>,
 *
 *  // Other unparsed args from the command line
 *  argv: string[],
 *
 *  // Wallet drivers for the various personae that exist in the test
 *  // environment.  Currently present are 'gov1', 'gov2', and 'gov3' (the
 *  // governance committee); 'atom1' and 'atom2' (ersatz ATOM-USD price feed
 *  // oracles); and 'alice', 'bob', and 'carol' (arbitrary users to participate
 *  // in interactions being exercized)
 *  actors: Record<string, SmartWalletDriver>,
 *
 *  // The label string for the benchmark currently being executed
 *  label: string,
 *
 *  // The number of rounds of this benchmark that will be executed
 *  rounds: number,
 *
 *  // Optional, benchmark-specific configuration information provided by the
 *  // benchmark's `setup` method
 *  config?: Record<string, unknown>,
 *
 *
 * The benchmark object.  The benchmark author supplies this.
 *
 * @typedef {{
 *    setup?: (context: BenchmarkContext) => Promise<Record<string, unknown> | undefined>,
 *    executeRound: (context: BenchmarkContext, round: number) => Promise<void>,
 *    finish?: (context: BenchmarkContext) => Promise<void>,
 *    rounds?: number,
 * }} Benchmark
 *
 * Benchmark:
 *   // Optional setup method: do whatever pre-run setup you need to do.  If you
 *   // return a record, it will be included as the `config` property of the
 *   // benchmark context parameter of subsequent calls into the benchmark object.
 *   setup?: (context: BenchmarkContext) => Promise<Record<string, unknown> | undefined>,
 *
 *   // Run one round of the benchmark
 *   executeRound: (context: BenchmarkContext, round: number) => Promise<void>,
 *
 *   // Optional finish method: do any post-run teardown you need to clean things up.
 *   // Called after all rounds have executed.
 *   finish?: (context: BenchmarkContext) => Promise<void>,
 *
 *   // The number of rounds that will be run if not overridden on the command line.
 *   // Defaults to 1 if not specified.
 *   rounds?: number,
 *
 *
 * The benchmarkerator object.  The benchmarkerator framework supplies this.
 *
 * @typedef {{
 *    addBenchmark: (label: string, benchmark: Benchmark) => void,
 *    run: (name?: string) => Promise<void>,
 * }} Benchmarkerator
 */

const log = console.log;

const argv = process.argv.slice(2);

let defaultRounds = 1;
let verbose = false;
let help = false;
let dump = false;
let defaultManagerType = 'xs-worker';
const options = {};
const benchmarkPatts = [];

const readClock = () => process.hrtime.bigint();

const usage = () => {
  log(`
${process.argv[0]} ${process.argv[1]} [FLAGS] [ARGS...]

FLAGS may be:
  -r N
  --rounds N       - execute N rounds of each benchmark by default

  -b PATT
  --benchmark PATT - only execute benchmarks matching PATT (may be specified more than once)

  -v
  --verbose        - output verbose debugging messages it runs

  -o NAME VAL
  --option NAME VAL - set named option NAME to VAL

  -l
  --local          - use the 'local' vat manager (instead of 'xs-worker')
                     (less realistic perf numbers but way faster and much easier to debug)

  -d
  --dump           - output JSON-formatted benchmark data to a file

  -h
  --help           - output this helpful usage information and then exit

additional ARGS are passed to the benchmark in the context.argv array
`);
};

const fail = (message, printUsage) => {
  log(message);
  if (printUsage) {
    usage();
  }
  process.exit(1);
};

let stillScanningArgs = true;
while (argv[0] && argv[0].startsWith('-') && stillScanningArgs) {
  const flag = argv.shift();
  switch (flag) {
    case '-r':
    case '--rounds':
      defaultRounds = Number(argv.shift());
      break;
    case '-b':
    case '--benchmark':
      benchmarkPatts.push(argv.shift());
      break;
    case '-v':
    case '--verbose':
      verbose = true;
      break;
    case '-d':
    case '--dump':
      dump = true;
      break;
    case '-l':
    case '--local':
      defaultManagerType = 'local';
      break;
    case '-?':
    case '-h':
    case '--help':
      help = true;
      break;
    case '-o':
    case '--option': {
      const optionName = argv.shift();
      const optionValue = argv.shift();
      options[optionName] = optionValue;
      break;
    }
    case '--':
      stillScanningArgs = false;
      break;
    default:
      fail(`invalid flag ${flag}`, true);
      break;
  }
}

harden(options);

if (help) {
  usage();
  process.exit(0);
}

/**
 * Test if a given benchmark should be included in the benchmarks that get run.
 *
 * @param {string} label  The label of the benchmark in question
 *
 * @returns {boolean} true iff the benchmark should be run this time through.
 */
const shouldIncludeBenchmark = label => {
  if (benchmarkPatts.length === 0) {
    return true;
  }
  for (const patt of benchmarkPatts) {
    if (label.match(patt)) {
      return true;
    }
  }
  return false;
};

/**
 * Test if a given kernel stats key is one of the main keys or a subsidiary key.
 *
 * @param {string} key  The key in question
 *
 * @returns {boolean} true iff the key is one of the main keys.
 */
const isMainKey = key =>
  !key.endsWith('Max') && !key.endsWith('Up') && !key.endsWith('Down');

/**
 * Return a string representation of a number with 3 digits of precision to the
 * right of the decimal point -- unless it's an integer, in which case, in the
 * interest of visual clarity, replace the fractional part with spaces.
 *
 * @param {number} n  The number to format
 *
 * @returns {string} a prettily formatted representation of `n`
 */
const pn = n => {
  const str = n.toFixed(3);
  if (str.endsWith('.000')) {
    return `${str.substring(0, str.length - 4)}    `;
  } else {
    return str;
  }
};

const printSetupStats = stats => {
  const w1 = 32;
  const h1 = `${'Stat'.padEnd(w1)}`;
  const d1 = `${''.padEnd(w1, '-')}`;

  const w2 = 9;
  const h2 = `${'Value'.padStart(w2)}`;
  const d2 = ` ${''.padStart(w2 - 1, '-')}`;

  const w3 = 9;
  const h3 = `${'Incs'.padStart(w3)}`;
  const d3 = ` ${''.padStart(w3 - 1, '-')}`;

  const w4 = 9;
  const h4 = `${'Decs'.padStart(w4)}`;
  const d4 = ` ${''.padStart(w4 - 1, '-')}`;

  const w5 = 9;
  const h5 = `${'MaxValue'.padStart(w5)}`;
  const d5 = ` ${''.padStart(w5 - 1, '-')}`;

  const w6 = 8;
  const h6 = ` ${'PerCrank'.padStart(w6)}`;
  const d6 = ` ${''.padStart(w6, '-')}`;

  const perTag = stats.timePerCrank
    ? ` (${stats.timePerCrank.toFixed(3)}/crank)`
    : '';
  log(`${stats.cranks} cranks in ${stats.elapsedTime}ns${perTag}`);
  log(`${h1} ${h2} ${h3} ${h4} ${h5} ${h6}`);
  log(`${d1} ${d2} ${d3} ${d4} ${d5} ${d6}`);

  const data = stats.data;
  for (const [key, entry] of Object.entries(data)) {
    const col1 = `${key.padEnd(w1)}`;

    const col2 = `${String(entry.value).padStart(w2)}`;

    const v3 = entry.up !== undefined ? entry.up : '';
    const col3 = `${String(v3).padStart(w3)}`;

    const v4 = entry.down !== undefined ? entry.down : '';
    const col4 = `${String(v4).padStart(w4)}`;

    const v5 = entry.max !== undefined ? entry.max : '';
    const col5 = `${String(v5).padStart(w5)}`;

    const col6 = `${pn(entry.value / stats.cranks).padStart(w6)}`;

    log(`${col1} ${col2} ${col3} ${col4} ${col5}  ${col6}`);
  }
};

const organizeSetupStats = (rawStats, elapsedTime, cranks) => {
  const stats = {
    elapsedTime,
    cranks,
    timePerCrank: cranks ? elapsedTime / cranks : 0,
    data: {},
  };
  for (const [key, value] of Object.entries(rawStats)) {
    if (isMainKey(key)) {
      const upKey = `${key}Up`;
      const downKey = `${key}Down`;
      const maxKey = `${key}Max`;
      stats.data[key] = {
        value,
        up: rawStats[upKey],
        down: rawStats[downKey],
        max: rawStats[maxKey],
        perCrank: value / cranks,
      };
    }
  }
  return stats;
};

const printBenchmarkStats = stats => {
  const w1 = 32;
  const h1 = `${'Stat'.padEnd(w1)}`;
  const d1 = `${''.padEnd(w1, '-')}`;

  const w2 = 6;
  const h2 = `${'Delta'.padStart(w2)}`;
  const d2 = ` ${''.padStart(w2 - 1, '-')}`;

  const w3 = 10;
  const h3 = `${'PerRound'.padStart(w3)}`;
  const d3 = ` ${''.padStart(w3 - 1, '-')}`;

  const cpr = pn(stats.cranksPerRound).trim();
  log(
    `${stats.cranks} cranks over ${stats.rounds} rounds (${cpr} cranks/round)`,
  );
  if (stats.cranks > 0) {
    log(
      // prettier-ignore
      `${stats.cranks} cranks in ${stats.elapsedTime}ns (${stats.timePerCrank.toFixed(3)}/crank})`,
    );
  }
  log(
    // prettier-ignore
    `${stats.rounds} rounds in ${stats.elapsedTime}ns (${stats.timePerRound.toFixed(3)}/round})`,
  );
  log(`${h1} ${h2} ${h3}`);
  log(`${d1} ${d2} ${d3}`);

  const data = stats.data;
  for (const [key, entry] of Object.entries(data)) {
    const col1 = `${key.padEnd(w1)}`;
    const col2 = `${String(entry.delta).padStart(w2)}`;
    const col3 = `${pn(entry.deltaPerRound).padStart(w3)}`;
    log(`${col1} ${col2} ${col3}`);
  }
};

const organizeRoundsStats = (
  rawBefore,
  rawAfter,
  elapsedTime,
  cranks,
  rounds,
) => {
  const stats = {
    elapsedTime,
    cranks,
    rounds,
    timePerCrank: cranks ? elapsedTime / cranks : 0,
    timePerRound: elapsedTime / rounds,
    cranksPerRound: cranks / rounds,
    data: {},
  };

  // Note: the following assumes rawBefore and rawAfter have the same keys.
  for (const [key, value] of Object.entries(rawBefore)) {
    if (isMainKey(key)) {
      const delta = rawAfter[key] - value;
      stats.data[key] = {
        delta,
        deltaPerRound: delta / rounds,
      };
    }
  }
  return stats;
};

/**
 * Produce a new benchmarkerator object.
 *
 * Note: Most likely you do not need to use this, as this the benchmarkerator is
 * typically a singleton.  But we provide it just in case...
 *
 * @returns {Promise<Benchmarkerator>}
 */
export const makeBenchmarkerator = async () => {
  const benchmarks = new Map();

  const setupStartTime = readClock();
  const swingsetTestKit = await makeStandaloneSwingsetTestKit(undefined, {
    defaultManagerType,
    verbose,
  });
  const {
    runUtils,
    storage: chainStorage,
    shutdown,
    controller,
    getCrankNumber,
  } = swingsetTestKit;
  const { EV } = runUtils;

  // Wait for ATOM to make it into agoricNames
  // E(bootstrap).consumeItem('vaultFactoryKit');
  await EV.vat('bootstrap').consumeItem('vaultFactoryKit');

  // has to be late enough for agoricNames data to have been published
  const agoricNamesRemotes =
    makeAgoricNamesRemotesFromFakeStorage(chainStorage);

  const walletFactoryDriver = await makeWalletFactoryDriver(
    runUtils,
    chainStorage,
    agoricNamesRemotes,
  );

  const actors = {
    gov1: await walletFactoryDriver.provideSmartWallet(
      'agoric1ldmtatp24qlllgxmrsjzcpe20fvlkp448zcuce',
    ),
    gov2: await walletFactoryDriver.provideSmartWallet(
      'agoric140dmkrz2e42ergjj7gyvejhzmjzurvqeq82ang',
    ),
    gov3: await walletFactoryDriver.provideSmartWallet(
      'agoric1w8wktaur4zf8qmmtn3n7x3r0jhsjkjntcm3u6h',
    ),
    atom1: await walletFactoryDriver.provideSmartWallet(
      'agoric1ldmtatp24qlllgxmrsjzcpe20fvlkp448zcuce',
    ),
    atom2: await walletFactoryDriver.provideSmartWallet(
      'agoric140dmkrz2e42ergjj7gyvejhzmjzurvqeq82ang',
    ),
    alice: await walletFactoryDriver.provideSmartWallet('agoric1alice'),
    bob: await walletFactoryDriver.provideSmartWallet('agoric1bob'),
    carol: await walletFactoryDriver.provideSmartWallet('agoric1carol'),
  };

  const setupEndTime = readClock();
  const setupCranks = getCrankNumber();
  const setupRawStats = controller.getStats();
  const setupElapsedTime = Number(setupEndTime - setupStartTime);
  const setupStats = organizeSetupStats(
    setupRawStats,
    setupElapsedTime,
    setupCranks,
  );
  log('-'.repeat(70));
  log(`Setup stats:`);
  printSetupStats(setupStats);
  log('-'.repeat(70));
  const benchmarkReport = { setup: setupStats };

  const context = harden({ options, argv, actors });

  /**
   * Add a benchmark to the set being run by an execution of the benchmark
   * framework.
   *
   * @param {string} label - string identifying the benchmark.  Used for logging
   *    and execution control.
   * @param {Benchmark} benchmark - the benchmark itself
   */
  const addBenchmark = (label, benchmark) => {
    typeof label === 'string' || Fail`benchmark label must be a string`;
    if (benchmark.setup) {
      typeof benchmark.setup === 'function' ||
        Fail`benchmark setup must be a function`;
    }
    benchmark.executeRound ||
      Fail`no executeRound function for benchmark ${label}`;
    typeof benchmark.executeRound === 'function' ||
      Fail`benchmark executeRound must be a function`;
    if (benchmark.finish) {
      typeof benchmark.finish === 'function' ||
        Fail`benchmark finish must be a function`;
    }
    if (benchmark.rounds !== undefined) {
      typeof benchmark.rounds === 'number' ||
        Fail`benchmark rounds must be a number`;
    }
    benchmarks.set(label, benchmark);
  };

  /**
   * Execute the benchmarks.
   *
   * @param {string} [name] - string identifying the set of benchmarks being
   *    executed.  Used for logging and labeling the output data.
   */
  const run = async (name = 'benchmark') => {
    /** @type {object} */
    const benchmarkContext = { ...context };
    await null;
    for (const [label, benchmark] of benchmarks.entries()) {
      if (!shouldIncludeBenchmark(label)) {
        continue;
      }
      benchmarkContext.label = label;
      const rounds = benchmark.rounds || defaultRounds;
      benchmarkContext.rounds = rounds;
      log(`Benchmark "${label}" setup:`);
      benchmarkContext.config = await (benchmark.setup
        ? benchmark.setup(benchmarkContext)
        : {});
      const roundsStartRawStats = controller.getStats();
      const roundsStartTime = readClock();
      const cranksAtRoundsStart = getCrankNumber();
      for (let round = 1; round <= rounds; round += 1) {
        log(`Benchmark "${label}" round ${round}:`);
        await benchmark.executeRound(benchmarkContext, round);
      }
      const roundsEndRawStats = controller.getStats();
      const roundsEndTime = readClock();
      const cranksAtRoundsEnd = getCrankNumber();
      const cranksDuringRounds = cranksAtRoundsEnd - cranksAtRoundsStart;
      const roundsElapsedTime = Number(roundsEndTime - roundsStartTime);
      const benchmarkStats = organizeRoundsStats(
        roundsStartRawStats,
        roundsEndRawStats,
        roundsElapsedTime,
        cranksDuringRounds,
        rounds,
      );
      log('-'.repeat(70));
      log(`Benchmark "${label}" stats:`);
      printBenchmarkStats(benchmarkStats);
      benchmarkReport[label] = benchmarkStats;
      log('-'.repeat(70));
      if (benchmark.finish) {
        await benchmark.finish(benchmarkContext);
      }
    }
    await eventLoopIteration();
    await shutdown();
    if (dump) {
      fs.writeFileSync(
        `benchmark-${name}.json`,
        JSON.stringify(benchmarkReport, null, 2),
      );
    }
  };

  return {
    addBenchmark,
    run,
  };
};

/**
 * The normal singleton benchmarkerator.
 */
export const bench = await makeBenchmarkerator();
