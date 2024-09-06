// @ts-nocheck

// drop this into agoric-sdk/packages/xsnap/manykeys.js

import '@endo/init/debug.js';
import * as proc from 'child_process';
import * as os from 'os';
import { xsnap } from '@agoric/xsnap';

const snapshot = './tinyvat.snapshot';
const opts = {
  name: 'xsnap test worker',
  stderr: 'inherit',
  stdout: 'inherit',
  spawn: proc.spawn,
  os: os.type(),
};

async function setup() {
  const vat0 = xsnap(opts);
  await vat0.evaluate(`globalThis.anchor = { mykey: 4 };`);
  await vat0.snapshot(snapshot);
  console.log(`wrote snapshot`);
  await vat0.close();
}

setup().then(
  () => console.log(`main complete`),
  err => {
    console.log(`main error:`);
    console.log(err);
  },
);
