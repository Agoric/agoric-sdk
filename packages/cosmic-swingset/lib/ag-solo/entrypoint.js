#! /usr/bin/env node

/* global globalThis */

// Suppress the "'@agoric/harden' is ineffective without SES" warning. This
// only affects uses inside the parent ag-solo process. The actual SES
// environment which SwingSet builds uses a separate globalThis, so the
// warning is still enabled for SES-confined code (but not triggered, of
// course, because it runs under SES). See #971 for details.
globalThis.harden = null;

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
