/* global harden */
import { test } from 'tape-promise/tape';
import '../install-ses.js';
import { waitUntilQuiescent } from '../src/waitUntilQuiescent';
import { initSwingStore } from '@agoric/swing-store-simple';

import buildKernel from '../src/kernel/index';
import { makeVatSlot } from '../src/parseVatSlots';
import { checkKT } from './util';

function capdata(body, slots = []) {
  return harden({ body, slots });
}

function checkPromises(t, kernel, expected) {
  // extract the kernel promise table and assert that the contents match the
  // expected list. This sorts on the promise ID, then does a t.deepEqual
  function comparePromiseIDs(a, b) {
    return a.id - b.id;
  }

  const got = Array.from(kernel.dump().promises);
  got.sort(comparePromiseIDs);
  expected = Array.from(expected);
  expected.sort(comparePromiseIDs);
  t.deepEqual(got, expected);
}

function emptySetup(_syscall) {
  function deliver() {}
  return { deliver };
}

function makeEndowments() {
  return {
    waitUntilQuiescent,
    hostStorage: initSwingStore().storage,
    runEndOfCrank: () => {},
  };
}

test('build kernel', async t => {
  const kernel = buildKernel(makeEndowments());
  await kernel.start(); // empty queue
  const data = kernel.dump();
  t.deepEqual(data.vatTables, []);
  t.deepEqual(data.kernelTable, []);
  t.end();
});

test('simple call', async t => {
  const kernel = buildKernel(makeEndowments());
  const log = [];
  function setup1(syscall, state, helpers) {
    function deliver(facetID, method, args) {
      log.push([facetID, method, args]);
      helpers.log(JSON.stringify({ facetID, method, args }));
    }
    return { deliver };
  }
  kernel.addGenesisVat('vat1', setup1);
  await kernel.start();
  const vat1 = kernel.vatNameToID('vat1');
  let data = kernel.dump();
  t.deepEqual(data.vatTables, [{ vatID: vat1, state: { transcript: [] } }]);
  t.deepEqual(data.kernelTable, []);
  t.deepEqual(data.log, []);
  t.deepEqual(log, []);

  kernel.queueToExport(vat1, 'o+1', 'foo', capdata('args'));
  t.deepEqual(kernel.dump().runQueue, [
    {
      type: 'send',
      target: 'ko20',
      msg: {
        method: 'foo',
        args: capdata('args'),
        result: null,
      },
    },
  ]);
  t.deepEqual(log, []);
  await kernel.run();
  t.deepEqual(log, [['o+1', 'foo', capdata('args')]]);

  data = kernel.dump();
  t.equal(data.log.length, 1);
  t.deepEqual(JSON.parse(data.log[0]), {
    facetID: 'o+1',
    method: 'foo',
    args: capdata('args'),
  });

  t.end();
});

test('map inbound', async t => {
  const kernel = buildKernel(makeEndowments());
  const log = [];
  function setup1(_syscall) {
    function deliver(facetID, method, args) {
      log.push([facetID, method, args]);
    }
    return { deliver };
  }
  kernel.addGenesisVat('vat1', setup1);
  kernel.addGenesisVat('vat2', setup1);
  await kernel.start();
  const vat1 = kernel.vatNameToID('vat1');
  const vat2 = kernel.vatNameToID('vat2');
  const data = kernel.dump();
  t.deepEqual(data.vatTables, [
    { vatID: vat1, state: { transcript: [] } },
    { vatID: vat2, state: { transcript: [] } },
  ]);
  t.deepEqual(data.kernelTable, []);
  t.deepEqual(log, []);

  const koFor5 = kernel.addExport(vat1, 'o+5');
  const koFor6 = kernel.addExport(vat2, 'o+6');
  kernel.queueToExport(vat1, 'o+1', 'foo', capdata('args', [koFor5, koFor6]));
  t.deepEqual(kernel.dump().runQueue, [
    {
      type: 'send',
      target: 'ko22',
      msg: {
        method: 'foo',
        args: capdata('args', [koFor5, koFor6]),
        result: null,
      },
    },
  ]);
  t.deepEqual(log, []);
  await kernel.run();
  t.deepEqual(log, [['o+1', 'foo', capdata('args', ['o+5', 'o-50'])]]);
  t.deepEqual(kernel.dump().kernelTable, [
    [koFor5, vat1, 'o+5'],
    [koFor6, vat1, 'o-50'],
    [koFor6, vat2, 'o+6'],
    ['ko22', vat1, 'o+1'],
  ]);

  t.end();
});

