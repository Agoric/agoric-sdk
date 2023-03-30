#!/usr/bin/env node
// @ts-check
/* eslint-disable @jessie.js/no-nested-await */
/* global fetch */

import '@agoric/casting/node-fetch-shim.js';
import '@endo/init';
import '@endo/init/pre.js';

import { execFileSync } from 'child_process';
import path from 'path';
import process from 'process';
import anylogger from 'anylogger';
import { Command, CommanderError, createCommand } from 'commander';
import { makeOracleCommand } from './commands/oracle.js';
import { makeEconomicCommiteeCommand } from './commands/ec.js';
import { makePsmCommand } from './commands/psm.js';
import { makeReserveCommand } from './commands/reserve.js';
import { makeVaultsCommand } from './commands/vaults.js';
import { makePerfCommand } from './commands/perf.js';
import { makeInterCommand } from './commands/inter.js';

const logger = anylogger('agops');
const progname = path.basename(process.argv[1]);

const program = new Command();
program.name(progname).version('unversioned');

program.addCommand(await makeOracleCommand(logger));
program.addCommand(await makeEconomicCommiteeCommand(logger));
program.addCommand(await makePerfCommand(logger));
program.addCommand(await makePsmCommand(logger));
program.addCommand(await makeReserveCommand(logger));
program.addCommand(await makeVaultsCommand(logger));

program.addCommand(
  await makeInterCommand(
    {
      env: { ...process.env },
      stdout: process.stdout,
      stderr: process.stderr,
      createCommand,
      execFileSync,
      now: () => Date.now(),
    },
    { fetch },
  ),
);

try {
  await program.parseAsync(process.argv);
} catch (err) {
  if (err instanceof CommanderError) {
    console.error(err.message);
  } else {
    console.error(err); // CRASH! show stack trace
  }
  process.exit(1);
}
