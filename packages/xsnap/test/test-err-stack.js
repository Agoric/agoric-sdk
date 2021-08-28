// JavaScript correctness tests

// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import * as proc from 'child_process';
import * as os from 'os';
import { xsnap } from '../src/xsnap.js';
import { options } from './message-tools.js';

const io = { spawn: proc.spawn, os: os.type() }; // WARNING: ambient

const code = `
const e = () => { throw Error('lose'); };
const d = () => e();
const c = () => d();
const b = () => {c()};
const a = () => {b()};

try {
  a();
} catch (err) {
  send(err.stack);
}

//# sourceURL=/filename.js
`;

async function makeWorker() {
  const opts = options(io);
  const vat = xsnap(opts);

  await vat.evaluate(`
    const send = it => issueCommand(ArrayBuffer.fromString(JSON.stringify(it)));
    globalThis.send = send;
  `);

  return {
    async run(js) {
      await vat.evaluate(js);
      // console.log(opts.messages);
      const result = opts.messages.pop();
      return JSON.parse(result);
    },
  };
}

test.failing('XS stack traces include file, line numbers', async t => {
  const w = await makeWorker();

  const x = await w.run('send(1+1)');
  t.is(x, 2);
  const stack = await w.run(code);
  t.regex(stack, /filename/);
});