test('addImport', async t => {
  const kernel = buildKernel(makeEndowments());
  function setup(_syscall) {
    function deliver(_facetID, _method, _args) {}
    return { deliver };
  }
  kernel.addGenesisVat('vat1', setup);
  kernel.addGenesisVat('vat2', setup);
  await kernel.start();
  const vat1 = kernel.vatNameToID('vat1');
  const vat2 = kernel.vatNameToID('vat2');

  const slot = kernel.addImport(vat1, kernel.addExport(vat2, 'o+5'));
  t.deepEqual(slot, 'o-50'); // first import
  t.deepEqual(kernel.dump().kernelTable, [
    ['ko20', vat1, 'o-50'],
    ['ko20', vat2, 'o+5'],
  ]);
  t.end();
});

test('outbound call', async t => {
  const kernel = buildKernel(makeEndowments());
  const log = [];
  let v1tovat25;
  const p7 = 'p+7';

  function setup1(syscall) {
    let nextPromiseIndex = 5;
    function allocatePromise() {
      const index = nextPromiseIndex;
      nextPromiseIndex += 1;
      return makeVatSlot('promise', true, index);
    }
    function deliver(facetID, method, args) {
      // console.log(`d1/${facetID} called`);
      log.push(['d1', facetID, method, args]);
      const pid = allocatePromise();
      syscall.send(
        v1tovat25,
        'bar',
        capdata('bargs', [v1tovat25, 'o+7', p7]),
        pid,
      );
    }
    return { deliver };
  }
  kernel.addGenesisVat('vat1', setup1);

  function setup2(_syscall) {
    function deliver(facetID, method, args) {
      // console.log(`d2/${facetID} called`);
      log.push(['d2', facetID, method, args]);
      log.push(['d2 promises', kernel.dump().promises]);
    }
    return { deliver };
  }
  kernel.addGenesisVat('vat2', setup2);
  await kernel.start();
  const vat1 = kernel.vatNameToID('vat1');
  const vat2 = kernel.vatNameToID('vat2');

  const t1 = kernel.addExport(vat1, 'o+1');
  const vat2Obj5 = kernel.addExport(vat2, 'o+5');
  v1tovat25 = kernel.addImport(vat1, vat2Obj5);
  t.deepEqual(v1tovat25, 'o-50'); // first allocation

  const data = kernel.dump();
  t.deepEqual(data.vatTables, [
    { vatID: vat1, state: { transcript: [] } },
    { vatID: vat2, state: { transcript: [] } },
  ]);

  const kt = [
    [t1, vat1, 'o+1'],
    ['ko21', vat1, v1tovat25],
    ['ko21', vat2, 'o+5'],
  ];
  checkKT(t, kernel, kt);
  t.deepEqual(log, []);

  // o1!foo(args)
  kernel.queueToExport(vat1, 'o+1', 'foo', capdata('args'));
  t.deepEqual(log, []);
  t.deepEqual(kernel.dump().runQueue, [
    {
      type: 'send',
      target: t1,
      msg: {
        method: 'foo',
        args: capdata('args'),
        result: null,
      },
    },
  ]);

  await kernel.step();
  // that queues pid=o2!bar(o2, o7, p7)

  t.deepEqual(log.shift(), ['d1', 'o+1', 'foo', capdata('args')]);
  t.deepEqual(log, []);

  t.deepEqual(kernel.dump().runQueue, [
    {
      type: 'send',
      target: vat2Obj5,
      msg: {
        method: 'bar',
        args: capdata('bargs', [vat2Obj5, 'ko22', 'kp40']),
        result: 'kp41',
      },
    },
  ]);
  t.deepEqual(kernel.dump().promises, [
    {
      id: 'kp40',
      state: 'unresolved',
      decider: vat1,
      subscribers: [],
      queue: [],
    },
    {
      id: 'kp41',
      state: 'unresolved',
      decider: undefined,
      subscribers: [],
      queue: [],
    },
  ]);

  kt.push(['ko22', vat1, 'o+7']);
  kt.push(['kp40', vat1, p7]);
  kt.push(['kp41', vat1, 'p+5']);
  checkKT(t, kernel, kt);

  await kernel.step();
  t.deepEqual(log, [
    // todo: check result
    ['d2', 'o+5', 'bar', capdata('bargs', ['o+5', 'o-50', 'p-60'])],
    [
      'd2 promises',
      [
        {
          id: 'kp40',
          state: 'unresolved',
          decider: vat1,
          subscribers: [],
          queue: [],
        },
        {
          id: 'kp41',
          state: 'unresolved',
          decider: vat2,
          subscribers: [],
          queue: [],
        },
      ],
    ],
  ]);

  kt.push(['ko22', vat2, 'o-50']);
  kt.push(['kp41', vat2, 'p-61']);
  kt.push(['kp40', vat2, 'p-60']);
  checkKT(t, kernel, kt);

  t.deepEqual(kernel.dump().promises, [
    {
      id: 'kp40',
      state: 'unresolved',
      decider: vat1,
      // Sending a promise from vat1 to vat2 doesn't cause vat2 to be
      // subscribed unless they want it. Liveslots will always subscribe,
      // because we don't have enough hooks into Promises to detect a
      // .then(), but non-liveslots vats don't have to.
      subscribers: [],
      queue: [],
    },
    {
      id: 'kp41',
      state: 'unresolved',
      decider: vat2,
      subscribers: [],
      queue: [],
    },
  ]);

  t.end();
});

