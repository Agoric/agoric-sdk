// @ts-nocheck
/* eslint-disable import/order */
import { test } from '../tools/prepare-test-env-ava.js';

import buildKernel from '../src/kernel/index.js';
import { initializeKernel } from '../src/controller/initializeKernel.js';
import { extractMethod } from '../src/lib/kdebug.js';
import makeKernelKeeper, {
  CURRENT_SCHEMA_VERSION,
} from '../src/kernel/state/kernelKeeper.js';
import { makeKernelEndowments, buildDispatch } from './util.js';
import { kser, kunser, kslot } from '@agoric/kmarshal';

const makeKernel = async () => {
  const endowments = makeKernelEndowments();
  const { kernelStorage } = endowments;
  const { kvStore } = kernelStorage;
  await initializeKernel({}, kernelStorage);
  const kernel = buildKernel(endowments, {}, {});
  const kernelKeeper = makeKernelKeeper(kernelStorage, CURRENT_SCHEMA_VERSION);
  kernelKeeper.loadStats();
  return { kernel, kvStore, kernelKeeper };
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

const makeTestVat = async (kernel, name, kernelKeeper) => {
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
    // This test use a really lazy+sketchy approach to triggering
    // syscalls and the refcount bookkeeping that we want to exercise.
    //
    // The kernel only runs processRefcounts() after a real crank
    // (i.e. inside processDeliveryMessage and
    // processAcceptanceMessage) but we want to avoid cluttering
    // delivery logs of our vats with dummy activity, so we avoid
    // making dispatches *into* the vat.
    //
    // The hack is to grab the vat's `syscall` object and invoke it
    // directly, from *outside* a crank. Then, to trigger
    // `processRefcounts()`, we inject a `{ type: 'negated-gc-action'
    // }` onto the run-queue, which is handled by
    // processDeliveryMessage but doesn't actually deliver anything.
    //
    // A safer approach would be to define the vat's dispatch() to
    // listen for some messages that trigger each of the syscalls we
    // want to invoke
    //
    kernelKeeper.addToRunQueue({ type: 'negated-gc-action' });
    await kernel.run();
  };
  return { vatID, kref, log, syscall, flushDeliveries };
};

async function doAbandon(t, reachable) {
  // vatA receives an object from vatB, holds it or drops it
  // vatB abandons it
  // vatA should retain the object
  // sending to the abandoned object should get an error
  const { kernel, kvStore, kernelKeeper } = await makeKernel();
  await kernel.start();

  const {
    vatID: vatA,
    kref: aliceKref,
    log: logA,
    syscall: syscallA,
    flushDeliveries: flushDeliveriesA,
  } = await makeTestVat(kernel, 'vatA', kernelKeeper);
  const {
    vatID: vatB,
    kref: bobKref,
    log: logB,
    syscall: syscallB,
    flushDeliveries: flushDeliveriesB,
  } = await makeTestVat(kernel, 'vatB', kernelKeeper);
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
  await flushDeliveriesB();
  targetOwner = kvStore.get(`${targetKref}.owner`);
  targetRefCount = kvStore.get(`${targetKref}.refCount`);

  if (reachable) {
    // no GC messages for either vat
    t.deepEqual(logA, []);
    t.deepEqual(logB, []);
    t.is(targetOwner, undefined);
    t.is(targetRefCount, expectedRefCount); // unchanged
  } else {
    // 'target' was orphaned and unreachable, kernel will delete it,
    // so A will get a retireImports now
    assertSingleEntryLog(t, logA, 'retireImports', { vrefs: [targetForAlice] });
    t.deepEqual(logB, []);
    t.is(targetOwner, undefined);
    t.is(targetRefCount, undefined);
  }

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
    // the kernel automatically retires the orphaned
    // now-merely-recognizable object
    assertSingleEntryLog(t, logA, 'retireImports', { vrefs: [targetForAlice] });
    // which deletes it
  }
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
