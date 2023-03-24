#!/usr/bin/env node
/* global fetch */
// @ts-check
import '@endo/init';
import process from 'process';
import { execFileSync } from 'child_process';
import { createCommand, CommanderError } from 'commander';

import { makeInterCommand } from '../src/commands/inter.js';

const main = async () => {
  const interCmd = await makeInterCommand(
    {
      env: { ...process.env },
      stdout: process.stdout,
      stderr: process.stderr,
      createCommand,
      execFileSync,
      clock: () => Date.now(),
    },
    { fetch },
  );
  interCmd.parse(process.argv);
};

main().catch(err => {
  if (err instanceof CommanderError) {
    console.error(err.message);
  } else {
    console.error(err); // CRASH! show stack trace
  }
  process.exit(1);
});
