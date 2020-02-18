import process from 'process';
import repl from 'repl';
import util from 'util';

import { buildVatController, loadBasedir } from '@agoric/swingset-vat';
import {
  makeSimpleSwingStore,
  makeMemorySwingStore,
} from '@agoric/simple-swing-store';
import { makeLMDBSwingStore } from '@agoric/lmdb-swing-store';

function deepLog(item) {
  console.log(util.inspect(item, false, null, true));
}

/**
 * Command line utility to run a swingset for development and testing purposes.
 */
export async function main() {
  // Command line:
  //   node runner [FLAGS...] CMD [{BASEDIR|--} [ARGS...]]
  //
  // FLAGS may be:
  //   --no-ses  - directs vats not to be run in SES.
  //   --init    - directs vats to be run from their initial condition, discarding any existing saved state.
  //   --lmdb    - runs using LMDB as the data store
  //   --filedb  - runs using the simple file-based data store (default)
  //   --memdb   - runs using a non-persistent in-memory data store
  //
  // CMD is one of:
  //   run    - launches or resumes the configured vats, which run to completion.
  //   step   - steps the configured swingset one crank.
  //   shell  - starts a simple CLI allowing the swingset to be run or stepped or interrogated interactively.
  //
  // BASEDIR is the base directory for locating the swingset's vat definitions.
  //   If BASEDIR is omitted or '--' it defaults to the current working directory.
  //
  // Any remaining args are passed to the swingset's bootstrap vat.

  const argv = process.argv.splice(2);

  let withSES = true;
  let forceReset = false;
  let dbMaker = makeSimpleSwingStore;
  while (argv[0].startsWith('--')) {
    const flag = argv.shift();
    switch (flag) {
      case '--no-ses':
        withSES = false;
        break;
      case '--init':
        forceReset = true;
        break;
      case '--filedb':
        dbMaker = makeSimpleSwingStore;
        break;
      case '--memdb':
        dbMaker = makeMemorySwingStore;
        break;
      case '--lmdb':
        dbMaker = makeLMDBSwingStore;
        break;
      default:
        throw new Error(`invalid flag ${flag}`);
    }
  }

  const command = argv.shift();
  if (command !== 'run' && command !== 'shell' && command !== 'step') {
    throw new Error(
      `use 'runner run', 'runner step', or 'runner shell', not 'runner ${command}'`,
    );
  }

  // Prettier demands that the conditional not be parenthesized.  Prettier is wrong.
  // eslint-disable-next-line prettier/prettier
  const basedir = (argv[0] === '--' || argv[0] === undefined) ? '.' : argv.shift();
  const bootstrapArgv = argv[0] === '--' ? argv.slice(1) : argv;

  const config = await loadBasedir(basedir);

  const store = dbMaker(basedir, 'swingset-kernel-state', forceReset);

  config.hostStorage = store.storage;

  const controller = await buildVatController(config, withSES, bootstrapArgv);
  switch (command) {
    case 'run': {
      await controller.run();
      store.commit();
      store.close();
      console.log('= runner finished');
      break;
    }
    case 'step': {
      await controller.step();
      store.commit();
      store.close();
      console.log('= runner stepped');
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
          console.log('committed');
          cli.displayPrompt();
        },
      });
      cli.defineCommand('dump', {
        help: 'Dump the kernel tables',
        action: () => {
          const d = controller.dump();
          console.log('Kernel Table:');
          deepLog(d.kernelTable);
          console.log('Promises:');
          deepLog(d.promises);
          console.log('Run Queue:');
          deepLog(d.runQueue);
          cli.displayPrompt();
        },
      });
      cli.defineCommand('run', {
        help: 'Crank until the run queue is empty',
        action: async () => {
          console.log('run!');
          await controller.run();
          cli.displayPrompt();
        },
      });
      cli.defineCommand('step', {
        help: 'Step the swingset one crank',
        action: async () => {
          console.log('step!');
          await controller.step();
          cli.displayPrompt();
        },
      });
      break;
    }
    default:
      throw new Error(`invalid command ${command}`);
  }
}
