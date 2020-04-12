#! /usr/bin/env node

const process = require('process');
const esmRequire = require('esm')(module);

// Configure logs.
esmRequire('../anylogger-agoric.js');
const solo = esmRequire('./main.js').default;

solo(process.argv[1], process.argv.splice(2)).then(
  _res => 0,
  rej => {
    console.log(`error running ag-solo:`, rej);
    console.error(`\
Maybe the chain has bumped and you need to rerun ag-setup-solo?`);
    process.exit(1);
  },
);
