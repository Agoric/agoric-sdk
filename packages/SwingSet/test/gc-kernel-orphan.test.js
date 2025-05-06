// @ts-nocheck
/* global WeakRef, FinalizationRegistry */

import anylogger from 'anylogger';
// eslint-disable-next-line import/order
import { test } from '../tools/prepare-test-env-ava.js';

import { assert } from '@endo/errors';
import { kser, kunser, kslot } from '@agoric/kmarshal';
import { initSwingStore } from '@agoric/swing-store';
import { waitUntilQuiescent } from '@agoric/internal/src/lib-nodejs/waitUntilQuiescent.js';
import buildKernel from '../src/kernel/index.js';
import { initializeKernel } from '../src/controller/initializeKernel.js';

function makeConsole(tag) {
  const log = anylogger(tag);
  const cons = {};
  for (const level of ['debug', 'log', 'info', 'warn', 'error']) {
    cons[level] = log[level];
  }
  return harden(cons);
}

function writeSlogObject(o) {
  function bigintReplacer(_, arg) {
    if (typeof arg === 'bigint') {
      return Number(arg);
    }
    return arg;
  }
  0 && console.log(JSON.stringify(o, bigintReplacer));
}

function makeEndowments() {
  return {
    waitUntilQuiescent,
    kernelStorage: initSwingStore().kernelStorage,
    runEndOfCrank: () => {},
    makeConsole,
    writeSlogObject,
    WeakRef,
    FinalizationRegistry,
  };
}

async function makeKernel() {
  const endowments = makeEndowments();
  const { kvStore } = endowments.kernelStorage;
  await initializeKernel({}, endowments.kernelStorage);
  const kernel = buildKernel(endowments, {}, {});
  return { kernel, kvStore };
}