test('three-party', async t => {
  const kernel = buildKernel(makeEndowments());
  const log = [];
  let bobForA;
  let carolForA;

  function setupA(syscall) {
    let nextPromiseIndex = 5;
    function allocatePromise() {
      const index = nextPromiseIndex;
      nextPromiseIndex += 1;
      return makeVatSlot('promise', true, index);
    }
    function deliver(facetID, method, args) {
      console.log(`vatA/${facetID} called`);
      log.push(['vatA', facetID, method, args]);
      const pid = allocatePromise();
      syscall.send(bobForA, 'intro', capdata('bargs', [carolForA]), pid);
      log.push(['vatA', 'promiseID', pid]);
    }
    return { deliver };
  }
  kernel.addGenesisVat('vatA', setupA);

  function setupB(_syscall) {
    function deliver(facetID, method, args) {
      console.log(`vatB/${facetID} called`);
      log.push(['vatB', facetID, method, args]);
    }
    return { deliver };
  }
  kernel.addGenesisVat('vatB', setupB);

  function setupC(_syscall) {
    function deliver(facetID, method, args) {
      log.push(['vatC', facetID, method, args]);
    }
    return { deliver };
  }
  kernel.addGenesisVat('vatC', setupC);

  await kernel.start();
  const vatA = kernel.vatNameToID('vatA');
  const vatB = kernel.vatNameToID('vatB');
  const vatC = kernel.vatNameToID('vatC');

  const alice = kernel.addExport(vatA, 'o+4');
  const bob = kernel.addExport(vatB, 'o+5');
  const carol = kernel.addExport(vatC, 'o+6');

  bobForA = kernel.addImport(vatA, bob);
  carolForA = kernel.addImport(vatA, carol);

  // do an extra allocation to make sure we aren't confusing the indices
  const extraP = 'p+99';
  const ap = kernel.addExport(vatA, extraP);

  const data = kernel.dump();
  t.deepEqual(data.vatTables, [
    { vatID: vatA, state: { transcript: [] } },
    { vatID: vatB, state: { transcript: [] } },
    { vatID: vatC, state: { transcript: [] } },
  ]);
  const kt = [
    [alice, vatA, 'o+4'],
    [bob, vatA, bobForA],
    [bob, vatB, 'o+5'],
    [carol, vatA, carolForA],
    [carol, vatC, 'o+6'],
    [ap, vatA, extraP],
  ];
  checkKT(t, kernel, kt);
  t.deepEqual(log, []);

  kernel.queueToExport(vatA, 'o+4', 'foo', capdata('args'));
  await kernel.step();

  t.deepEqual(log.shift(), ['vatA', 'o+4', 'foo', capdata('args')]);
  t.deepEqual(log.shift(), ['vatA', 'promiseID', 'p+5']);
  t.deepEqual(log, []);

  t.deepEqual(kernel.dump().runQueue, [
    {
      type: 'send',
      target: bob,
      msg: {
        method: 'intro',
        args: capdata('bargs', [carol]),
        result: 'kp41',
      },
    },
  ]);
  t.deepEqual(kernel.dump().promises, [
    {
      id: ap,
      state: 'unresolved',
      decider: vatA,
      subscribers: [],
      queue: [],
    },
    {
      id: 'kp41',
      state: 'unresolved',
      decider: undefined,
      subscribers: [],
      queue: [],
    },
  ]);
  kt.push(['kp41', vatA, 'p+5']);
  checkKT(t, kernel, kt);

  await kernel.step();
  t.deepEqual(log, [['vatB', 'o+5', 'intro', capdata('bargs', ['o-50'])]]);
  kt.push([carol, vatB, 'o-50']);
  kt.push(['kp41', vatB, 'p-60']);
  checkKT(t, kernel, kt);

  t.end();
});

