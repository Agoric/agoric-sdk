/* global gc FinalizationRegistry WeakRef */
// eslint-disable-next-line import/order
import { test } from '../tools/prepare-test-env-ava';

import * as childProcess from 'child_process';
import * as os from 'os';
import { xsnap } from '@agoric/xsnap';
import { gcAndFinalize } from '../src/gc-and-finalize';

test(`have gc() on Node.js`, async t => {
  t.is(typeof gc, 'function', 'environment is missing top-level gc()');
  // Under Node.js, you must use `node --expose-gc PROGRAM`. Under AVA+Node,
  // add `nodeArguments: [ "--expose-gc" ]` to the package.json 'ava:'
  // stanza. Under XS, make sure your application (e.g. xsnap) provides a
  // `gc` C callback on the global object.
});

function setup() {
  const victim = { doomed: 'oh no' };
  const finalized = ['finalizer not called'];
  const fr = new FinalizationRegistry(_tag => {
    finalized[0] = 'finalizer was called';
  });
  const wr = new WeakRef(victim);
  fr.register(victim, 'tag');
  return { finalized, fr, wr };
}

async function provokeGC() {
  // the transition from REACHABLE to UNREACHABLE happens as soon as setup()
  // finishes, and the local 'victim' binding goes out of scope

  // we must retain the FinalizationRegistry to let the callback fire
  // eslint-disable-next-line no-unused-vars
  const { finalized, fr, wr } = setup();

  // the transition from UNREACHABLE to COLLECTED can happen at any moment,
  // but is far more likely to happen if we force it
  await gcAndFinalize();
  // that also moves it from COLLECTED to FINALIZED
  const wrState = wr.deref() ? 'weakref is live' : 'weakref is dead';
  const finalizerState = finalized[0];
  return { wrState, finalizerState };
}

let ltest = test;
if (
  typeof WeakRef !== 'function' ||
  typeof FinalizationRegistry !== 'function'
) {
  // Node-12.x lacks both, but we can still test xsnap below
  ltest = test.skip;
}

ltest(`can provoke gc on Node.js`, async t => {
  const { wrState, finalizerState } = await provokeGC();
  t.is(wrState, 'weakref is dead');
  t.is(finalizerState, 'finalizer was called');
});

const xsnapOptions = {
  name: 'xsnap test worker',
  spawn: childProcess.spawn,
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
  const vat = xsnap(opts);
  const code = `
${gcAndFinalize}
${setup}
${provokeGC}
provokeGC().then(data => issueCommand(ArrayBuffer.fromString(JSON.stringify(data))));
`;
  await vat.evaluate(code);
  await vat.close();
  t.truthy(opts.messages.length === 1, `xsnap didn't send response`);
  const { wrState, finalizerState } = JSON.parse(opts.messages[0]);
  // console.log([wrState, finalizerState]);
  t.is(wrState, 'weakref is dead');
  t.is(finalizerState, 'finalizer was called');
});