const orphanTest = test.macro(async (t, cause, when, amyState) => {
  assert(['reachable', 'recognizable', 'none'].includes(amyState));
  assert(['abandon', 'terminate'].includes(cause));
  // There is a third case (vatA gets upgraded, and the object wasn't
  // durable), but we can't upgrade vats created by createTestVat().
  assert(['before', 'after'].includes(when));
  const retireImmediately = false;
  const { kernel, kvStore } = await makeKernel();
  await kernel.start();

  const vrefs = {}; // track vrefs within vats

  // Our two root objects (alice and bob) are pinned so they don't disappear
  // while the test is talking to them. So we make alice introduce "amy" as a
  // new object that's doomed to be collected. Bob first drops amy, then
  // retires her, provoking first a dropExports then a retireImports on
  // alice.

  vrefs.aliceForA = 'o+100';
  vrefs.amyForA = 'o+101';
  function setupA(syscall, _state, _helpers, _vatPowers) {
    let exportingAmy = false;
    function dispatch(vd) {
      if (vd[0] === 'startVat') {
        return; // skip startVat
      }
      let method;
      if (vd[0] === 'message') {
        const methargs = kunser(vd[2].methargs);
        [method] = methargs;
        if (method === 'init') {
          // initial conditions: bob holds a reference to amy
          vrefs.bobForA = vd[2].methargs.slots[0];
          syscall.send(
            vrefs.bobForA,
            kser(['accept-amy', [kslot(vrefs.amyForA)]]),
          );
          exportingAmy = true;
        }
        if (method === 'abandon') {
          if (exportingAmy) {
            syscall.abandonExports([vrefs.amyForA]);
          }
        }
        if (method === 'terminate') {
          syscall.exit(false, kser('terminated'));
        }
      }
      if (vd[0] === 'dropExports') {
        if (retireImmediately) {
          // pretend there are no local strongrefs, and as soon as liveslots
          // drops it's claim, the object goes away completely
          syscall.retireExports(vd[1]);
        }
      }
      if (vd[0] === 'retireExports') {
        exportingAmy = false;
      }
    }
    return dispatch;
  }
  await kernel.createTestVat('vatA', setupA);
  const vatA = kernel.vatNameToID('vatA');
  const alice = kernel.addExport(vatA, vrefs.aliceForA);

  let amyRetiredToB = false;
  function setupB(syscall, _state, _helpers, _vatPowers) {
    function dispatch(vd) {
      if (vd[0] === 'startVat') {
        return; // skip startVat
      }
      let method;
      if (vd[0] === 'message') {
        [method] = kunser(vd[2].methargs);
        if (method === 'accept-amy') {
          vrefs.amyForB = vd[2].methargs.slots[0];
        }
        if (method === 'drop') {
          syscall.dropImports([vrefs.amyForB]);
        }
        if (method === 'drop and retire') {
          syscall.dropImports([vrefs.amyForB]);
          syscall.retireImports([vrefs.amyForB]);
        }
        if (method === 'retire') {
          // it would be an error for bob to do this before or without
          // dropImports
          syscall.retireImports([vrefs.amyForB]);
        }
      }
      if (vd[0] === 'retireImports') {
        t.deepEqual(vd[1], [vrefs.amyForB]);
        amyRetiredToB = true;
      }
    }
    return dispatch;
  }
  await kernel.createTestVat('vatB', setupB);
  const vatB = kernel.vatNameToID('vatB');
  vrefs.bobForB = 'o+200';
  const bob = kernel.addExport(vatB, vrefs.bobForB);

  // we always start with bob importing an object from alice
  kernel.queueToKref(alice, 'init', [kslot(bob)], 'none');
  await kernel.run();

  const amy = kvStore.get(`${vatA}.c.${vrefs.amyForA}`);
  t.is(amy, 'ko22'); // probably

  if (when === 'before') {
    // the object is abandoned before vatB drops anything
    if (cause === 'abandon') {
      kernel.queueToKref(alice, 'abandon', [], 'none');
    } else if (cause === 'terminate') {
      kernel.queueToKref(alice, 'terminate', [], 'none');
    }
    await kernel.run();
    t.is(kvStore.get(`${amy}.owner`), undefined);
  }

  t.is(kvStore.get(`${amy}.refCount`), '1,1');
  t.is(kvStore.get(`${vatB}.c.${amy}`), `R ${vrefs.amyForB}`);

  // vatB now drops/retires/neither the "amy" object

  if (amyState === 'reachable') {
    // no change
  } else if (amyState === 'recognizable') {
    kernel.queueToKref(bob, 'drop', [], 'none');
    await kernel.run();
    if (when === 'before') {
      // dropping an abandoned object should also retire it
      t.true(amyRetiredToB); // fixed by #7212
      t.is(kvStore.get(`${vatB}.c.${amy}`), undefined);
      t.is(kvStore.get(`${amy}.refCount`), undefined);
    } else {
      // dropping a living object should merely drop it
      t.is(kvStore.get(`${vatB}.c.${amy}`), `_ ${vrefs.amyForB}`);
      t.is(kvStore.get(`${amy}.refCount`), '0,1');
    }
  } else if (amyState === 'none') {
    kernel.queueToKref(bob, 'drop and retire', [], 'none');
    await kernel.run();
    t.is(kvStore.get(`${vatB}.c.${amy}`), undefined);
    t.is(kvStore.get(`${amy}.refCount`), undefined);
  }

  if (when === 'after') {
    // the object is abandoned *after* vatB drops anything
    if (cause === 'abandon') {
      kernel.queueToKref(alice, 'abandon', [], 'none');
    } else if (cause === 'terminate') {
      kernel.queueToKref(alice, 'terminate', [], 'none');
    }
    await kernel.run();
  }

  t.is(kvStore.get(`${amy}.owner`), undefined);

  if (amyState === 'reachable') {
    // amy should remain defined and reachable, just lacking an owner
    t.is(kvStore.get(`${vatB}.c.${amy}`), `R ${vrefs.amyForB}`);
    t.is(kvStore.get(`${amy}.refCount`), '1,1');
  } else if (amyState === 'recognizable') {
    // an unreachable koid should be retired upon abandonment
    t.true(amyRetiredToB); // fixed by #7212
    t.is(kvStore.get(`${vatB}.c.${amy}`), undefined);
    t.is(kvStore.get(`${amy}.refCount`), undefined);
  } else if (amyState === 'none') {
    // no change
  }
});

for (const cause of ['abandon', 'terminate']) {
  for (const when of ['before', 'after']) {
    for (const amyState of ['reachable', 'recognizable', 'none']) {
      test(
        `orphan test ${cause}-${when}-${amyState}`,
        orphanTest,
        cause,
        when,
        amyState,
      );
    }
  }
}

// exercise a failure case I saw in the zoe tests (zoe -
// secondPriceAuction - valid inputs):
// * vatB is exporting an object ko120 to vatA
// * vatA does E(ko120).wake(), then drops the reference
//   (vatA can still recognize ko120)
// * vatA gets a BOYD, does syscall.dropImport(ko120)
// * ko120.refCount = 1,2  (0,1 from vatA, 1,1 from the run-queue wake())
// * wake() is delivered to vatB
//   * removing it from the run-queue drops refCount to 0,1
//   * and adds ko120 to maybeFreeKrefs
//   * wake() provokes vatB to syscall.exit
//   * post-crank terminateVat() orphans ko120, then retires it
//     * deleting both .owner and .refCount
//   * post-er-crank processRefcounts sees ko120 in maybeFreeKrefs
//     * tries to look up .refCount, fails, panics

