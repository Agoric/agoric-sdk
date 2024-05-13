// @ts-nocheck
/* global WeakRef, FinalizationRegistry */
// eslint-disable-next-line import/order
import { test } from '../tools/prepare-test-env-ava.js';

import anylogger from 'anylogger';
import { Fail } from '@endo/errors';
import { kser, kslot } from '@agoric/kmarshal';
import { initSwingStore } from '@agoric/swing-store';
import { waitUntilQuiescent } from '@agoric/internal/src/lib-nodejs/waitUntilQuiescent.js';

import buildKernel from '../src/kernel/index.js';
import { initializeKernel } from '../src/controller/initializeKernel.js';

import { buildDispatch } from './util.js';

function oneResolution(promiseID, rejected, data) {
  return [[promiseID, rejected, data]];
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
    kernelStorage: initSwingStore().kernelStorage,
    runEndOfCrank: () => {},
    makeConsole,
    WeakRef,
    FinalizationRegistry,
  };
}

async function buildRawVat(
  name,
  kernel,
  onDispatchCallback = undefined,
  options = undefined,
) {
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
  await kernel.createTestVat(name, setup, undefined, options);
  return { log, getSyscall };
}

// The next batch of tests exercises how the kernel handles promise
// identifiers ("vpid" strings) across various forms of resolution. Our
// current code retires vpids after resolution. We have the simulated vat
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

// In addition, we want to exercise the promises being resolved in various
// ways:
// prettier-ignore
const modes = [
  'presence',     // resolveToPresence: messages can be sent to resolution
  'local-object',   // resolve to a local object: messages to resolution don't create syscalls
  'data',           // resolveToData: messages are rejected as DataIsNotCallable
  'promise-data',   // resolveToData that contains a promise ID
  'reject',         // reject: messages are rejected
  'promise-reject', // reject to data that contains a promise ID
];

function doResolveSyscall(syscallA, vpid, mode, targets) {
  switch (mode) {
    case 'presence':
      syscallA.resolve([[vpid, false, kser(kslot(targets.target2))]]);
      break;
    case 'local-object':
      syscallA.resolve([[vpid, false, kser(kslot(targets.localTarget))]]);
      break;
    case 'data':
      syscallA.resolve([[vpid, false, kser(4)]]);
      break;
    case 'promise-data':
      syscallA.resolve([[vpid, false, kser([kslot(targets.p1)])]]);
      break;
    case 'reject':
      syscallA.resolve([[vpid, true, kser('error')]]);
      break;
    case 'promise-reject':
      syscallA.resolve([[vpid, true, kser(kslot(targets.p1))]]);
      break;
    default:
      Fail`unknown mode ${mode}`;
  }
}

