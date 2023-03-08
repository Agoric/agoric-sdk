#!/usr/bin/env node
/* global fetch */
// @ts-check
import process from 'process';
import { execFile } from 'child_process';
import { main } from '../src/inter.js';

main(
  {
    argv: [...process.argv],
    env: { ...process.env },
    stdout: process.stdout,
    execFile,
    clock: () => Date.now(),
  },
  { fetch },
).catch(err => console.error(err));