// the fix was to change kernelKeeper.getRefCounts to handle a missing
// koNN.refCounts by just returning 0,0

test('termination plus maybeFreeKrefs - dropped', async t => {
  const { kernel, kvStore } = await makeKernel();
  await kernel.start();

  const vrefs = {}; // track vrefs within vats

  // vatB exports an object to vatA, vatA sends it a message and drops
  // it (but doesn't retire it), vatB will self-terminate upon
  // receiving that message, creating two places that try to retire it

  // The order of events will be:
  // * 'terminate' translated, drops reachable to zero, adds to maybeFreeKrefs
  // * 'terminate' delivered, delivery marks vat for termination
  // * post-delivery crankResults.terminate check marks vat as terminated
  //   (but slow-deletion means nothing is deleted on that crank)
  // * post-delivery does processRefCounts()
  //   * that processes ko22/billy, sees 0,1, owner=v2, v2 is terminated
  //     so it orphans ko22 (removes from vatB c-list and clears .owner)
  //     and falls through to (owner=undefined) case
  //     which sees recognizable=1 and retires the object
  //      (i.e. pushes retireImport gcAction and deletes .owner and .refCounts)
  // * next crank starts cleanup, walks c-list, orphans ko21/bob
  //   which adds ko21 to maybeFreeKrefs
  // * post-cleanup processRefCounts() does ko21, sees 1,1, owner=undefined
  //   does nothing, since vatA still holds an (orphaned) reference
  // * cleanup finishes

  // Our two root objects (alice and bob) are pinned so they don't
  // disappear while the test is talking to them, so vatB exports
  // "billy".

  vrefs.aliceForA = 'o+100';
  vrefs.bobForB = 'o+200';
  vrefs.billyForB = 'o+201';
  let billyKref;

  let vatA;
  function setupA(syscall, _state, _helpers, _vatPowers) {
    function dispatch(vd) {
      if (vd[0] === 'startVat') {
        return; // skip startVat
      }
      // console.log(`deliverA:`, JSON.stringify(vd));
      if (vd[0] === 'message') {
        const methargs = kunser(vd[2].methargs);
        const [method] = methargs;
        if (method === 'call-billy') {
          t.is(vd[2].methargs.slots.length, 1);
          vrefs.billyForA = vd[2].methargs.slots[0];
          t.is(vrefs.billyForA, 'o-50'); // probably
          billyKref = kvStore.get(`${vatA}.c.${vrefs.billyForA}`);
          syscall.send(
            vrefs.billyForA,
            kser(['terminate', [kslot(vrefs.billyForA, 'billy-A')]]),
          );
          syscall.dropImports([vrefs.billyForA]);
        }
      }
    }
    return dispatch;
  }
  await kernel.createTestVat('vatA', setupA);
  vatA = kernel.vatNameToID('vatA');
  const alice = kernel.addExport(vatA, vrefs.aliceForA);

  function setupB(syscall, _state, _helpers, _vatPowers) {
    function dispatch(vd) {
      if (vd[0] === 'startVat') {
        return; // skip startVat
      }
      // console.log(`deliverB:`, JSON.stringify(vd));
      if (vd[0] === 'message') {
        const [method] = kunser(vd[2].methargs);
        if (method === 'init') {
          vrefs.aliceForB = vd[2].methargs.slots[0];
          syscall.send(
            vrefs.aliceForB,
            kser(['call-billy', [kslot(vrefs.billyForB, 'billy-B')]]),
          );
        }
        if (method === 'terminate') {
          t.is(vd[2].methargs.slots.length, 1);
          assert.equal(vd[2].methargs.slots[0], vrefs.billyForB);
          syscall.exit(false, kser('reason'));
        }
      }
    }
    return dispatch;
  }
  await kernel.createTestVat('vatB', setupB);
  const vatB = kernel.vatNameToID('vatB');
  const bob = kernel.addExport(vatB, vrefs.bobForB);

  // this triggers everything, the bug was a kernel crash
  kernel.queueToKref(bob, 'init', [kslot(alice, 'alice')], 'none');
  await kernel.run();

  t.is(kvStore.get(`${billyKref}.owner`), undefined);
  t.is(kvStore.get(`${billyKref}.refCounts`), undefined);
  t.is(kvStore.get(`${vatA}.c.${billyKref}`), undefined);
  t.is(kvStore.get(`${vatA}.c.${vrefs.billyForA}`), undefined);
  t.is(kvStore.get(`${vatB}.c.${billyKref}`), undefined);
  t.is(kvStore.get(`${vatB}.c.${vrefs.billyForB}`), undefined);
});