test('transfer promise', async t => {
  const kernel = buildKernel(makeEndowments());
  let syscallA;
  const logA = [];
  function setupA(syscall) {
    syscallA = syscall;
    function deliver(facetID, method, args) {
      logA.push([facetID, method, args]);
    }
    return { deliver };
  }
  kernel.addGenesisVat('vatA', setupA);

  let syscallB;
  const logB = [];
  function setupB(syscall) {
    syscallB = syscall;
    function deliver(facetID, method, args) {
      logB.push([facetID, method, args]);
    }
    return { deliver };
  }
  kernel.addGenesisVat('vatB', setupB);

  await kernel.start();
  const vatA = kernel.vatNameToID('vatA');
  const vatB = kernel.vatNameToID('vatB');

  const alice = kernel.addExport(vatA, 'o+6');
  const bob = kernel.addExport(vatB, 'o+5');

  const B = kernel.addImport(vatA, bob);
  const A = kernel.addImport(vatB, alice);

  // we send pr1
  const pr1 = 'p+6';

  const kt = [
    ['ko20', vatA, 'o+6'],
    ['ko20', vatB, 'o-50'],
    ['ko21', vatA, 'o-50'],
    ['ko21', vatB, 'o+5'],
  ];
  checkKT(t, kernel, kt);
  const kp = [];
  checkPromises(t, kernel, kp);

  // sending a promise should arrive as a promise
  syscallA.send(B, 'foo1', capdata('args', [pr1]));
  t.deepEqual(kernel.dump().runQueue, [
    {
      type: 'send',
      target: bob,
      msg: {
        method: 'foo1',
        args: capdata('args', ['kp40']),
        result: null,
      },
    },
  ]);
  kt.push(['kp40', vatA, pr1]);
  checkKT(t, kernel, kt);
  kp.push({
    id: 'kp40',
    state: 'unresolved',
    decider: vatA,
    subscribers: [],
    queue: [],
  });
  checkPromises(t, kernel, kp);
  await kernel.run();
  t.deepEqual(logB.shift(), ['o+5', 'foo1', capdata('args', ['p-60'])]);
  t.deepEqual(logB, []);
  kt.push(['kp40', vatB, 'p-60']); // pr1 for B
  checkKT(t, kernel, kt);

  // sending it a second time should arrive as the same thing
  syscallA.send(B, 'foo2', capdata('args', [pr1]));
  await kernel.run();
  t.deepEqual(logB.shift(), ['o+5', 'foo2', capdata('args', ['p-60'])]);
  t.deepEqual(logB, []);
  checkKT(t, kernel, kt);
  checkPromises(t, kernel, kp);

  // sending it back should arrive with the sender's index
  syscallB.send(A, 'foo3', capdata('args', ['p-60']));
  await kernel.run();
  t.deepEqual(logA.shift(), ['o+6', 'foo3', capdata('args', [pr1])]);
  t.deepEqual(logA, []);
  checkKT(t, kernel, kt);
  checkPromises(t, kernel, kp);

  // sending it back a second time should arrive as the same thing
  syscallB.send(A, 'foo4', capdata('args', ['p-60']));
  await kernel.run();
  t.deepEqual(logA.shift(), ['o+6', 'foo4', capdata('args', [pr1])]);
  t.deepEqual(logA, []);
  checkPromises(t, kernel, kp);
  checkKT(t, kernel, kt);

  t.end();
});

