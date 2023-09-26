// @ts-nocheck
/* global FinalizationRegistry WeakRef */
// eslint-disable-next-line import/order
import { test } from '../tools/prepare-test-env-ava.js';

import * as childProcess from 'child_process';
import fs from 'fs';
import * as os from 'os';
import { tmpName } from 'tmp';
import { xsnap } from '@agoric/xsnap';
import engineGC from '@agoric/internal/src/lib-nodejs/engine-gc.js';
import { makeGcAndFinalize } from '@agoric/internal/src/lib-nodejs/gc-and-finalize.js';

function makeVictim() {
  const victim = { doomed: 'oh no' };
  const finalized = ['finalizer not called'];
  const fr = new FinalizationRegistry(_tag => {
    finalized[0] = 'finalizer was called';
  });
  const wr = new WeakRef(victim);
  fr.register(victim, 'tag');
  return { finalized, fr, wr };
}

async function provokeGC(myGC) {
  const gcAndFinalize = makeGcAndFinalize(myGC);

  // the transition from REACHABLE to UNREACHABLE happens as soon as makeVictim()
  // finishes, and the local 'victim' binding goes out of scope

  // we must retain the FinalizationRegistry to let the callback fire
  // eslint-disable-next-line no-unused-vars
  const { finalized, fr, wr } = makeVictim();

  // the transition from UNREACHABLE to COLLECTED can happen at any moment,
  // but is far more likely to happen if we force it
  await gcAndFinalize();
  // that also moves it from COLLECTED to FINALIZED
  const wrState = wr.deref() ? 'weakref is live' : 'weakref is dead';
  const finalizerState = finalized[0];
  return { wrState, finalizerState };
}

test(`can provoke gc on Node.js`, async t => {
  const { wrState, finalizerState } = await provokeGC(engineGC);
  t.is(wrState, 'weakref is dead');
  t.is(finalizerState, 'finalizer was called');
});

const xsnapOptions = {
  name: 'xsnap test worker',
  spawn: childProcess.spawn,
  fs: { ...fs, ...fs.promises, tmpName },
  os: os.type(),
  stderr: 'inherit',
  stdout: 'inherit',
};

const decoder = new TextDecoder();

function options() {
  const messages = [];
  async function handleCommand(message) {
    messages.push(decoder.decode(message));
    return new Uint8Array();
  }
  return { ...xsnapOptions, handleCommand, messages };
}

test(`can provoke gc on xsnap`, async t => {
  const opts = options();
  const vat = await xsnap(opts);
  const code = `
${makeGcAndFinalize}
${makeVictim}
${provokeGC}
provokeGC(globalThis.gc).then(data => {
  const textEncoder = new TextEncoder();
  const text = JSON.stringify(data);
  const array = textEncoder.encode(text);
  const { buffer } = array;
  issueCommand(buffer);
});
`;
  await vat.evaluate(code);
  await vat.close();
  t.truthy(opts.messages.length === 1, `xsnap didn't send response`);
  const { wrState, finalizerState } = JSON.parse(opts.messages[0]);
  // console.log([wrState, finalizerState]);
  t.is(wrState, 'weakref is dead');
  t.is(finalizerState, 'finalizer was called');
});

// TODO: exercise 'return E(zoe).foo()' like in test-gc-vat from #3482, and
// demonstrate that Node.js requires 2 setImmediates after the gc() to allow
// everything to get collected. Then update #3240.