// like above, but the object doesn't remain recognizable
test('termination plus maybeFreeKrefs - retired', async t => {
  const { kernel, kvStore } = await makeKernel();
  await kernel.start();

  const vrefs = {}; // track vrefs within vats

  // vatB exports an object to vatA, vatA sends it a message and drops
  // and retires it, vatB will self-terminate upon receiving that
  // message. The order of events will be:
  // * 'terminate' translated, drops refcount to zero, adds to maybeFreeKrefs
  // * 'terminate' delivered, delivery marks vat for termination
  // * post-delivery crankResults.terminate check marks vat as terminated
  //   (but slow-deletion means nothing is deleted on that crank)
  // * post-delivery does processRefCounts()
  //   * that processes ko22/billy, sees 0,0, owner=v2, v2 is terminated
  //     so it orphans ko22 (removes from vatB c-list and clears .owner)
  //     and falls through to (owner=undefined) case
  //     which sees recognizable=0 and deletes the object (just .refCount now)
  // * next crank starts cleanup, walks c-list, orphans ko21/bob
  //   which adds ko21 to maybeFreeKrefs
  // * post-cleanup processRefCounts() does ko21, sees 1,1, owner=undefined
  //   does nothing, since vatA still holds an (orphaned) reference
  // * cleanup finishes

  vrefs.aliceForA = 'o+100';
  vrefs.bobForB = 'o+200';
  vrefs.billyForB = 'o+201';
  let billyKref;

  let vatA;
  function setupA(syscall, _state, _helpers, _vatPowers) {
    function dispatch(vd) {
      if (vd[0] === 'startVat') {
        return; // skip startVat
      }
      console.log(`deliverA:`, JSON.stringify(vd));
      if (vd[0] === 'message') {
        const methargs = kunser(vd[2].methargs);
        const [method] = methargs;
        if (method === 'call-billy') {
          t.is(vd[2].methargs.slots.length, 1);
          vrefs.billyForA = vd[2].methargs.slots[0];
          t.is(vrefs.billyForA, 'o-50'); // probably
          billyKref = kvStore.get(`${vatA}.c.${vrefs.billyForA}`);
          syscall.send(
            vrefs.billyForA,
            kser(['terminate', [kslot(vrefs.billyForA, 'billy-A')]]),
          );
          syscall.dropImports([vrefs.billyForA]);
          syscall.retireImports([vrefs.billyForA]);
        }
      }
    }
    return dispatch;
  }
  await kernel.createTestVat('vatA', setupA);
  vatA = kernel.vatNameToID('vatA');
  const alice = kernel.addExport(vatA, vrefs.aliceForA);

  function setupB(syscall, _state, _helpers, _vatPowers) {
    function dispatch(vd) {
      if (vd[0] === 'startVat') {
        return; // skip startVat
      }
      console.log(`deliverB:`, JSON.stringify(vd));
      if (vd[0] === 'message') {
        const [method] = kunser(vd[2].methargs);
        if (method === 'init') {
          vrefs.aliceForB = vd[2].methargs.slots[0];
          syscall.send(
            vrefs.aliceForB,
            kser(['call-billy', [kslot(vrefs.billyForB, 'billy-B')]]),
          );
        }
        if (method === 'terminate') {
          t.is(vd[2].methargs.slots.length, 1);
          assert.equal(vd[2].methargs.slots[0], vrefs.billyForB);
          syscall.exit(false, kser('reason'));
        }
      }
    }
    return dispatch;
  }
  await kernel.createTestVat('vatB', setupB);
  const vatB = kernel.vatNameToID('vatB');
  const bob = kernel.addExport(vatB, vrefs.bobForB);

  // this triggers everything, the bug was a kernel crash
  kernel.queueToKref(bob, 'init', [kslot(alice, 'alice')], 'none');
  await kernel.run();

  t.is(kvStore.get(`${billyKref}.owner`), undefined);
  t.is(kvStore.get(`${billyKref}.refCounts`), undefined);
  t.is(kvStore.get(`${vatA}.c.${billyKref}`), undefined);
  t.is(kvStore.get(`${vatA}.c.${vrefs.billyForA}`), undefined);
  t.is(kvStore.get(`${vatB}.c.${billyKref}`), undefined);
  t.is(kvStore.get(`${vatB}.c.${vrefs.billyForB}`), undefined);
});
