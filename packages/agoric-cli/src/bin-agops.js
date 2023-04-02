#!/usr/bin/env node
// @ts-check
/* eslint-disable @jessie.js/no-nested-await */
/* global fetch, setTimeout */

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
import { makeAuctionCommand } from './commands/auction.js';

const logger = anylogger('agops');
const progname = path.basename(process.argv[1]);

const program = new Command();
program.name(progname).version('unversioned');

program.addCommand(makeOracleCommand(logger));
program.addCommand(makeEconomicCommiteeCommand(logger));
program.addCommand(makePerfCommand(logger));
program.addCommand(makePsmCommand(logger));
program.addCommand(makeVaultsCommand(logger));

const procIO = {
  env: { ...process.env },
  stdout: process.stdout,
  stderr: process.stderr,
  createCommand,
  execFileSync,
  now: () => Date.now(),
  clock: () => Promise.resolve(Date.now()),
  setTimeout,
};

program.addCommand(makeReserveCommand(logger, procIO));
program.addCommand(makeAuctionCommand(logger, { ...procIO, fetch }));
program.addCommand(makeInterCommand(procIO, { fetch }));

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
