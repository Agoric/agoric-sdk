// eslint-disable-next-line no-redeclare
/* global harden */
import { test } from 'tape-promise/tape';
import '../install-ses.js';
import { waitUntilQuiescent } from '../src/waitUntilQuiescent';
import { initSwingStore } from '@agoric/swing-store-simple';

import buildKernel from '../src/kernel/index';

function capdata(body, slots = []) {
  return harden({ body, slots });
}

function capargs(args, slots = []) {
  return capdata(JSON.stringify(args), slots);
}

function makeEndowments() {
  return {
    waitUntilQuiescent,
    hostStorage: initSwingStore().storage,
    runEndOfCrank: () => {},
  };
}

function buildDispatch(onDispatchCallback = undefined) {
  const log = [];

  const dispatch = {
    deliver(targetSlot, method, args, resultSlot) {
      const d = { type: 'deliver', targetSlot, method, args, resultSlot };
      log.push(d);
      if (onDispatchCallback) {
        onDispatchCallback(d);
      }
    },
    notifyFulfillToPresence(promiseID, slot) {
      const d = { type: 'notifyFulfillToPresence', promiseID, slot };
      log.push(d);
      if (onDispatchCallback) {
        onDispatchCallback(d);
      }
    },
    notifyFulfillToData(promiseID, data) {
      const d = { type: 'notifyFulfillToData', promiseID, data };
      log.push(d);
      if (onDispatchCallback) {
        onDispatchCallback(d);
      }
    },
    notifyReject(promiseID, data) {
      const d = { type: 'notifyReject', promiseID, data };
      log.push(d);
      if (onDispatchCallback) {
        onDispatchCallback(d);
      }
    },
  };

  return { log, dispatch };
}

function buildRawVat(name, kernel, onDispatchCallback = undefined) {
  const { log, dispatch } = buildDispatch(onDispatchCallback);
  let syscall;
  function setup(s) {
    syscall = s;
    return dispatch;
  }
  // our setup() won't be invoked until after the kernel starts
  function getSyscall() {
    return syscall;
  }
  kernel.addGenesisVat(name, setup);
  return { log, getSyscall };
}

// The next batch of tests exercises how the kernel handles promise
// identifiers ("vpid" strings) across various forms of resolution. Our
// current code never retires vpids, but an upcoming storage-performance
// improvement will retire them after resolution. We have the simulated vat
// do various syscalls, and examine the kernel's c-lists afterwards.

// legend:
//  C: vat creates promise
//  S: vat sends promise as argument
//  T: vat includes promise as result= of outbound message
//  R: vat receives promise as result= of inbound message
//  G: vat gets promise as argument
//  M: vat sends message to the promise
//  RES: vat resolves promise
//  NOT: vat receives notification of external resolution

// 1: CS   RES
// 2: R    RES
// 3: G R  RES

// Then we look at cases where the kernel resolves the promise, after which
// the vat is notified ("NOT") about the resolution
//
// 4: G     NOT
// 5: CT    NOT
// 6: CT G  NOT
// 7: CS T  NOT

// (Note, there is overlap between these cases: e.g. the user-level code we
// run to set up test 1 is also what sets up the other side of test 4. But we
// test each separately for clarity)

function doResolveSyscall(syscallA, vpid, mode, target2) {
  switch (mode) {
    case 'presence':
      syscallA.fulfillToPresence(vpid, target2);
      break;
    case 'data':
      syscallA.fulfillToData(vpid, capargs(4, []));
      break;
    case 'reject':
      syscallA.reject(vpid, capargs('error', []));
      break;
    default:
      throw Error(`unknown mode ${mode}`);
  }
}

function resolutionOf(vpid, mode, target2) {
  switch (mode) {
    case 'presence':
      return {
        type: 'notifyFulfillToPresence',
        promiseID: vpid,
        slot: target2,
      };
    case 'data':
      return {
        type: 'notifyFulfillToData',
        promiseID: vpid,
        data: capargs(4, []),
      };
    case 'reject':
      return {
        type: 'notifyReject',
        promiseID: vpid,
        data: capargs('error', []),
      };
    default:
      throw Error(`unknown mode ${mode}`);
  }
}

