
import process from 'process';
import repl from 'repl';
import util from 'util';

import { loadBasedir, buildVatController, buildLoopbox } from '@agoric/swingset-vat';

function deepLog(item) {
  console.log(util.inspect(item, false, null, true));
}

export async function main() {
  // Command line:
  //   node runner [--no-ses] CMD [{BASEDIR|--} [ARGS...]]
  //
  // The '--no-ses' flag directs vats not to be run in SES.
  //
  // CMD is either 'run' or 'shell'.
  //   'run' simply launches the configured vats, which run to completion.
  //   'shell' starts a REPL allowing vats to be run or stepped or interrogated interactively.
  //
  // BASEDIR is the base directory for locating vat definitions.
  //   If BASEDIR is omitted or '--' it defaults to the current working directory.
  //
  // Any remaining args are passed to the SwingSet bootstrap vat.

  let argv = process.argv.splice(2);

  let withSES = true;
  if (argv[0] === '--no-ses') {
    withSES = false;
    argv.shift();
  }

  const command = argv.shift();
  if (command !== 'run' && command !== 'shell') {
    throw new Error(`use 'runner run' or 'runner shell', not 'runner ${command}'`);
  }

  const basedir = (argv[0] === '--' || argv[0] === undefined) ? '.' : argv.shift();
  const vatArgv = argv[0] === '--' ? argv.slice(1) : argv;

  const config = await loadBasedir(basedir);

  const controller = await buildVatController(config, withSES, vatArgv);
  if (command === 'run') {
    await controller.run();
    console.log('= runner finished');
  } else if (command === 'shell') {
    const r = repl.start({ prompt: 'runner> ',
                           replMode: repl.REPL_MODE_STRICT,
                         });
    r.context.dump = () => {
      const d = controller.dump();
      console.log('Kernel Table:');
      deepLog(d.kernelTable);
      console.log('Promises:');
      deepLog(d.promises);
      console.log('Run Queue:');
      deepLog(d.runQueue);
    };
    r.context.dump2 = () => controller.dump();
    r.context.run = () => { console.log('run!'); controller.run(); };
    r.context.step = () => { console.log('step!'); controller.step(); };
  }
}
