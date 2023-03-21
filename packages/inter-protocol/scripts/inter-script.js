#!/usr/bin/env node
/* global fetch */
// @ts-check
import process from 'process';
import { execFile } from 'child_process';
import { createCommand } from 'commander';
import { main, RuntimeError } from '../src/inter.js';

main(
  {
    argv: [...process.argv],
    env: { ...process.env },
    stdout: process.stdout,
    createCommand,
    execFile,
    clock: () => Date.now(),
  },
  { fetch },
).catch(err => {
  if (err instanceof RuntimeError) {
    console.error(err.message);
  } else {
    console.error(err); // CRASH! show stack trace
  }
  process.exit(1);
});
