import path from 'path';
import process from 'process';
import repl from 'repl';
import util from 'util';

import { makeStatLogger } from '@agoric/stat-logger';
import { buildVatController, loadBasedir } from '@agoric/swingset-vat';
import {
  initSwingStore as initSimpleSwingStore,
  openSwingStore as openSimpleSwingStore,
} from '@agoric/swing-store-simple';
import {
  initSwingStore as initLMDBSwingStore,
  openSwingStore as openLMDBSwingStore,
} from '@agoric/swing-store-lmdb';

const log = console.log;

function p(item) {
  return util.inspect(item, false, null, true);
}

function readClock() {
  return process.hrtime.bigint();
}

function usage() {
  console.log(`
Command line:
  runner [FLAGS...] CMD [{BASEDIR|--} [ARGS...]]

FLAGS may be:
  --no-ses       - directs vats not to be run in SES.
  --init         - discard any existing saved state at startup.
  --lmdb         - runs using LMDB as the data store
  --filedb       - runs using the simple file-based data store (default)
  --memdb        - runs using the non-persistent in-memory data store
  --blockmode    - run in block mode (checkpoint every BLOCKSIZE blocks)
  --blocksize N  - set BLOCKSIZE to N (default 200)
  --logtimes     - log block execution time stats while running
  --logmem       - log memory usage stats after each block
  --forcegc      - run garbage collector after each block
  --batchsize N  - set BATCHSIZE to N (default 200)

CMD is one of:
  help   - print this helpful usage information
  run    - launches or resumes the configured vats, which run to completion.
  batch  - launch or resume, then run BATCHSIZE cranks or until completion
  step   - steps the configured swingset one crank.
  shell  - starts a simple CLI allowing the swingset to be run or stepped or
           interrogated interactively.

BASEDIR is the base directory for locating the swingset's vat definitions.
  If BASEDIR is omitted or '--' it defaults to the current working directory.

Any remaining args are passed to the swingset's bootstrap vat.
`);
}

function fail(message, printUsage) {
  console.log(message);
  if (printUsage) {
    usage();
  }
  process.exit(1);
}

/* eslint-disable no-use-before-define */

/**
 * Command line utility to run a swingset for development and testing purposes.
 */
export async function main() {
  const argv = process.argv.splice(2);

  let withSES = true;
  let forceReset = false;
  let dbMode = '--filedb';
  let blockSize = 200;
  let batchSize = 200;
  let blockMode = false;
  let logTimes = false;
  let logMem = false;
  let forceGC = false;
  while (argv[0] && argv[0].startsWith('--')) {
    const flag = argv.shift();
    switch (flag) {
      case '--no-ses':
        withSES = false;
        break;
      case '--init':
        forceReset = true;
        break;
      case '--logtimes':
        logTimes = true;
        break;
      case '--logmem':
        logMem = true;
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
      case '--filedb':
      case '--memdb':
      case '--lmdb':
        dbMode = flag;
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
    if (!global.gc) {
      fail(
        'To use --forcegc you must start node with the --expose-gc command line option',
      );
    }
    if (!logMem) {
      console.log('Warning: --forcegc without --logmem may be a mistake');
    }
  }

  // Prettier demands that the conditional not be parenthesized.  Prettier is wrong.
  // eslint-disable-next-line prettier/prettier
  const basedir = (argv[0] === '--' || argv[0] === undefined) ? '.' : argv.shift();
  const bootstrapArgv = argv[0] === '--' ? argv.slice(1) : argv;
  const config = await loadBasedir(basedir);

  let store;
  const kernelStateDBDir = path.join(basedir, 'swingset-kernel-state');
  switch (dbMode) {
    case '--filedb':
      if (forceReset) {
        store = initSimpleSwingStore(kernelStateDBDir);
      } else {
        store = openSimpleSwingStore(kernelStateDBDir);
      }
      break;
    case '--memdb':
      store = initSimpleSwingStore();
      break;
    case '--lmdb':
      if (forceReset) {
        store = initLMDBSwingStore(kernelStateDBDir);
      } else {
        store = openLMDBSwingStore(kernelStateDBDir);
      }
      break;
    default:
      fail(`invalid database mode ${dbMode}`, true);
  }
  config.hostStorage = store.storage;

  let blockNumber = 0;
  let statLogger = null;
  if (logTimes || logMem) {
    let headers = ['block', 'steps'];
    if (logTimes) {
      headers = headers.concat(['btime']);
    }
    if (logMem) {
      headers = headers.concat(['rss', 'heapTotal', 'heapUsed', 'external']);
    }
    statLogger = makeStatLogger('runner', headers);
  }

  const controller = await buildVatController(config, withSES, bootstrapArgv);
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
      const steps = await controller.step();
      store.commit();
      store.close();
      log(`runner stepped ${steps} crank${steps === 1 ? '' : 's'}`);
      break;
    }
    case 'shell': {
      const cli = repl.start({
        prompt: 'runner> ',
        replMode: repl.REPL_MODE_STRICT,
      });
      cli.on('exit', () => {
        store.close();
      });
      cli.context.dump2 = () => controller.dump();
      cli.defineCommand('commit', {
        help: 'Commit current kernel state to persistent storage',
        action: () => {
          store.commit();
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
          const steps = await controller.step();
          log(steps ? 'stepped one crank' : "didn't step, queue is empty");
          cli.displayPrompt();
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

  async function runBlock(requestedSteps, doCommit) {
    const blockStartTime = readClock();
    let actualSteps = 0;
    while (requestedSteps > 0) {
      requestedSteps -= 1;
      // eslint-disable-next-line no-await-in-loop
      const stepped = await controller.step();
      actualSteps += stepped;
      if (stepped < 1) {
        break;
      }
    }
    if (doCommit) {
      store.commit();
    }
    const blockEndTime = readClock();
    if (forceGC) {
      global.gc();
    }
    if (statLogger) {
      blockNumber += 1;
      let data = [blockNumber, actualSteps];
      if (logTimes) {
        data = data.concat([blockEndTime - blockStartTime]);
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
      statLogger.log(data);
    }
    return actualSteps;
  }

  async function runBatch(stepLimit, doCommit) {
    const startTime = readClock();
    let totalSteps = 0;
    let steps;
    const runAll = stepLimit === 0;
    do {
      // eslint-disable-next-line no-await-in-loop
      steps = await runBlock(blockSize, doCommit);
      totalSteps += steps;
      stepLimit -= steps;
    } while ((runAll || stepLimit > 0) && steps >= blockSize);
    return [totalSteps, readClock() - startTime];
  }

  async function commandRun(stepLimit, runInBlockMode) {
    const [totalSteps, deltaT] = await runBatch(stepLimit, runInBlockMode);
    if (!runInBlockMode) {
      store.commit();
    }
    store.close();
    if (logTimes) {
      if (totalSteps) {
        const per = deltaT / BigInt(totalSteps);
        log(
          `runner finished ${totalSteps} cranks in ${deltaT} ns (${per}/crank)`,
        );
      } else {
        log(`runner finished replay in ${deltaT} ns`);
      }
    } else {
      if (totalSteps) {
        log(`runner finished ${totalSteps} cranks`);
      } else {
        log(`runner finished replay`);
      }
    }
  }
}