function clistVatToKernel(kernel, vatID, vpid) {
  for (const row of kernel.dump().kernelTable) {
    const [kid0, vatID0, vid0] = row;
    if (vatID === vatID0 && vpid === vid0) {
      return kid0;
    }
  }
  return undefined;
}

// eslint-disable-next-line no-unused-vars
function clistKernelToVat(kernel, vatID, kpid) {
  for (const row of kernel.dump().kernelTable) {
    const [kid0, vatID0, vid0] = row;
    if (vatID === vatID0 && kpid === kid0) {
      return vid0;
    }
  }
  return undefined;
}

function inCList(kernel, vatID, kpid, vpid) {
  for (const row of kernel.dump().kernelTable) {
    const [kid0, vatID0, vid0] = row;
    if (vatID === vatID0 && kpid === kid0 && vpid === vid0) {
      return true;
    }
  }
  return false;
}

async function doTest123(t, which, mode) {
  const kernel = buildKernel(makeEndowments());
  // vatA is our primary actor
  const { log: logA, getSyscall: getSyscallA } = buildRawVat('vatA', kernel);
  // we use vatB when necessary to send messages to vatA
  const { log: logB, getSyscall: getSyscallB } = buildRawVat('vatB', kernel);
  await kernel.start(undefined); // no bootstrapVatName, so no bootstrap call
  const syscallA = getSyscallA();
  const syscallB = getSyscallB();

  // send(targetSlot, method, args, resultSlot) {
  // subscribe(target) {
  // fulfillToPresence(promiseID, slot) {
  // fulfillToData(promiseID, data) {
  // reject(promiseID, data) {

  const vatA = kernel.vatNameToID('vatA');
  const vatB = kernel.vatNameToID('vatB');

  // A will need a reference to B, to send anything, and vice versa
  const rootBvatB = 'o+0';
  const rootBkernel = kernel.addExport(vatB, rootBvatB);
  const rootBvatA = kernel.addImport(vatA, rootBkernel);
  const rootAvatA = 'o+0';
  const rootAkernel = kernel.addExport(vatA, rootAvatA);
  const rootAvatB = kernel.addImport(vatB, rootAkernel);
  const exportedP1VatA = 'p+1';
  const exportedP1VatB = 'p+2';
  const expectedP1kernel = 'kp40';
  const importedP1VatB = 'p-60';
  const importedP1VatA = 'p-60';
  const slot0arg = { '@qclass': 'slot', index: 0 };
  let p1kernel;
  let p1VatA;
  let p1VatB;

  if (which === 1) {
    // 1: Alice creates a new promise, sends it to Bob, and resolves it
    // A: bob~.one(p1); resolve_p1(mode) // to bob, 4, or reject
    p1VatA = exportedP1VatA;
    p1VatB = importedP1VatB;
    syscallA.send(rootBvatA, 'one', capargs([slot0arg], [exportedP1VatA]));
    p1kernel = clistVatToKernel(kernel, vatA, exportedP1VatA);
    t.equal(p1kernel, expectedP1kernel);
    await kernel.run();

    t.deepEqual(logB.shift(), {
      type: 'deliver',
      targetSlot: rootBvatB,
      method: 'one',
      args: capargs([slot0arg], [importedP1VatB]),
      resultSlot: null,
    });
    t.deepEqual(logB, []);

    syscallB.subscribe(importedP1VatB);
    await kernel.run();
    t.deepEqual(logB, []);
    t.equal(inCList(kernel, vatB, p1kernel, importedP1VatB), true);
  } else if (which === 2) {
    // 2: Bob sends a message to Alice, Alice resolves the result promise
    // B: alice~.one()
    // A: function one() { return resolution; }
    p1VatB = exportedP1VatB;
    p1VatA = importedP1VatA;
    console.log(`exportedP1VatB ${exportedP1VatB} in vatB ${vatB}`);
    syscallB.send(rootAvatB, 'one', capargs([], []), exportedP1VatB);
    syscallB.subscribe(exportedP1VatB);
    p1kernel = clistVatToKernel(kernel, vatB, p1VatB);
    await kernel.run();
    // expect logA to have deliver(one)
    console.log(`importedP1VatA ${importedP1VatA}`);
    t.deepEqual(logA.shift(), {
      type: 'deliver',
      targetSlot: rootAvatA,
      method: 'one',
      args: capargs([], []),
      resultSlot: importedP1VatA,
    });
    t.deepEqual(logA, []);
    t.deepEqual(logB, []);
  } else if (which === 3) {
    // 3: Bob sends a message to Alice with the promise as an argument, then
    //    sends a second message with the same promise as the result. Then
    //    Alice resolves the result.
    // B: alice~.one(p1); alice~.two(result=p1)  // (more than liveslots)
    // A: function two { return resolution }
    p1VatB = exportedP1VatB;
    p1VatA = importedP1VatA;
    syscallB.send(rootAvatB, 'one', capargs([slot0arg], [exportedP1VatB]));
    p1kernel = clistVatToKernel(kernel, vatB, p1VatB);
    await kernel.run();
    // expect logA to have deliver(one)
    t.deepEqual(logA.shift(), {
      type: 'deliver',
      targetSlot: rootAvatA,
      method: 'one',
      args: capargs([slot0arg], [importedP1VatA]),
      resultSlot: null,
    });
    t.deepEqual(logA, []);

    syscallB.subscribe(exportedP1VatB);
    await kernel.run();
    t.deepEqual(logA, []);
    t.deepEqual(logB, []);

    syscallB.send(rootAvatB, 'two', capargs([], []), exportedP1VatB);
    await kernel.run();
    // expect logA to have deliver(two)
    t.deepEqual(logA.shift(), {
      type: 'deliver',
      targetSlot: rootAvatA,
      method: 'two',
      args: capargs([], []),
      resultSlot: importedP1VatA,
    });
    t.deepEqual(logA, []);
  }

  // before resolution, A's c-list should have the promise
  t.equal(inCList(kernel, vatA, p1kernel, p1VatA), true);

  doResolveSyscall(syscallA, p1VatA, mode, rootBvatA);
  await kernel.run();

  t.deepEqual(logB.shift(), resolutionOf(p1VatB, mode, rootBvatB));
  t.deepEqual(logB, []);

  // TODO: once kernel->vat resolution notification retires clist entries,
  // switch to the other set of assertions

  // after resolution, (before we implement retirement), A's c-list should
  // still have the promise
  t.equal(inCList(kernel, vatA, p1kernel, p1VatA), true);

  // after resolution, (now that we've implemented retirement), A's c-list
  // should *not* have the promise
  // t.equal(inCList(kernel, vatA, p1kernel, p1VatA), false);
  // t.equal(clistKernelToVat(kernel, vatA, p1kernel), undefined);
  // t.equal(clistVatToKernel(kernel, vatA, p1VatA), undefined);

  t.end();
}

