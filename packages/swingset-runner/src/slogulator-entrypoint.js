#!/usr/bin/env node
/* eslint-env node */

/**
 * Simple boilerplate program providing linkage to launch an application written using modules within the
 * as yet not-entirely-ESM-supporting version of NodeJS.
 */
import '@endo/init';
import { main } from './slogulator.js';

process.exitCode = 1;
try {
  main();
  process.exitCode = 0;
} catch (error) {
  console.error(error);
}