test('subscribe to promise', async t => {
  const kernel = buildKernel(makeEndowments());
  let syscall;
  const log = [];
  function setup(s) {
    syscall = s;
    function deliver(facetID, method, args) {
      log.push(['deliver', facetID, method, args]);
    }
    return { deliver };
  }
  kernel.addGenesisVat('vat1', setup);
  kernel.addGenesisVat('vat2', emptySetup);

  await kernel.start();
  const vat1 = kernel.vatNameToID('vat1');
  const vat2 = kernel.vatNameToID('vat2');

  const kp = kernel.addExport(vat2, 'p+5');
  const pr = kernel.addImport(vat1, kp);
  t.deepEqual(pr, 'p-60');
  t.deepEqual(kernel.dump().kernelTable, [
    [kp, vat1, pr],
    [kp, vat2, 'p+5'],
  ]);

  syscall.subscribe(pr);
  t.deepEqual(kernel.dump().promises, [
    {
      id: kp,
      state: 'unresolved',
      decider: vat2,
      subscribers: [vat1],
      queue: [],
    },
  ]);
  t.deepEqual(kernel.dump().runQueue, []);
  t.deepEqual(log, []);

  t.end();
});

test('promise resolveToData', async t => {
  const kernel = buildKernel(makeEndowments());
  const log = [];

  let syscallA;
  function setupA(s) {
    syscallA = s;
    function deliver() {}
    function notifyFulfillToData(promiseID, data) {
      log.push(['notify', promiseID, data]);
    }
    return { deliver, notifyFulfillToData };
  }
  kernel.addGenesisVat('vatA', setupA);

  let syscallB;
  function setupB(s) {
    syscallB = s;
    function deliver() {}
    return { deliver };
  }
  kernel.addGenesisVat('vatB', setupB);
  await kernel.start();
  const vatA = kernel.vatNameToID('vatA');
  const vatB = kernel.vatNameToID('vatB');

  const aliceForA = 'o+6';
  const pForB = 'p+5';
  const pForKernel = kernel.addExport(vatB, pForB);
  const pForA = kernel.addImport(vatA, pForKernel);
  t.deepEqual(kernel.dump().kernelTable, [
    [pForKernel, vatA, pForA],
    [pForKernel, vatB, pForB],
  ]);

  syscallA.subscribe(pForA);
  t.deepEqual(kernel.dump().promises, [
    {
      id: pForKernel,
      state: 'unresolved',
      decider: vatB,
      subscribers: [vatA],
      queue: [],
    },
  ]);

  syscallB.fulfillToData(pForB, capdata('args', [aliceForA]));
  // this causes a notifyFulfillToData message to be queued
  t.deepEqual(log, []); // no other dispatch calls
  t.deepEqual(kernel.dump().runQueue, [
    {
      type: 'notify',
      vatID: vatA,
      kpid: pForKernel,
    },
  ]);

  await kernel.step();
  // the kernelPromiseID gets mapped back to the vat PromiseID
  t.deepEqual(log.shift(), ['notify', pForA, capdata('args', ['o-50'])]);
  t.deepEqual(log, []); // no other dispatch calls
  t.deepEqual(kernel.dump().promises, [
    {
      id: pForKernel,
      state: 'fulfilledToData',
      data: capdata('args', ['ko20']),
    },
  ]);
  t.deepEqual(kernel.dump().runQueue, []);

  t.end();
});

