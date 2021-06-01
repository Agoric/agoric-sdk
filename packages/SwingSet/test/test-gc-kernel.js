import { test } from '../tools/prepare-test-env-ava';

// eslint-disable-next-line import/order
import anylogger from 'anylogger';

import { WeakRef, FinalizationRegistry } from '../src/weakref';
import { waitUntilQuiescent } from '../src/waitUntilQuiescent';

import buildKernel from '../src/kernel/index';
import { initializeKernel } from '../src/kernel/initializeKernel';
import { provideHostStorage } from '../src/hostStorage';
import { makeMessage, makeDropExports, capdataOneSlot } from './util';

function capdata(body, slots = []) {
  return harden({ body, slots });
}

function capargs(args, slots = []) {
  return capdata(JSON.stringify(args), slots);
}

function makeConsole(tag) {
  const log = anylogger(tag);
  const cons = {};
  for (const level of ['debug', 'log', 'info', 'warn', 'error']) {
    cons[level] = log[level];
  }
  return harden(cons);
}

function makeEndowments() {
  return {
    waitUntilQuiescent,
    hostStorage: provideHostStorage(),
    runEndOfCrank: () => {},
    makeConsole,
    WeakRef,
    FinalizationRegistry,
  };
}

function makeKernel() {
  const endowments = makeEndowments();
  const { kvStore } = endowments.hostStorage;
  initializeKernel({}, endowments.hostStorage);
  const kernel = buildKernel(endowments, {}, {});
  return { kernel, kvStore };
}

function dumpObjects(kernel) {
  const out = {};
  for (const row of kernel.dump().objects) {
    const [koid, owner, reachable, recognizable] = row;
    out[koid] = [owner, reachable, recognizable];
  }
  return out;
}

function dumpVatClist(kernel, vatID) {
  const ktov = {};
  const vtok = {};
  for (const row of kernel.dump().kernelTable) {
    const [kref, v, vref] = row;
    if (v === vatID) {
      ktov[kref] = vref;
      vtok[vref] = kref;
    }
  }
  return { ktov, vtok };
}

