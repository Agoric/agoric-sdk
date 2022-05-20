/* eslint-disable import/order */
import { test } from '../tools/prepare-test-env-ava.js';

import { parse } from '@endo/marshal';
import buildKernel from '../src/kernel/index.js';
import { initializeKernel } from '../src/controller/initializeKernel.js';
import { extractMethod } from '../src/lib/kdebug.js';
import {
  makeKernelEndowments,
  buildDispatch,
  capargs,
  methargsOneSlot,
} from './util.js';

function makeKernel() {
  const endowments = makeKernelEndowments();
  const { kvStore } = endowments.hostStorage;
  initializeKernel({}, endowments.hostStorage);
  const kernel = buildKernel(endowments, {}, {});
  return { kernel, kvStore };
}

async function doAbandon(t, reachable) {
  // vatA receives an object from vatB, holds it or drops it
  // vatB abandons it
  // vatA should retain the object
  // sending to the abandoned object should get an error
  const { kernel, kvStore } = makeKernel();
  await kernel.start();

  const { log: logA, dispatch: dispatchA } = buildDispatch();
  let syscallA;
  function setupA(syscall) {
    syscallA = syscall;
    return dispatchA;
  }
  await kernel.createTestVat('vatA', setupA);
  const vatA = kernel.vatNameToID('vatA');
  const aliceKref = kernel.getRootObject(vatA);
  kernel.pinObject(aliceKref);

  const { log: logB, dispatch: dispatchB } = buildDispatch();
  let syscallB;
  function setupB(syscall) {
    syscallB = syscall;
    return dispatchB;
  }
  await kernel.createTestVat('vatB', setupB);
  const vatB = kernel.vatNameToID('vatB');
  const bobKref = kernel.getRootObject(vatB);
  kernel.pinObject(bobKref);

  await kernel.run();

  async function flushDeliveries() {
    // make a dummy delivery to vatA, so the kernel will call
    // processRefcounts(), this isn't normally needed but we're
    // calling the syscall object directly here
    kernel.queueToKref(aliceKref, capargs(['flush', []]));
    await kernel.run();
    t.truthy(logA.length >= 1);
    const f = logA.shift();
    t.is(f.type, 'deliver');
    t.is(extractMethod(f.methargs), 'flush');
  }

  // introduce B to A, so it can send 'holdThis' later
  kernel.queueToKref(bobKref, methargsOneSlot('exportToA', aliceKref), 'none');
  await kernel.run();
  t.is(logB.length, 1);
  t.is(logB[0].type, 'deliver');
  t.is(extractMethod(logB[0].methargs), 'exportToA');
  const aliceForBob = logB[0].methargs.slots[0]; // probably o-50
  logB.length = 0;

  // tell B to export 'target' to A, so it gets a c-list and refcounts
  const targetForBob = 'o+100';
  syscallB.send(aliceForBob, methargsOneSlot('holdThis', targetForBob));
  await kernel.run();

  t.is(logA.length, 1);
  t.is(logA[0].type, 'deliver');
  t.is(extractMethod(logA[0].methargs), 'holdThis');
  const targetForAlice = logA[0].methargs.slots[0];
  const targetKref = kvStore.get(`${vatA}.c.${targetForAlice}`);
  t.regex(targetKref, /^ko\d+$/);
  logA.length = 0;

  let targetOwner = kvStore.get(`${targetKref}.owner`);
  let targetRefCount = kvStore.get(`${targetKref}.refCount`);
  let expectedRefCount = '1,1'; // reachable+recognizable by vatA
  t.is(targetOwner, vatB);
  t.is(targetRefCount, expectedRefCount);

  // vatA can send a message to the target
  const p1ForAlice = 'p+1'; // left unresolved because vatB is lazy
  syscallA.send(targetForAlice, capargs(['ping', []]), p1ForAlice);
  await flushDeliveries();
  t.is(logB.length, 1);
  t.is(logB[0].type, 'deliver');
  t.is(extractMethod(logB[0].methargs), 'ping');
  logB.length = 0;

  if (!reachable) {
    // vatA drops, but does not retire
    syscallA.dropImports([targetForAlice]);
    await flushDeliveries();
    // vatB gets a dispatch.dropExports
    t.is(logB.length, 1);
    t.deepEqual(logB[0], { type: 'dropExports', vrefs: [targetForBob] });
    logB.length = 0;
    // the object still exists, now only recognizable
    targetOwner = kvStore.get(`${targetKref}.owner`);
    targetRefCount = kvStore.get(`${targetKref}.refCount`);
    t.is(targetOwner, vatB);
    expectedRefCount = '0,1';
    t.is(targetRefCount, expectedRefCount); // merely recognizable
  }

  // now have vatB abandon the export
  syscallB.abandonExports([targetForBob]);
  await flushDeliveries();

  // vatA is not informed (no GC messages)
  t.is(logA.length, 0);
  // vatB isn't either
  t.is(logB.length, 0);

  targetOwner = kvStore.get(`${targetKref}.owner`);
  targetRefCount = kvStore.get(`${targetKref}.refCount`);
  t.is(targetOwner, undefined);
  t.is(targetRefCount, expectedRefCount); // unchanged

  if (reachable) {
    // vatA can send a message, but it will reject
    const p2ForAlice = 'p+2'; // rejected by kernel
    syscallA.send(targetForAlice, capargs(['ping2', []]), p2ForAlice);
    syscallA.subscribe(p2ForAlice);
    await flushDeliveries();

    t.is(logB.length, 0);
    t.is(logA.length, 1);
    t.is(logA[0].type, 'notify');
    t.is(logA[0].resolutions.length, 1);
    const [vpid, rejected, data] = logA[0].resolutions[0];
    t.is(vpid, p2ForAlice);
    t.is(rejected, true);
    t.deepEqual(data.slots, []);
    // TODO: the kernel knows !owner but doesn't remember whether it was
    // an upgrade or a termination that revoked the object, so the error
    // message is a bit misleading
    t.deepEqual(parse(data.body), Error('vat terminated'));
    logA.length = 0;
  }

  if (reachable) {
    // now vatA drops the object
    syscallA.dropImports([targetForAlice]);
    await flushDeliveries();
    // vatB should not get a dispatch.dropImports
    t.is(logB.length, 0);
    // the object still exists, now only recognizable
    targetRefCount = kvStore.get(`${targetKref}.refCount`);
    expectedRefCount = '0,1';
    t.is(targetRefCount, expectedRefCount); // merely recognizable
  }

  // now vatA retires the object too
  syscallA.retireImports([targetForAlice]);
  await flushDeliveries();
  // vatB should not get a dispatch.retireImports
  t.is(logB.length, 0);
  // the object no longer exists
  targetRefCount = kvStore.get(`${targetKref}.refCount`);
  expectedRefCount = undefined;
  t.is(targetRefCount, expectedRefCount); // gone entirely
}

test('abandon reachable object', async t => {
  return doAbandon(t, true);
});

test('abandon recognizable object', async t => {
  return doAbandon(t, false);
});