test('promise resolveToPresence', async t => {
  const kernel = buildKernel(makeEndowments());
  const log = [];

  let syscallA;
  function setupA(s) {
    syscallA = s;
    function deliver() {}
    function notifyFulfillToPresence(promiseID, slot) {
      log.push(['notify', promiseID, slot]);
    }
    return { deliver, notifyFulfillToPresence };
  }
  kernel.addGenesisVat('vatA', setupA);

  let syscallB;
  function setupB(s) {
    syscallB = s;
    function deliver() {}
    return { deliver };
  }
  kernel.addGenesisVat('vatB', setupB);
  await kernel.start();
  const vatA = kernel.vatNameToID('vatA');
  const vatB = kernel.vatNameToID('vatB');

  const bobForB = 'o+6';
  const bobForKernel = kernel.addExport(vatB, 'o+6');
  const bobForA = kernel.addImport(vatA, bobForKernel);

  const pForB = 'p+5';
  const pForKernel = kernel.addExport(vatB, 'p+5');
  const pForA = kernel.addImport(vatA, pForKernel);
  const kt = [
    [bobForKernel, vatB, bobForB],
    [bobForKernel, vatA, bobForA],
    [pForKernel, vatA, pForA],
    [pForKernel, vatB, pForB],
  ];
  checkKT(t, kernel, kt);

  syscallA.subscribe(pForA);
  t.deepEqual(kernel.dump().promises, [
    {
      id: pForKernel,
      state: 'unresolved',
      decider: vatB,
      subscribers: [vatA],
      queue: [],
    },
  ]);

  syscallB.fulfillToPresence(pForB, bobForB);
  t.deepEqual(log, []); // no other dispatch calls
  t.deepEqual(kernel.dump().runQueue, [
    {
      type: 'notify',
      vatID: vatA,
      kpid: pForKernel,
    },
  ]);

  await kernel.step();
  t.deepEqual(log.shift(), ['notify', pForA, bobForA]);
  t.deepEqual(log, []); // no other dispatch calls
  t.deepEqual(kernel.dump().promises, [
    {
      id: pForKernel,
      state: 'fulfilledToPresence',
      slot: bobForKernel,
    },
  ]);
  t.deepEqual(kernel.dump().runQueue, []);
  t.end();
});

test('promise reject', async t => {
  const kernel = buildKernel(makeEndowments());
  const log = [];

  let syscallA;
  function setupA(s) {
    syscallA = s;
    function deliver() {}
    function notifyReject(promiseID, rejectData) {
      log.push(['notify', promiseID, rejectData]);
    }
    return { deliver, notifyReject };
  }
  kernel.addGenesisVat('vatA', setupA);

  let syscallB;
  function setupB(s) {
    syscallB = s;
    function deliver() {}
    return { deliver };
  }
  kernel.addGenesisVat('vatB', setupB);
  await kernel.start();
  const vatA = kernel.vatNameToID('vatA');
  const vatB = kernel.vatNameToID('vatB');

  const aliceForA = 'o+6';
  const pForB = 'p+5';
  const pForKernel = kernel.addExport(vatB, pForB);
  const pForA = kernel.addImport(vatA, pForKernel);
  t.deepEqual(kernel.dump().kernelTable, [
    [pForKernel, vatA, pForA],
    [pForKernel, vatB, pForB],
  ]);

  syscallA.subscribe(pForA);
  t.deepEqual(kernel.dump().promises, [
    {
      id: pForKernel,
      state: 'unresolved',
      decider: vatB,
      subscribers: [vatA],
      queue: [],
    },
  ]);

  syscallB.reject(pForB, capdata('args', [aliceForA]));
  // this causes a notifyFulfillToData message to be queued
  t.deepEqual(log, []); // no other dispatch calls
  t.deepEqual(kernel.dump().runQueue, [
    {
      type: 'notify',
      vatID: vatA,
      kpid: pForKernel,
    },
  ]);

  await kernel.step();
  // the kernelPromiseID gets mapped back to the vat PromiseID
  t.deepEqual(log.shift(), ['notify', pForA, capdata('args', ['o-50'])]);
  t.deepEqual(log, []); // no other dispatch calls
  t.deepEqual(kernel.dump().promises, [
    {
      id: pForKernel,
      state: 'rejected',
      data: capdata('args', ['ko20']),
    },
  ]);
  t.deepEqual(kernel.dump().runQueue, []);

  t.end();
});