async function testDrop(t, mode) {
  const { kernel, kvStore } = makeKernel();
  await kernel.start();

  // Our two root objects (alice and bob) are pinned so they don't disappear
  // while the test is talking to them. So we make alice introduce "amy" as a
  // new object that's doomed to be collected. Bob first drops amy, then
  // retires her, provoking first a dropExports then a retireImports on
  // alice.

  const amyForAlice = 'o+101';
  let bobForAlice;
  const logA = [];
  function setupA(syscall, _state, _helpers, _vatPowers) {
    function dispatch(vd) {
      // console.log(`dispatchA`, vd);
      logA.push(vd);
      if (vd[0] === 'message' && vd[2].method === 'one') {
        bobForAlice = vd[2].args.slots[0];
        syscall.send(bobForAlice, 'two', capdataOneSlot(amyForAlice));
      }
      if (vd[0] === 'dropExports' && mode === 'drop and retire') {
        // pretend there are no local strongrefs, and as soon as liveslots
        // drops it's claim, the object goes away completely
        syscall.retireExports(vd[1]);
      }
      if (vd[0] === 'message' && vd[2].method === 'four') {
        syscall.retireExports([amyForAlice]);
      }
    }
    return dispatch;
  }
  await kernel.createTestVat('vatA', setupA);
  const vatA = kernel.vatNameToID('vatA');
  const aliceForAlice = 'o+100';
  const alice = kernel.addExport(vatA, aliceForAlice);

  let amyForBob;
  const logB = [];
  function setupB(syscall, _state, _helpers, _vatPowers) {
    function dispatch(vd) {
      logB.push(vd);
      // console.log(`dispatchB`, vd);
      if (vd[0] === 'message' && vd[2].method === 'two') {
        amyForBob = vd[2].args.slots[0];
      }
      if (vd[0] === 'message' && vd[2].method === 'three') {
        syscall.dropImports([amyForBob]);
      }
      if (vd[0] === 'message' && vd[2].method === 'todo-error') {
        // TODO it would be an error for bob to do this after dropImports.
        // this causes a syscall error. TODO exercise this and verify the
        // error happens
        syscall.retireImports([amyForBob]);
      }
    }
    return dispatch;
  }
  await kernel.createTestVat('vatB', setupB);
  const vatB = kernel.vatNameToID('vatB');
  const bobForBob = 'o+200';
  const bob = kernel.addExport(vatB, bobForBob);

  kernel.queueToKref(alice, 'one', capdataOneSlot(bob), 'none');
  await kernel.run();

  t.is(bobForAlice, 'o-50'); // expected, but arbitrary
  t.deepEqual(
    logA.shift(),
    makeMessage(aliceForAlice, 'one', capdataOneSlot(bobForAlice)),
  );
  // alice sends bob~.two(amy)

  // bob gets two(amy)
  t.is(amyForBob, 'o-50'); // different vat, same starting point
  t.deepEqual(
    logB.shift(),
    makeMessage(bobForBob, 'two', capdataOneSlot(amyForBob)),
  );

  // look up amy's kref
  const amy = kvStore.get(`${vatA}.c.${amyForAlice}`); // ko22
  // console.log(`amy is ${amy}`);
  // amy should be REACHABLE (reachable+recognizable) by bob, so refcount=1,1
  t.deepEqual(dumpObjects(kernel)[amy], [vatA, 1, 1]);

  // tell bob to drop amy, now RECOGNIZABLE
  kernel.queueToKref(bob, 'three', capargs([]), 'none');
  await kernel.step();

  // amy's refcount should be reachable=0, recognizable=1
  t.deepEqual(dumpObjects(kernel)[amy], [vatA, 0, 1]);

  // there should be a dropExports pending in the gc-actions set
  t.deepEqual(kernel.dump().gcActions, [`${vatA} dropExport ${amy}`]);
  t.deepEqual(logA.length, 0);

  await kernel.step();
  // alice should get dropExport(amy)
  t.deepEqual(logA.shift(), makeDropExports(amyForAlice));

  if (mode === 'drop and retire') {
    // alice immediately retires the object, deleting the kernel object and
    // leaving a retireImports waiting for bob
  } else if (mode === 'drop, then retire') {
    // alice doesn't immediately retire the object, but waits until later (we
    // use four() to trigger the retire)
    t.deepEqual(logA.length, 0);

    // alice did not syscall.retireExports(amy) (i.e. the Remotable is still
    // reachable), so the kernel should still see amy as RECOGNIZABLE, and
    // vatA should still have a clist entry
    t.deepEqual(dumpObjects(kernel)[amy], [vatA, 0, 1]);
    t.is(dumpVatClist(kernel, vatA).ktov[amy], amyForAlice);
    // now alice retires amy completely (i.e. the Remotable is finally dropped)
    kernel.queueToKref(alice, 'four', capargs([]), 'none');
    await kernel.step();
    t.deepEqual(logA.shift(), makeMessage(aliceForAlice, 'four', capargs([])));
  }

  // now the kernel object is deleted
  t.is(dumpObjects(kernel)[amy], undefined);
  // and vatA's clist is deleted
  t.is(dumpVatClist(kernel, vatA).ktov[amy], undefined);

  // and there should be a retireImports waiting for bob
  t.deepEqual(kernel.dump().gcActions, [`${vatB} retireImport ${amy}`]);
  // and his clist should still be present
  t.is(dumpVatClist(kernel, vatB).ktov[amy], amyForBob);

  // deliver the retireImports to bob, which should remove his clist entry
  await kernel.step();
  t.is(dumpVatClist(kernel, vatB).ktov[amy], undefined);
}

test('drop, then retire', async t => {
  return testDrop(t, 'drop, then retire');
});

test('drop and retire', async t => {
  return testDrop(t, 'drop and retire');
});

// B sends a promise to A, A sends a message to the promise containing amy as argument
// - sole ref comes from the promise argument
// v1: B rejects the promise: amy should be collected
// v2: B resolves the promise to Alice: ref moves to runqueue, then only A, then collected
// v3: B resolves the promise to bob: ref moves to rq, then B, then B drops, then collected
// v3.1: promise is also sent to C, so two refs in clists

// three vats

// device receives object from vat a, returns to vat b
