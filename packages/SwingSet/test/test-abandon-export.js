// @ts-nocheck
/* eslint-disable import/order */
import { test } from '../tools/prepare-test-env-ava.js';

import buildKernel from '../src/kernel/index.js';
import { initializeKernel } from '../src/controller/initializeKernel.js';
import { extractMethod } from '../src/lib/kdebug.js';
import { makeKernelEndowments, buildDispatch } from './util.js';
import { kser, kunser, kslot } from '../src/lib/kmarshal.js';

const makeKernel = async () => {
  const endowments = makeKernelEndowments();
  const { kvStore } = endowments.kernelStorage;
  await initializeKernel({}, endowments.kernelStorage);
  const kernel = buildKernel(endowments, {}, {});
  return { kernel, kvStore };
};

/**
 * @param {import('ava').ExecutionContext} t
 * @param {object[]} log
 * @param {string} type
 * @param {object} [details]
 * @param {string} [details.method]
 */
const assertFirstLogEntry = (t, log, type, details = {}) => {
  const { method, ...otherDetails } = details;
  t.is(Math.min(log.length, 1), 1);
  const entry = log.shift();
  t.is(entry.type, type);
  if (method) {
    t.is(extractMethod(entry.methargs), method);
  }
  if (Reflect.ownKeys(otherDetails).length) {
    t.like(entry, otherDetails);
  }
  return entry;
};

const assertSingleEntryLog = (t, log, type, details = {}) => {
  const entry = assertFirstLogEntry(t, log, type, details);
  t.deepEqual(log, []);
  return entry;
};

const makeTestVat = async (t, kernel, name) => {
  const { log, dispatch } = buildDispatch();
  let syscall;
  const setup = providedSyscall => {
    syscall = providedSyscall;
    return dispatch;
  };
  await kernel.createTestVat(name, setup);
  assert(syscall);
  const vatID = kernel.vatNameToID(name);
  const kref = kernel.getRootObject(vatID);
  kernel.pinObject(kref);
  const flushDeliveries = async () => {
    // Make a dummy delivery so the kernel will call processRefcounts().
    // This isn't normally needed, but we're directly making syscalls
    // outside of a delivery.
    // If that ever stops working, we can update `makeTestVat` to return
    // functions supporting more true-to-production vat behavior like
    // ```js
    // enqueueSyscall('send', target, kser([...args]), resultVPID);
    // enqueueSyscall('subscribe', resultVPID);
    // flushSyscalls(); // issues queued syscalls inside a dummy delivery
    // ```
    kernel.queueToKref(kref, 'flush', []);
    await kernel.run();
    assertFirstLogEntry(t, log, 'deliver', { method: 'flush' });
  };
  return { vatID, kref, dispatch, log, syscall, flushDeliveries };
};

async function doAbandon(t, reachable) {
  // vatA receives an object from vatB, holds it or drops it
  // vatB abandons it
  // vatA should retain the object
  // sending to the abandoned object should get an error
  const { kernel, kvStore } = await makeKernel();
  await kernel.start();

  const {
    vatID: vatA,
    kref: aliceKref,
    log: logA,
    syscall: syscallA,
    flushDeliveries: flushDeliveriesA,
  } = await makeTestVat(t, kernel, 'vatA');
  const {
    vatID: vatB,
    kref: bobKref,
    log: logB,
    syscall: syscallB,
  } = await makeTestVat(t, kernel, 'vatB');
  await kernel.run();

  // introduce B to A, so it can send 'holdThis' later
  kernel.queueToKref(bobKref, 'exportToA', [kslot(aliceKref)], 'none');
  await kernel.run();
  const aliceForBobDelivery = assertSingleEntryLog(t, logB, 'deliver', {
    method: 'exportToA',
  });
  const aliceForBob = aliceForBobDelivery.methargs.slots[0];

  // tell B to export 'target' to A, so it gets a c-list and refcounts
  const targetForBob = 'o+100';
  syscallB.send(aliceForBob, kser(['holdThis', [kslot(targetForBob)]]));
  await kernel.run();
  const targetForAliceDelivery = assertSingleEntryLog(t, logA, 'deliver', {
    method: 'holdThis',
  });
  const targetForAlice = targetForAliceDelivery.methargs.slots[0];
  const targetKref = kvStore.get(`${vatA}.c.${targetForAlice}`);
  t.regex(targetKref, /^ko\d+$/);
  let targetOwner = kvStore.get(`${targetKref}.owner`);
  let targetRefCount = kvStore.get(`${targetKref}.refCount`);
  let expectedRefCount = '1,1'; // reachable+recognizable by vatA
  t.is(targetOwner, vatB);
  t.is(targetRefCount, expectedRefCount);

  // vatA can send a message to the target
  const p1ForAlice = 'p+1'; // left unresolved because vatB is lazy
  syscallA.send(targetForAlice, kser(['ping', []]), p1ForAlice);
  await flushDeliveriesA();
  assertSingleEntryLog(t, logB, 'deliver', { method: 'ping' });

  if (!reachable) {
    // vatA drops, but does not retire
    syscallA.dropImports([targetForAlice]);
    await flushDeliveriesA();
    // vatB gets a dispatch.dropExports
    assertSingleEntryLog(t, logB, 'dropExports', { vrefs: [targetForBob] });
    // the object still exists, now only recognizable
    targetOwner = kvStore.get(`${targetKref}.owner`);
    targetRefCount = kvStore.get(`${targetKref}.refCount`);
    t.is(targetOwner, vatB);
    expectedRefCount = '0,1';
    t.is(targetRefCount, expectedRefCount); // merely recognizable
  }

  // now have vatB abandon the export
  syscallB.abandonExports([targetForBob]);
  await flushDeliveriesA();

  // no GC messages for either vat
  t.deepEqual(logA, []);
  t.deepEqual(logB, []);

  targetOwner = kvStore.get(`${targetKref}.owner`);
  targetRefCount = kvStore.get(`${targetKref}.refCount`);
  t.is(targetOwner, undefined);
  t.is(targetRefCount, expectedRefCount); // unchanged

  if (reachable) {
    // vatA can send a message, but it will reject
    const p2ForAlice = 'p+2'; // rejected by kernel
    syscallA.send(targetForAlice, kser(['ping2', []]), p2ForAlice);
    syscallA.subscribe(p2ForAlice);
    await flushDeliveriesA();

    t.deepEqual(logB, []);
    const notifyDelivery = assertSingleEntryLog(t, logA, 'notify');
    const firstResolution = notifyDelivery.resolutions[0];
    t.deepEqual(notifyDelivery.resolutions, [firstResolution]);
    const [vpid, rejected, data] = firstResolution;
    t.is(vpid, p2ForAlice);
    t.is(rejected, true);
    t.deepEqual(data.slots, []);
    // TODO: the kernel knows !owner but doesn't remember whether it was
    // an upgrade or a termination that revoked the object, so the error
    // message is a bit misleading
    t.deepEqual(kunser(data), Error('vat terminated'));
  }

  if (reachable) {
    // now vatA drops the object
    syscallA.dropImports([targetForAlice]);
    await flushDeliveriesA();
    // vatB should not get a dispatch.dropImports
    t.deepEqual(logB, []);
    // the object still exists, now only recognizable
    targetRefCount = kvStore.get(`${targetKref}.refCount`);
    expectedRefCount = '0,1';
    t.is(targetRefCount, expectedRefCount); // merely recognizable
  }

  // now vatA retires the object too
  syscallA.retireImports([targetForAlice]);
  await flushDeliveriesA();
  // vatB should not get a dispatch.retireImports
  t.deepEqual(logB, []);
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