test('transcript', async t => {
  const aliceForAlice = 'o+1';
  const kernel = buildKernel(makeEndowments());
  function setup(syscall, _state) {
    function deliver(facetID, _method, args) {
      if (facetID === aliceForAlice) {
        syscall.send(args.slots[1], 'foo', capdata('fooarg'), 'p+5');
      }
    }
    return { deliver };
  }
  kernel.addGenesisVat('vatA', setup);
  kernel.addGenesisVat('vatB', emptySetup);
  await kernel.start();
  const vatA = kernel.vatNameToID('vatA');
  const vatB = kernel.vatNameToID('vatB');

  const alice = kernel.addExport(vatA, aliceForAlice);
  const bob = kernel.addExport(vatB, 'o+2');
  const bobForAlice = kernel.addImport(vatA, bob);

  kernel.queueToExport(
    vatA,
    aliceForAlice,
    'store',
    capdata('args string', [alice, bob]),
  );
  await kernel.step();

  // the transcript records vat-specific import/export slots

  const tr = kernel.dump().vatTables[0].state.transcript;
  t.equal(tr.length, 1);
  t.deepEqual(tr[0], {
    d: [
      'deliver',
      aliceForAlice,
      'store',
      capdata('args string', [aliceForAlice, bobForAlice]),
      null,
    ],
    syscalls: [
      {
        d: ['send', bobForAlice, 'foo', capdata('fooarg'), 'p+5'],
        response: null,
      },
    ],
    crankNumber: 1,
  });

  t.end();
});

// p1=x!foo(); p2=p1!bar(); p3=p2!urgh(); no pipelining. p1 will have a
// decider but p2 gets queued in p1 (not pipelined to vat-with-x) so p2 won't
// have a decider. Make sure p3 gets queued in p2 rather than exploding.

test('non-pipelined promise queueing', async t => {
  const kernel = buildKernel(makeEndowments());
  const log = [];

  let syscall;
  function setupA(s) {
    syscall = s;
    function deliver() {}
    return { deliver };
  }
  kernel.addGenesisVat('vatA', setupA);

  function setupB(_s) {
    function deliver(target, method, args, result) {
      log.push([target, method, args, result]);
    }
    return { deliver };
  }
  kernel.addGenesisVat('vatB', setupB);
  await kernel.start();
  const vatA = kernel.vatNameToID('vatA');
  const vatB = kernel.vatNameToID('vatB');

  const bobForB = 'o+6';
  const bobForKernel = kernel.addExport(vatB, bobForB);
  const bobForA = kernel.addImport(vatA, bobForKernel);

  const p1ForA = 'p+1';
  syscall.send(bobForA, 'foo', capdata('fooargs'), p1ForA);
  const p1ForKernel = kernel.addExport(vatA, p1ForA);

  const p2ForA = 'p+2';
  syscall.send(p1ForA, 'bar', capdata('barargs'), p2ForA);
  const p2ForKernel = kernel.addExport(vatA, p2ForA);

  const p3ForA = 'p+3';
  syscall.send(p2ForA, 'urgh', capdata('urghargs'), p3ForA);
  const p3ForKernel = kernel.addExport(vatA, p3ForA);

  t.deepEqual(kernel.dump().promises, [
    {
      id: p1ForKernel,
      state: 'unresolved',
      decider: undefined,
      subscribers: [],
      queue: [],
    },
    {
      id: p2ForKernel,
      state: 'unresolved',
      decider: undefined,
      subscribers: [],
      queue: [],
    },
    {
      id: p3ForKernel,
      state: 'unresolved',
      decider: undefined,
      subscribers: [],
      queue: [],
    },
  ]);

  await kernel.run();

  const p1ForB = kernel.addImport(vatB, p1ForKernel);
  t.deepEqual(log.shift(), [bobForB, 'foo', capdata('fooargs'), p1ForB]);
  t.deepEqual(log, []);

  t.deepEqual(kernel.dump().promises, [
    {
      id: p1ForKernel,
      state: 'unresolved',
      decider: vatB,
      subscribers: [],
      queue: [
        {
          method: 'bar',
          args: capdata('barargs'),
          result: p2ForKernel,
        },
      ],
    },
    {
      id: p2ForKernel,
      state: 'unresolved',
      decider: undefined,
      subscribers: [],
      queue: [
        {
          method: 'urgh',
          args: capdata('urghargs'),
          result: p3ForKernel,
        },
      ],
    },
    {
      id: p3ForKernel,
      state: 'unresolved',
      decider: undefined,
      subscribers: [],
      queue: [],
    },
  ]);

  t.end();
});

