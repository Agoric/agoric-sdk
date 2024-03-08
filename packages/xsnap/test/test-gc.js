/* global FinalizationRegistry WeakRef */

import test from 'ava';

import * as proc from 'child_process';
import fs from 'fs';
import * as os from 'os';
import { tmpName } from 'tmp';
import { xsnap } from '../src/xsnap.js';

import { makeGcAndFinalize } from './gc.js';
import { options } from './message-tools.js';

const io = { spawn: proc.spawn, os: os.type(), fs, tmpName }; // WARNING: ambient

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

test(`can provoke gc on xsnap`, async t => {
  const opts = options(io);
  const vat = await xsnap(opts);
  const code = `
${makeGcAndFinalize}
${makeVictim}
${provokeGC}
provokeGC(globalThis.gc).then(data => issueCommand(new TextEncoder().encode(JSON.stringify(data)).buffer));
`;
  await vat.evaluate(code);
  await vat.close();
  t.true(opts.messages.length === 1, `xsnap didn't send response`);
  const { wrState, finalizerState } = JSON.parse(opts.messages[0]);
  // console.log([wrState, finalizerState]);
  t.is(wrState, 'weakref is dead');
  t.is(finalizerState, 'finalizer was called');
});