test('kernel vpid handling case1 presence', async t => {
  await doTest123(t, 1, 'presence');
});

test('kernel vpid handling case1 data', async t => {
  await doTest123(t, 1, 'data');
});

test('kernel vpid handling case1 reject', async t => {
  await doTest123(t, 1, 'reject');
});

test('kernel vpid handling case2 presence', async t => {
  await doTest123(t, 2, 'presence');
});

test('kernel vpid handling case2 data', async t => {
  await doTest123(t, 2, 'data');
});

test('kernel vpid handling case2 reject', async t => {
  await doTest123(t, 2, 'reject');
});

test('kernel vpid handling case3 presence', async t => {
  await doTest123(t, 3, 'presence');
});

test('kernel vpid handling case3 data', async t => {
  await doTest123(t, 3, 'data');
});

test('kernel vpid handling case3 reject', async t => {
  await doTest123(t, 3, 'reject');
});

async function doTest4567(t, which, mode) {
  const kernel = buildKernel(makeEndowments());
  // vatA is our primary actor
  let onDispatchCallback;
  function odc(targetSlot, method, args, resultSlot) {
    if (onDispatchCallback) {
      onDispatchCallback(targetSlot, method, args, resultSlot);
    }
  }
  const { log: logA, getSyscall: getSyscallA } = buildRawVat(
    'vatA',
    kernel,
    odc,
  );
  // we use vatB when necessary to send messages to vatA
  const { log: logB, getSyscall: getSyscallB } = buildRawVat('vatB', kernel);
  await kernel.start(undefined); // no bootstrapVatName, so no bootstrap call
  const syscallA = getSyscallA();
  const syscallB = getSyscallB();

  const vatA = kernel.vatNameToID('vatA');
  const vatB = kernel.vatNameToID('vatB');

  // A will need a reference to B, to send anything, and vice versa
  const rootBvatB = 'o+0';
  const rootBkernel = kernel.addExport(vatB, rootBvatB);
  const rootBvatA = kernel.addImport(vatA, rootBkernel);
  const rootAvatA = 'o+0';
  const rootAkernel = kernel.addExport(vatA, rootAvatA);
  const rootAvatB = kernel.addImport(vatB, rootAkernel);
  const exportedP1VatA = 'p+1';
  const exportedP1VatB = 'p+2';
  const expectedP1kernel = 'kp40';
  const importedP1VatB = 'p-60';
  const importedP1VatA = 'p-60';
  const slot0arg = { '@qclass': 'slot', index: 0 };
  let p1kernel;
  let p1VatA;
  let p1VatB;

  if (which === 4) {
    // 4: Alice receives a promise from Bob, which is then resolved
    // B: alice~.one(p1); resolve_p1(mode) // to alice, 4, or reject
    p1VatB = exportedP1VatB;
    p1VatA = importedP1VatA;
    syscallB.send(rootAvatB, 'one', capargs([slot0arg], [exportedP1VatB]));
    p1kernel = clistVatToKernel(kernel, vatB, exportedP1VatB);
    t.equal(p1kernel, expectedP1kernel);
    await kernel.run();

    t.deepEqual(logA.shift(), {
      type: 'deliver',
      targetSlot: rootAvatA,
      method: 'one',
      args: capargs([slot0arg], [importedP1VatA]),
      resultSlot: null,
    });
    t.deepEqual(logB, []);

    syscallA.subscribe(importedP1VatA);
    await kernel.run();
    t.deepEqual(logA, []);
  } else if (which === 5) {
    // 5: Alice sends message to Bob, Bob resolves the result promise
    // A: bob~.one()
    // B: function one() { return resolution; }
    p1VatA = exportedP1VatA;
    p1VatB = importedP1VatB;
    syscallA.send(rootBvatA, 'one', capargs([], []), exportedP1VatA);
    syscallA.subscribe(exportedP1VatA);
    p1kernel = clistVatToKernel(kernel, vatA, p1VatA);
    await kernel.run();
    // expect logB to have deliver(one)
    t.deepEqual(logB.shift(), {
      type: 'deliver',
      targetSlot: rootBvatB,
      method: 'one',
      args: capargs([], []),
      resultSlot: importedP1VatB,
    });
    t.deepEqual(logA, []);
    t.deepEqual(logB, []);
  } else if (which === 6) {
    // 6: Alice sends message to Bob, Alice sends the result promise to Bob
    // as an argument, then Bob resolves the result promise
    // A: p1=bob~.one(); bob~.two(p1)
    // B: function one() { return resolution; }
    p1VatA = exportedP1VatA;
    p1VatB = importedP1VatB;
    syscallA.send(rootBvatA, 'one', capargs([], []), exportedP1VatA);
    syscallA.subscribe(exportedP1VatA);
    syscallA.send(rootBvatA, 'two', capargs([slot0arg], [exportedP1VatA]));
    p1kernel = clistVatToKernel(kernel, vatA, p1VatA);
    await kernel.run();
    // expect logB to have deliver(one) and deliver(two)
    t.deepEqual(logB.shift(), {
      type: 'deliver',
      targetSlot: rootBvatB,
      method: 'one',
      args: capargs([], []),
      resultSlot: importedP1VatB,
    });
    t.deepEqual(logB.shift(), {
      type: 'deliver',
      targetSlot: rootBvatB,
      method: 'two',
      args: capargs([slot0arg], [importedP1VatB]),
      resultSlot: null,
    });
    t.deepEqual(logA, []);
    t.deepEqual(logB, []);
  } else if (which === 7) {
    // 7: Alice sends a promise to Bob as an argument, then uses the same
    // promise as a result in a message to Bob, then Bob resolves it
    // A: bob~.one(p1), bob~.two(result=p1) // not liveslots
    // B: function two() { return resolution; }
    p1VatA = exportedP1VatA;
    p1VatB = importedP1VatB;
    syscallA.send(rootBvatA, 'one', capargs([slot0arg], [exportedP1VatA]));
    syscallA.send(rootBvatA, 'two', capargs([], []), exportedP1VatA);
    syscallA.subscribe(exportedP1VatA);
    p1kernel = clistVatToKernel(kernel, vatA, p1VatA);
    await kernel.run();
    // expect logB to have deliver(one) and deliver(two)
    t.deepEqual(logB.shift(), {
      type: 'deliver',
      targetSlot: rootBvatB,
      method: 'one',
      args: capargs([slot0arg], [importedP1VatB]),
      resultSlot: null,
    });
    t.deepEqual(logB.shift(), {
      type: 'deliver',
      targetSlot: rootBvatB,
      method: 'two',
      args: capargs([], []),
      resultSlot: importedP1VatB,
    });
    t.deepEqual(logA, []);
    t.deepEqual(logB, []);
  }

  // before resolution, A's c-list should have the promise
  t.equal(inCList(kernel, vatA, p1kernel, p1VatA), true);

  // Now bob resolves it. We want to examine the kernel's c-lists at the
  // moment the notification is delivered to Alice. We only expect one
  // dispatch: Alice.notifyFulfillToPresence()
  onDispatchCallback = function odc1(d) {
    t.deepEqual(d, resolutionOf(p1VatA, mode, rootAvatA));
    // before retirement is implemented, the c-list entry should still be present
    t.equal(inCList(kernel, vatA, p1kernel, p1VatA), true);

    // after retirement is implemented,
    // the kernel c-list entries should be removed before we are given a
    // chance to make any syscalls that might reference them
    // t.equal(inCList(kernel, vatA, p1kernel, p1VatA), false);
  };
  doResolveSyscall(syscallB, p1VatB, mode, rootAvatB);
  await kernel.run();
  onDispatchCallback = undefined;

  t.deepEqual(logA.shift(), resolutionOf(p1VatA, mode, rootAvatA));
  t.deepEqual(logA, []);

  // TODO: once kernel->vat resolution notification retires clist entries,
  // switch to the other set of assertions

  // after resolution, (before we implement retirement), A's c-list should
  // still have the promise
  t.equal(inCList(kernel, vatA, p1kernel, p1VatA), true);

  // after resolution, (now that we've implemented retirement), A's c-list
  // should *not* have the promise
  // t.equal(inCList(kernel, vatA, p1kernel, p1VatA), false);
  // t.equal(clistKernelToVat(kernel, vatA, p1kernel), undefined);
  // t.equal(clistVatToKernel(kernel, vatA, p1VatA), undefined);

  t.end();
}

test('kernel vpid handling case4 presence', async t => {
  await doTest4567(t, 4, 'presence');
});

test('kernel vpid handling case4 data', async t => {
  await doTest4567(t, 4, 'data');
});

test('kernel vpid handling case4 reject', async t => {
  await doTest4567(t, 4, 'reject');
});

test('kernel vpid handling case5 presence', async t => {
  await doTest4567(t, 5, 'presence');
});

test('kernel vpid handling case5 data', async t => {
  await doTest4567(t, 5, 'data');
});

test('kernel vpid handling case5 reject', async t => {
  await doTest4567(t, 5, 'reject');
});

test('kernel vpid handling case6 presence', async t => {
  await doTest4567(t, 6, 'presence');
});

test('kernel vpid handling case6 data', async t => {
  await doTest4567(t, 6, 'data');
});

test('kernel vpid handling case6 reject', async t => {
  await doTest4567(t, 6, 'reject');
});

test('kernel vpid handling case7 presence', async t => {
  await doTest4567(t, 7, 'presence');
});

test('kernel vpid handling case7 data', async t => {
  await doTest4567(t, 7, 'data');
});

test('kernel vpid handling case7 reject', async t => {
  await doTest4567(t, 7, 'reject');
});