function resolutionOf(vpid, mode, targets) {
  switch (mode) {
    case 'presence':
      return {
        type: 'notify',
        resolutions: oneResolution(vpid, false, kser(kslot(targets.target2))),
      };
    case 'local-object':
      return {
        type: 'notify',
        resolutions: oneResolution(
          vpid,
          false,
          kser(kslot(targets.localTarget)),
        ),
      };
    case 'data':
      return {
        type: 'notify',
        resolutions: oneResolution(vpid, false, kser(4)),
      };
    case 'promise-data':
      return {
        type: 'notify',
        resolutions: oneResolution(vpid, false, kser([kslot(targets.p1)])),
      };
    case 'reject':
      return {
        type: 'notify',
        resolutions: oneResolution(vpid, true, kser('error')),
      };
    case 'promise-reject':
      return {
        type: 'notify',
        resolutions: oneResolution(vpid, true, kser(kslot(targets.p1))),
      };
    default: {
      throw Fail`unknown mode ${mode}`;
    }
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
  const endowments = makeEndowments();
  await initializeKernel({}, endowments.kernelStorage);
  const kernel = buildKernel(endowments, {}, {});
  await kernel.start(undefined); // no bootstrapVatName, so no bootstrap call
  // vatA is our primary actor
  const { log: logA, getSyscall: getSyscallA } = await buildRawVat(
    'vatA',
    kernel,
  );
  // we use vatB when necessary to send messages to vatA
  const { log: logB, getSyscall: getSyscallB } = await buildRawVat(
    'vatB',
    kernel,
    undefined,
    {
      // Test 3 sends a promise before using it as result, which only
      // pipelining vats are allowed to do
      enablePipelining: which === 3,
    },
  );
  const syscallA = getSyscallA();
  const syscallB = getSyscallB();

  // send(targetSlot, method, args, resultSlot) {
  // subscribe(target) {
  // resolve(promiseID, rejected, data) {

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
  let dataPromiseB = 'p-60';
  const dataPromiseA = 'p+3';
  const expectedP1kernel = 'kp40';
  const importedP1VatB = 'p-60';
  const importedP1VatA = 'p-60';
  const localTargetA = 'o+1';
  const localTargetB = 'o-51';
  let p1kernel;
  let p1VatA;
  let p1VatB;

  if (which === 1) {
    // 1: Alice creates a new promise, sends it to Bob, and resolves it
    // A: bob~.one(p1); resolve_p1(mode) // to bob, 4, or reject
    p1VatA = exportedP1VatA;
    p1VatB = importedP1VatB;
    dataPromiseB = 'p-61';
    syscallA.send(rootBvatA, kser(['one', [kslot(exportedP1VatA)]]));
    p1kernel = clistVatToKernel(kernel, vatA, exportedP1VatA);
    t.is(p1kernel, expectedP1kernel);
    await kernel.run();

    t.deepEqual(logB.shift(), {
      type: 'deliver',
      targetSlot: rootBvatB,
      methargs: kser(['one', [kslot(importedP1VatB)]]),
      resultSlot: null,
    });
    t.deepEqual(logB, []);

    syscallB.subscribe(importedP1VatB);
    await kernel.run();
    t.deepEqual(logB, []);
    t.is(inCList(kernel, vatB, p1kernel, importedP1VatB), true);
  } else if (which === 2) {
    // 2: Bob sends a message to Alice, Alice resolves the result promise
    // B: alice~.one()
    // A: function one() { return resolution; }
    p1VatB = exportedP1VatB;
    p1VatA = importedP1VatA;
    syscallB.send(rootAvatB, kser(['one', []]), exportedP1VatB);
    syscallB.subscribe(exportedP1VatB);
    p1kernel = clistVatToKernel(kernel, vatB, p1VatB);
    await kernel.run();
    // expect logA to have deliver(one)
    t.deepEqual(logA.shift(), {
      type: 'deliver',
      targetSlot: rootAvatA,
      methargs: kser(['one', []]),
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
    syscallB.send(rootAvatB, kser(['one', [kslot(exportedP1VatB)]]));
    p1kernel = clistVatToKernel(kernel, vatB, p1VatB);
    await kernel.run();
    // expect logA to have deliver(one)
    t.deepEqual(logA.shift(), {
      type: 'deliver',
      targetSlot: rootAvatA,
      methargs: kser(['one', [kslot(importedP1VatA)]]),
      resultSlot: null,
    });
    t.deepEqual(logA, []);

    syscallB.subscribe(exportedP1VatB);
    await kernel.run();
    t.deepEqual(logA, []);
    t.deepEqual(logB, []);

    syscallB.send(rootAvatB, kser(['two', []]), exportedP1VatB);
    await kernel.run();
    // expect logA to have deliver(two)
    t.deepEqual(logA.shift(), {
      type: 'deliver',
      targetSlot: rootAvatA,
      methargs: kser(['two', []]),
      resultSlot: importedP1VatA,
    });
    t.deepEqual(logA, []);
  }

  // before resolution, A's c-list should have the promise
  t.is(inCList(kernel, vatA, p1kernel, p1VatA), true);

  const targetsA = {
    target2: rootBvatA,
    localTarget: localTargetA,
    p1: dataPromiseA,
  };
  doResolveSyscall(syscallA, p1VatA, mode, targetsA);
  await kernel.run();

  const targetsB = {
    target2: rootBvatB,
    localTarget: localTargetB,
    p1: dataPromiseB,
  };
  const got = logB.shift();
  const wanted = resolutionOf(p1VatB, mode, targetsB);
  t.deepEqual(got, wanted);
  t.deepEqual(logB, []);

  // after resolution, A's c-list should *not* have the promise
  t.is(inCList(kernel, vatA, p1kernel, p1VatA), false);
  t.is(clistKernelToVat(kernel, vatA, p1kernel), undefined);
  t.is(clistVatToKernel(kernel, vatA, p1VatA), undefined);
}
// uncomment this when debugging specific problems
// test.only(`XX`, async t => {
//   await doTest123(t, 2, 'promise-data');
// });

for (const caseNum of [1, 2, 3]) {
  for (const mode of modes) {
    test(`kernel vpid handling case${caseNum} ${mode}`, async t => {
      await doTest123(t, caseNum, mode);
    });
  }
}

async function doTest4567(t, which, mode) {
  const endowments = makeEndowments();
  await initializeKernel({}, endowments.kernelStorage);
  const kernel = buildKernel(endowments, {}, {});
  await kernel.start(undefined); // no bootstrapVatName, so no bootstrap call
  // vatA is our primary actor
  let onDispatchCallback;
  function odc(d) {
    if (onDispatchCallback) {
      onDispatchCallback(d);
    }
  }
  const { log: logA, getSyscall: getSyscallA } = await buildRawVat(
    'vatA',
    kernel,
    odc,
    {
      // Test 7 sends a promise before using it as result, which only
      // pipelining vats are allowed to do
      enablePipelining: which === 7,
    },
  );
  // we use vatB when necessary to send messages to vatA
  const { log: logB, getSyscall: getSyscallB } = await buildRawVat(
    'vatB',
    kernel,
  );
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
  const localTargetB = 'o+1';
  const localTargetA = 'o-51';
  const exportedP1VatA = 'p+1';
  const exportedP1VatB = 'p+2';
  const dataPromiseB = 'p+3';
  let dataPromiseA = 'p-60';
  const expectedP1kernel = 'kp40';
  const importedP1VatB = 'p-60';
  const importedP1VatA = 'p-60';
  let p1kernel;
  let p1VatA;
  let p1VatB;

  if (which === 4) {
    // 4: Alice receives a promise from Bob, which is then resolved
    // B: alice~.one(p1); resolve_p1(mode) // to alice, 4, or reject
    p1VatB = exportedP1VatB;
    p1VatA = importedP1VatA;
    dataPromiseA = 'p-61';
    syscallB.send(rootAvatB, kser(['one', [kslot(exportedP1VatB)]]));
    p1kernel = clistVatToKernel(kernel, vatB, exportedP1VatB);
    t.is(p1kernel, expectedP1kernel);
    await kernel.run();

    t.deepEqual(logA.shift(), {
      type: 'deliver',
      targetSlot: rootAvatA,
      methargs: kser(['one', [kslot(importedP1VatA)]]),
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
    syscallA.send(rootBvatA, kser(['one', []]), exportedP1VatA);
    syscallA.subscribe(exportedP1VatA);
    p1kernel = clistVatToKernel(kernel, vatA, p1VatA);
    await kernel.run();
    // expect logB to have deliver(one)
    t.deepEqual(logB.shift(), {
      type: 'deliver',
      targetSlot: rootBvatB,
      methargs: kser(['one', []]),
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
    syscallA.send(rootBvatA, kser(['one', []]), exportedP1VatA);
    syscallA.subscribe(exportedP1VatA);
    syscallA.send(rootBvatA, kser(['two', [kslot(exportedP1VatA)]]));
    p1kernel = clistVatToKernel(kernel, vatA, p1VatA);
    await kernel.run();
    // expect logB to have deliver(one) and deliver(two)
    t.deepEqual(logB.shift(), {
      type: 'deliver',
      targetSlot: rootBvatB,
      methargs: kser(['one', []]),
      resultSlot: importedP1VatB,
    });
    t.deepEqual(logB.shift(), {
      type: 'deliver',
      targetSlot: rootBvatB,
      methargs: kser(['two', [kslot(importedP1VatB)]]),
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
    syscallA.send(rootBvatA, kser(['one', [kslot(exportedP1VatA)]]));
    syscallA.send(rootBvatA, kser(['two', []]), exportedP1VatA);
    syscallA.subscribe(exportedP1VatA);
    p1kernel = clistVatToKernel(kernel, vatA, p1VatA);
    await kernel.run();
    // expect logB to have deliver(one) and deliver(two)
    t.deepEqual(logB.shift(), {
      type: 'deliver',
      targetSlot: rootBvatB,
      methargs: kser(['one', [kslot(importedP1VatB)]]),
      resultSlot: null,
    });
    t.deepEqual(logB.shift(), {
      type: 'deliver',
      targetSlot: rootBvatB,
      methargs: kser(['two', []]),
      resultSlot: importedP1VatB,
    });
    t.deepEqual(logA, []);
    t.deepEqual(logB, []);
  }

  // before resolution, A's c-list should have the promise
  t.is(inCList(kernel, vatA, p1kernel, p1VatA), true);

  // Now bob resolves it. We want to examine the kernel's c-lists at the
  // moment the notification is delivered to Alice. We only expect one
  // dispatch: Alice.notify()
  const targetsA = {
    target2: rootAvatA,
    localTarget: localTargetA,
    p1: dataPromiseA,
  };
  onDispatchCallback = function odc1(d) {
    t.deepEqual(d, resolutionOf(p1VatA, mode, targetsA));
    t.is(inCList(kernel, vatA, p1kernel, p1VatA), false);
  };
  const targetsB = {
    target2: rootAvatB,
    localTarget: localTargetB,
    p1: dataPromiseB,
  };
  doResolveSyscall(syscallB, p1VatB, mode, targetsB);
  await kernel.run();
  onDispatchCallback = undefined;

  t.deepEqual(logA.shift(), resolutionOf(p1VatA, mode, targetsA));
  t.deepEqual(logA, []);

  // after resolution, A's c-list should *not* have the promise
  t.is(inCList(kernel, vatA, p1kernel, p1VatA), false);
  t.is(clistKernelToVat(kernel, vatA, p1kernel), undefined);
  t.is(clistVatToKernel(kernel, vatA, p1VatA), undefined);
}

for (const caseNum of [4, 5, 6, 7]) {
  for (const mode of modes) {
    test(`kernel vpid handling case${caseNum} ${mode}`, async t => {
      await doTest4567(t, caseNum, mode);
    });
  }
}

test(`kernel vpid handling crossing resolutions`, async t => {
  const endowments = makeEndowments();
  await initializeKernel({}, endowments.kernelStorage);
  const kernel = buildKernel(endowments, {}, {});
  await kernel.start(undefined); // no bootstrapVatName, so no bootstrap call
  // vatX controls the scenario, vatA and vatB are the players
  let onDispatchCallback;
  function odc(d) {
    if (onDispatchCallback) {
      onDispatchCallback(d);
    }
  }
  const { log: logA, getSyscall: getSyscallA } = await buildRawVat(
    'vatA',
    kernel,
    odc,
  );
  const { log: logB, getSyscall: getSyscallB } = await buildRawVat(
    'vatB',
    kernel,
  );
  const { log: logX, getSyscall: getSyscallX } = await buildRawVat(
    'vatX',
    kernel,
  );
  const syscallA = getSyscallA();
  const syscallB = getSyscallB();
  const syscallX = getSyscallX();

  const vatA = kernel.vatNameToID('vatA');
  const vatB = kernel.vatNameToID('vatB');
  const vatX = kernel.vatNameToID('vatX');

  // X will need references to A and B, to send them anything
  const rootBvatB = 'o+0';
  const rootBkernel = kernel.addExport(vatB, rootBvatB);
  const rootBvatX = kernel.addImport(vatX, rootBkernel);

  const rootAvatA = 'o+0';
  const rootAkernel = kernel.addExport(vatA, rootAvatA);
  const rootAvatX = kernel.addImport(vatX, rootAkernel);

  const exportedGenResultAvatX = 'p+1';
  const importedGenResultAvatX = 'p-60'; // re-export
  const importedGenResultAvatA = 'p-60';
  const importedGenResultAvatB = 'p-61';
  const importedGenResultA2vatA = 'p-63';
  const genResultAkernel = 'kp40';

  const exportedGenResultBvatX = 'p+2';
  const importedGenResultBvatA = 'p-61';
  const importedGenResultBvatB = 'p-60';
  const importedGenResultB2vatB = 'p-63';
  const genResultBkernel = 'kp41';

  const exportedUseResultAvatX = 'p+3';
  const importedUseResultAvatA = 'p-62';

  const exportedUseResultBvatX = 'p+4';

  const importedUseResultBvatB = 'p-62';

  // X is the controlling vat, which orchestrates alice and bob
  // X: pa=alice~.genPromise()  // alice generates promise pa and returns it
  // X: pb=bob~.genPromise()    // bob generates promise pb and returns it
  // X: alice~.usePromise(pb)   // alice resolves promise pa to an array containing pb
  // X: bob~.usePromise(pa)     // bob resolves promise pb to an array containing pa

  // **** begin Crank 1 (X) ****
  syscallX.send(rootAvatX, kser(['genPromise', []]), exportedGenResultAvatX);
  syscallX.subscribe(exportedGenResultAvatX);
  syscallX.send(rootBvatX, kser(['genPromise', []]), exportedGenResultBvatX);
  syscallX.subscribe(exportedGenResultBvatX);
  syscallX.send(
    rootAvatX,
    kser(['usePromise', [kslot(exportedGenResultBvatX)]]),
    exportedUseResultAvatX,
  );
  syscallX.subscribe(exportedUseResultAvatX);
  syscallX.send(
    rootBvatX,
    kser(['usePromise', [kslot(exportedGenResultAvatX)]]),
    exportedUseResultBvatX,
  );
  syscallX.subscribe(exportedUseResultBvatX);

  await kernel.run();
  t.deepEqual(logA.shift(), {
    // reacted to on Crank 2 (A)
    type: 'deliver',
    targetSlot: rootAvatA,
    methargs: kser(['genPromise', []]),
    resultSlot: importedGenResultAvatA,
  });
  t.deepEqual(logB.shift(), {
    // reacted to on Crank 3 (B)
    type: 'deliver',
    targetSlot: rootBvatB,
    methargs: kser(['genPromise', []]),
    resultSlot: importedGenResultBvatB,
  });
  t.deepEqual(logA.shift(), {
    // reacted to on Crank 4 (A)
    type: 'deliver',
    targetSlot: rootAvatA,
    methargs: kser(['usePromise', [kslot(importedGenResultBvatA)]]),
    resultSlot: importedUseResultAvatA,
  });
  t.deepEqual(logB.shift(), {
    // reacted to on Crank 5 (B)
    type: 'deliver',
    targetSlot: rootBvatB,
    methargs: kser(['usePromise', [kslot(importedGenResultAvatB)]]),
    resultSlot: importedUseResultBvatB,
  });
  t.deepEqual(logA, []);
  t.deepEqual(logB, []);
  t.deepEqual(logX, []);

  t.is(inCList(kernel, vatA, genResultAkernel, importedGenResultAvatA), true);
  t.is(inCList(kernel, vatB, genResultAkernel, importedGenResultAvatB), true);
  t.is(inCList(kernel, vatX, genResultAkernel, exportedGenResultAvatX), true);

  t.is(inCList(kernel, vatA, genResultBkernel, importedGenResultBvatA), true);
  t.is(inCList(kernel, vatB, genResultBkernel, importedGenResultBvatB), true);
  t.is(inCList(kernel, vatX, genResultBkernel, exportedGenResultBvatX), true);
  // **** end Crank 1 (X) ****

  // **** begin Crank 2 (A) ****
  // genPromise delivered to A
  // **** end Crank 2 (A) ****

  // **** begin Crank 3 (B) ****
  // genPromise delivered to B
  // **** end Crank 3 (B) ****

  // **** begin Crank 4 (A) ****
  // usePromise(b) delivered to A
  syscallA.subscribe(importedGenResultBvatA);
  syscallA.resolve([[importedUseResultAvatA, false, kser(undefined)]]);
  syscallA.resolve([
    [importedGenResultAvatA, false, kser([kslot(importedGenResultBvatA)])],
  ]);
  await kernel.run();
  t.deepEqual(logX.shift(), {
    type: 'notify',
    resolutions: [[exportedUseResultAvatX, false, kser(undefined)]],
  });
  t.deepEqual(logX.shift(), {
    type: 'notify',
    resolutions: [
      [exportedGenResultAvatX, false, kser([kslot(exportedGenResultBvatX)])],
    ],
  });
  t.deepEqual(logX, []);
  t.deepEqual(logA, []);
  t.deepEqual(logB, []);

  t.is(inCList(kernel, vatX, genResultAkernel, exportedGenResultAvatX), false);
  t.is(inCList(kernel, vatA, genResultAkernel, importedGenResultAvatA), false);
  t.is(inCList(kernel, vatB, genResultAkernel, importedGenResultAvatB), true);

  t.is(inCList(kernel, vatA, genResultBkernel, importedGenResultBvatA), true);
  t.is(inCList(kernel, vatB, genResultBkernel, importedGenResultBvatB), true);
  t.is(inCList(kernel, vatX, genResultBkernel, exportedGenResultBvatX), true);
  // **** end Crank 4 (A) ****

  // **** begin Crank 5 (B) ****
  // usePromise(a) delivered to B
  syscallB.subscribe(importedGenResultAvatB);
  syscallB.resolve([[importedUseResultBvatB, false, kser(undefined)]]);
  syscallB.resolve([
    [importedGenResultBvatB, false, kser([kslot(importedGenResultAvatB)])],
  ]);

  await kernel.run();
  t.deepEqual(logX.shift(), {
    type: 'notify',
    resolutions: [[exportedUseResultBvatX, false, kser(undefined)]],
  });
  t.deepEqual(logX.shift(), {
    type: 'notify',
    resolutions: [
      [exportedGenResultBvatX, false, kser([kslot(importedGenResultAvatX)])],
      [importedGenResultAvatX, false, kser([kslot(exportedGenResultBvatX)])],
    ],
  });
  t.deepEqual(logX, []);
  t.deepEqual(logB.shift(), {
    type: 'notify',
    resolutions: [
      [importedGenResultAvatB, false, kser([kslot(importedGenResultB2vatB)])],
      [importedGenResultB2vatB, false, kser([kslot(importedGenResultAvatB)])],
    ],
  });
  t.deepEqual(logB, []);
  t.deepEqual(logA.shift(), {
    type: 'notify',
    resolutions: [
      [importedGenResultBvatA, false, kser([kslot(importedGenResultA2vatA)])],
      [importedGenResultA2vatA, false, kser([kslot(importedGenResultBvatA)])],
    ],
  });
  t.deepEqual(logA, []);
  t.is(inCList(kernel, vatA, genResultAkernel, importedGenResultAvatA), false);
  t.is(inCList(kernel, vatB, genResultAkernel, importedGenResultAvatB), false);
  t.is(inCList(kernel, vatX, genResultAkernel, importedGenResultAvatX), false);

  t.is(inCList(kernel, vatA, genResultBkernel, importedGenResultBvatA), false);
  t.is(inCList(kernel, vatB, genResultBkernel, importedGenResultBvatB), false);
  t.is(inCList(kernel, vatX, genResultBkernel, exportedGenResultBvatX), false);
  // **** end Crank 5 (B) ****
});

async function doReflectedMessageTest(t, enablePipelining) {
  const endowments = makeEndowments();
  await initializeKernel({}, endowments.kernelStorage);
  const kernel = buildKernel(endowments, {}, {});
  await kernel.start(undefined); // no bootstrapVatName, so no bootstrap call

  // This is a redux of message pattern a80
  // We could simplify the case but keep some of the setup ceremony for legibility

  // we use vatA as the sender of messages to B
  const { log: logA, getSyscall: getSyscallA } = await buildRawVat(
    'vatA',
    kernel,
    undefined,
  );
  // Build a pipelining vat which will reflect a message send to a promise
  const { log: logB, getSyscall: getSyscallB } = await buildRawVat(
    'vatB',
    kernel,
    undefined,
    { enablePipelining },
  );
  const syscallA = getSyscallA();
  const syscallB = getSyscallB();

  const vatA = kernel.vatNameToID('vatA');
  const vatB = kernel.vatNameToID('vatB');

  // B will need a reference to A
  const rootAvatA = 'o+0';
  const rootAkernel = kernel.addExport(vatA, rootAvatA);
  const rootAvatB = kernel.addImport(vatB, rootAkernel);

  // Bob sends a Promise to Alice as argument (leaving Bob as decider)
  // Alice sends a message to the received promise
  // Bob resolves the promise to an object in A (Alice itself here) (extraneous for this test)
  // Bob receives the message from Alice and reflects it back to Alice
  // B: alice~.one(p)
  // A: async function one (p) { r = p~.two(); }
  // B: p::resolve(alice)
  // B: alice~.two(result=r)

  const exportedPVatB = 'p+1';
  syscallB.send(rootAvatB, kser(['one', [kslot(exportedPVatB)]]));
  const pKernel = clistVatToKernel(kernel, vatB, exportedPVatB);
  await kernel.run();
  const importedPVatA = clistKernelToVat(kernel, vatA, pKernel);
  t.truthy(importedPVatA);
  // expect logA to have deliver(one)
  t.deepEqual(logA.shift(), {
    type: 'deliver',
    targetSlot: rootAvatA,
    methargs: kser(['one', [kslot(importedPVatA)]]),
    resultSlot: null,
  });
  t.deepEqual(logA, []);
  t.deepEqual(logB, []);

  const exportedRPVatA = 'p+2';
  syscallA.send(importedPVatA, kser(['two', []]), exportedRPVatA);
  syscallA.subscribe(exportedRPVatA);
  const rpKernel = clistVatToKernel(kernel, vatA, exportedRPVatA);
  await kernel.run();
  // Send is queued on the promise
  if (enablePipelining) {
    const importedRPVatB = clistKernelToVat(kernel, vatB, rpKernel);
    t.truthy(importedRPVatB);
    t.deepEqual(logB.shift(), {
      type: 'deliver',
      targetSlot: exportedPVatB,
      methargs: kser(['two', []]),
      resultSlot: importedRPVatB,
    });
    t.deepEqual(logA, []);
    t.deepEqual(logB, []);

    syscallB.send(rootAvatB, kser(['two', []]), importedRPVatB);
    await kernel.run();
  } else {
    // Send is queued to promise
    t.deepEqual(logA, []);
    t.deepEqual(logB, []);

    syscallB.resolve([[exportedPVatB, false, kser(kslot(rootAvatB))]]);
    await kernel.run();
  }

  // expect logA to have deliver(two)
  t.deepEqual(logA.shift(), {
    type: 'deliver',
    targetSlot: rootAvatA,
    methargs: kser(['two', []]),
    resultSlot: exportedRPVatA,
  });
  t.deepEqual(logA, []);
  t.deepEqual(logB, []);
}

doReflectedMessageTest.title = (_, enablePipelining) =>
  `kernel vpid handling reflected message (enablePipelining=${enablePipelining})`;

test('', doReflectedMessageTest, true);
test('', doReflectedMessageTest, false);

test('kernel vpid handling rejects imported result promise', async t => {
  const endowments = makeEndowments();
  await initializeKernel({}, endowments.kernelStorage);
  const kernel = buildKernel(endowments, {}, {});
  await kernel.start(undefined); // no bootstrapVatName, so no bootstrap call

  // This is negative test checking that non-pipelining vats are prevented
  // from using an imported promise as result

  // we use vatA as the sender of messages to B
  const { log: logA, getSyscall: getSyscallA } = await buildRawVat(
    'vatA',
    kernel,
    undefined,
  );
  // vatB is non-pipelining
  const { log: logB, getSyscall: getSyscallB } = await buildRawVat(
    'vatB',
    kernel,
    undefined,
    { enablePipelining: false },
  );
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

  // Alice sends a message to Bob (leaving Bob as decider of result promise)
  // Bob tries to send a message to Alice reusing the result promise from step one
  // A: r = bob~.one()
  // B: alice~.two(result=r)

  const exportedPRVatA = 'p+1';
  syscallA.send(rootBvatA, kser(['one', []]), exportedPRVatA);
  syscallA.subscribe(exportedPRVatA);
  const prKernel = clistVatToKernel(kernel, vatA, exportedPRVatA);
  await kernel.run();
  const importedPRVatB = clistKernelToVat(kernel, vatB, prKernel);
  t.truthy(importedPRVatB);
  // expect logB to have deliver(one)
  t.deepEqual(logB.shift(), {
    type: 'deliver',
    targetSlot: rootBvatB,
    methargs: kser(['one', []]),
    resultSlot: importedPRVatB,
  });
  t.deepEqual(logA, []);
  t.deepEqual(logB, []);

  t.throws(
    () => syscallB.send(rootAvatB, kser(['two', []]), importedPRVatB),
    undefined,
    'Send reusing imported promise should throw',
  );
  syscallB.subscribe(importedPRVatB);
  await kernel.run();

  t.deepEqual(logA, []);
  t.deepEqual(logB, []);
});

test('kernel vpid handling rejects previously exported result promise', async t => {
  const endowments = makeEndowments();
  await initializeKernel({}, endowments.kernelStorage);
  const kernel = buildKernel(endowments, {}, {});
  await kernel.start(undefined); // no bootstrapVatName, so no bootstrap call

  // This is negative test checking that non-pipelining vats are prevented
  // from using a previously exported promise for which they retained
  // decider-ship as result

  // we use vatA as the non-pipelining sender of messages to B
  const { log: logA, getSyscall: getSyscallA } = await buildRawVat(
    'vatA',
    kernel,
    undefined,
    { enablePipelining: false },
  );
  // vatB is the placeholder receiver
  const { log: logB } = await buildRawVat('vatB', kernel, undefined);
  const syscallA = getSyscallA();

  const vatA = kernel.vatNameToID('vatA');
  const vatB = kernel.vatNameToID('vatB');

  // A will need a reference to B, to send anything
  const rootBvatB = 'o+0';
  const rootBkernel = kernel.addExport(vatB, rootBvatB);
  const rootBvatA = kernel.addImport(vatA, rootBkernel);

  // Alice allocates a promise and sends it to Bob in the arguments of a
  // message as well as using it as the result of the message send
  // A: p1 = new Promise();
  // A: bob~.one(result=p1, p1)

  const exportedPRVatA = 'p+1';
  t.throws(() =>
    syscallA.send(
      rootBvatA,
      kser(['one', [kslot(exportedPRVatA)]]),
      exportedPRVatA,
    ),
  );
  syscallA.subscribe(exportedPRVatA);
  await kernel.run();
  t.deepEqual(logA, []);
  t.deepEqual(logB, []);
});
