#! /usr/bin/env node

// we need to enable Math.random as a workaround for 'brace-expansion' module
// (dep chain: temp->glob->minimatch->brace-expansion)
import '@endo/init/legacy.js';

import process from 'process';
import path from 'path';

// Configure logs.
import '@agoric/cosmic-swingset/src/anylogger-agd.js';
import solo from './main.js';

const baseprog = path.basename(process.argv[1]);
solo(baseprog, process.argv.slice(2)).then(
  res => process.exit(res || 0),
  reason => {
    console.error(`error running ag-solo:`, reason);
    process.exit(1);
  },
);
