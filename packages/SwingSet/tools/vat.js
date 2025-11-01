#!/usr/bin/env node

import { dirname } from 'node:path';
import yargsParser from 'yargs-parser';
import '@endo/init/pre-bundle-source.js';
import '@endo/init';
import process from 'process';
import repl from 'repl';
import util from 'util';
import {
  loadSwingsetConfigFile,
  loadBasedir,
  buildVatController,
} from '../src/index.js';
import { buildLoopbox } from '../src/devices/loopbox/loopbox.js';

const USAGE = `
Usage: ${process.argv[1]} \\
  {run|shell} [{-c|--config} <config file>] [<base dir>] [--] [<bootstrap arg>]...
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
  const {
    _: argv,
    '--': extraArgs = [],
    ...options
  } = yargsParser(process.argv.slice(2), {
    configuration: { 'populate--': true, 'unknown-options-as-args': true },
    string: ['config'],
    alias: { config: ['c'] },
  });
  const command = argv.shift();
  if (command === undefined) {
    if (argv.includes('--help')) return showUsage();
    return showUsage('Missing command');
  } else if (command !== 'run' && command !== 'shell') {
    return showUsage(
      command === 'help' ? undefined : `Unrecognized command: ${command}`,
    );
  }
  const configPath = options.config;
  let basedir = /** @type {string | undefined} */ (argv.shift());
  if (basedir === undefined) {
    basedir = configPath ? dirname(configPath) : '.';
  }
  const vatArgv = /** @type {string[]} */ ([...argv, ...extraArgs]);

  const config = await (options.config
    ? loadSwingsetConfigFile(options.config)
    : loadBasedir(basedir));
  assert(config);
  config.devices ||= {};
  const deviceEndowments = /** @type {Record<string, unknown>} */ ({});
  // @ts-expect-error TS2339: Property 'loopboxSenders' does not exist on type 'SwingSetConfig'.
  const { loopboxSenders } = config;
  // @ts-expect-error
  delete config.loopboxSenders;
  if (loopboxSenders) {
    const { loopboxSrcPath, loopboxEndowments } = buildLoopbox('immediate');
    config.devices.loopbox = {
      sourceSpec: loopboxSrcPath,
      parameters: { senders: loopboxSenders },
    };
    deviceEndowments.loopbox = { ...loopboxEndowments };
  }

  const controller = await buildVatController(
    config,
    vatArgv,
    {},
    deviceEndowments,
  );
  if (command === 'run') {
    await controller.run();
    for (const entry of controller.dumpLog()) console.log(entry);
    console.log('= vat finished');
  } else if (command === 'shell') {
    let logIndex = 0;
    const dumpLog = () => {
      for (const entry of controller.dumpLog(logIndex)) {
        logIndex += 1;
        console.log(entry);
      }
    };
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
    r.context.run = async () => {
      console.log('run!');
      const result = await controller.run();
      dumpLog();
      return result;
    };
    r.context.step = async () => {
      console.log('step!');
      const result = await controller.step();
      dumpLog();
      return result;
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
