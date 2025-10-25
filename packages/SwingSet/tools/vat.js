#!/usr/bin/env node

import '@endo/init/pre-bundle-source.js';
import '@endo/init';
import process from 'process';
import repl from 'repl';
import util from 'util';
import { loadBasedir, buildVatController } from '../src/index.js';
import { buildLoopbox } from '../src/devices/loopbox/loopbox.js';

const USAGE = `
Usage: ${process.argv[1]} {run|shell} [<bootstrap dir>] [--] [<bootstrap arg>]...
`.trim();

const showUsage = (message, exitCode = 64) => {
  const log = message ? console.error : console.log;
  if (message) log(`${message}\n`);
  log(USAGE);
  return exitCode;
};

function deepLog(item) {
  console.log(util.inspect(item, false, null, true));
}

async function main() {
  const argv = process.argv.slice(2);
  const command = argv.shift();
  if (command === undefined) return showUsage('Missing command');
  if (command !== 'run' && command !== 'shell') {
    return showUsage(
      command === '--help' || command === 'help'
        ? undefined
        : `Unrecognized command: ${command}`,
    );
  }
  const basedir = argv.length === 0 || argv[0] === '--' ? '.' : argv.shift();
  const vatArgv = argv;
  for (let i = 0; i < vatArgv.length; i += 1) {
    if (vatArgv[i] !== '--') continue;
    vatArgv.splice(i, 1);
    break;
  }

  assert(basedir);
  const config = await loadBasedir(basedir);
  const { loopboxSrcPath, loopboxEndowments } = buildLoopbox('immediate');
  config.devices = [['loopbox', loopboxSrcPath, loopboxEndowments]];

  // @ts-expect-error expects string[], not boolean, in second position
  const controller = await buildVatController(config, withSES, vatArgv);
  if (command === 'run') {
    await controller.run();
    console.log('= vat finished');
  } else if (command === 'shell') {
    const r = repl.start({ prompt: 'vat> ', replMode: repl.REPL_MODE_STRICT });
    r.context.dump = () => {
      const d = controller.dump();
      console.log('Kernel Table:');
      deepLog(d.kernelTable);
      console.log('Promises:');
      deepLog(d.promises);
      console.log('Run Queue:');
      deepLog(d.runQueue);
      console.log('Acceptance Queue:');
      deepLog(d.acceptanceQueue);
    };
    r.context.dump2 = () => controller.dump();
    r.context.run = () => {
      console.log('run!');
      return controller.run();
    };
    r.context.step = () => {
      console.log('step!');
      return controller.step();
    };
  }
}

main().then(
  exitCode => {
    if (exitCode !== undefined) process.exitCode ||= exitCode;
  },
  err => {
    console.error(err);
    process.exitCode ||= 1;
  },
);
