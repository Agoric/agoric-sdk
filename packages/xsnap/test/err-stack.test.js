// JavaScript correctness tests

import test from 'ava';
import * as proc from 'child_process';
import fs from 'fs';
import * as os from 'os';
import { tmpName } from 'tmp';
import { xsnap } from '../src/xsnap.js';
import { options } from './message-tools.js';

const io = { spawn: proc.spawn, os: os.type(), fs, tmpName }; // WARNING: ambient

const code = `
const e = () => { throw Error('lose'); };
const d = () => e();
const c = () => d();
const b = () => {c()};
const a = () => {b()};

try {
  a();
} catch (err) {
  err.stack;
}

//# sourceURL=/filename.js
`;

async function makeWorker() {
  const opts = options(io);
  const vat = await xsnap(opts);

  await vat.evaluate(`
    globalThis.handleCommand = bytes => {
      const report = {};
      const src = new TextDecoder().decode(bytes);
      const it = eval(src);
      report.result = new TextEncoder().encode(JSON.stringify(it)).buffer;
      return report;
    };
  `);

  return {
    /** @param {string} src */
    async run(src) {
      const { reply } = await vat.issueStringCommand(src);
      return JSON.parse(reply);
    },
    async close() {
      return vat.close();
    },
  };
}

test('XS stack traces include file, line numbers', async t => {
  const w = await makeWorker();
  t.teardown(w.close);

  const x = await w.run('1+1');
  t.is(x, 2);
  const stack = await w.run(code);
  t.log(stack);
  t.regex(stack, /filename.js:9/);
});
