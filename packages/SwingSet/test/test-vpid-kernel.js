// eslint-disable-next-line no-redeclare
/* global setImmediate */
import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';
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
    setImmediate,
    hostStorage: initSwingStore().storage,
    runEndOfCrank: () => {},
  };
}

function buildDispatch() {
  const log = [];

  const dispatch = {
    deliver(targetSlot, method, args, resultSlot) {
      log.push({ type: 'deliver', targetSlot, method, args, resultSlot });
    },
    notifyFulfillToPresence(promiseID, slot) {
      log.push({ type: 'notifyFulfillToPresence', promiseID, slot });
    },
    notifyFulfillToData(promiseID, data) {
      log.push({ type: 'notifyFulfillToData', promiseID, data });
    },
    notifyReject(promiseID, data) {
      log.push({ type: 'notifyReject', promiseID, data });
    },
  };

  return { log, dispatch };
}

function buildRawVat(name, kernel) {
  const { log, dispatch } = buildDispatch();
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

  doResolveSyscall(syscallA, p1VatA, mode, rootBvatA);
  await kernel.run();

  t.deepEqual(logB.shift(), resolutionOf(p1VatB, mode, rootBvatB));
  t.deepEqual(logB, []);

  // TODO: once kernel->vat resolution notification retires clist entries,
  // switch to the other set of assertions
  t.equal(inCList(kernel, vatA, p1kernel, p1VatA), true);
  t.equal(inCList(kernel, vatB, p1kernel, p1VatB), true);

  // t.equal(inCList(kernel, vatA, p1kernel, p1VatA), false);
  // t.equal(clistKernelToVat(kernel, vatA, p1kernel), undefined);
  // t.equal(clistVatToKernel(kernel, vatA, p1VatA), undefined);
  // t.equal(clistKernelToVat(kernel, vatB, p1kernel), undefined);
  // t.equal(clistVatToKernel(kernel, vatB, p1VatB), undefined);

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