// p1=x!foo(); p2=p1!bar(); p3=p2!urgh(); with pipelining. All three should
// get delivered to vat-with-x.

test('pipelined promise queueing', async t => {
  const kernel = buildKernel(makeEndowments());
  const log = [];

  let syscall;
  function setupA(s) {
    syscall = s;
    function deliver() {}
    return { deliver };
  }
  kernel.addGenesisVat('vatA', setupA);

  function setupB(_s) {
    function deliver(target, method, args, result) {
      log.push([target, method, args, result]);
    }
    return { deliver };
  }
  kernel.addGenesisVat('vatB', setupB, { enablePipelining: true });
  await kernel.start();
  const vatA = kernel.vatNameToID('vatA');
  const vatB = kernel.vatNameToID('vatB');

  const bobForB = 'o+6';
  const bobForKernel = kernel.addExport(vatB, bobForB);
  const bobForA = kernel.addImport(vatA, bobForKernel);

  const p1ForA = 'p+1';
  syscall.send(bobForA, 'foo', capdata('fooargs'), p1ForA);
  const p1ForKernel = kernel.addExport(vatA, p1ForA);

  const p2ForA = 'p+2';
  syscall.send(p1ForA, 'bar', capdata('barargs'), p2ForA);
  const p2ForKernel = kernel.addExport(vatA, p2ForA);

  const p3ForA = 'p+3';
  syscall.send(p2ForA, 'urgh', capdata('urghargs'), p3ForA);
  const p3ForKernel = kernel.addExport(vatA, p3ForA);

  t.deepEqual(kernel.dump().promises, [
    {
      id: p1ForKernel,
      state: 'unresolved',
      decider: undefined,
      subscribers: [],
      queue: [],
    },
    {
      id: p2ForKernel,
      state: 'unresolved',
      decider: undefined,
      subscribers: [],
      queue: [],
    },
    {
      id: p3ForKernel,
      state: 'unresolved',
      decider: undefined,
      subscribers: [],
      queue: [],
    },
  ]);

  await kernel.run();

  const p1ForB = kernel.addImport(vatB, p1ForKernel);
  const p2ForB = kernel.addImport(vatB, p2ForKernel);
  const p3ForB = kernel.addImport(vatB, p3ForKernel);
  t.deepEqual(log.shift(), [bobForB, 'foo', capdata('fooargs'), p1ForB]);
  t.deepEqual(log.shift(), [p1ForB, 'bar', capdata('barargs'), p2ForB]);
  t.deepEqual(log.shift(), [p2ForB, 'urgh', capdata('urghargs'), p3ForB]);
  t.deepEqual(log, []);

  t.deepEqual(kernel.dump().promises, [
    {
      id: p1ForKernel,
      state: 'unresolved',
      decider: vatB,
      subscribers: [],
      queue: [],
    },
    {
      id: p2ForKernel,
      state: 'unresolved',
      decider: vatB,
      subscribers: [],
      queue: [],
    },
    {
      id: p3ForKernel,
      state: 'unresolved',
      decider: vatB,
      subscribers: [],
      queue: [],
    },
  ]);

  t.end();
});
