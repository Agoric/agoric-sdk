// eslint-disable-next-line import/order
import { test } from '../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { assert, details as X } from '@agoric/assert';
import buildKernel from '../src/kernel/index.js';
import { initializeKernel } from '../src/controller/initializeKernel.js';
import { makeVatSlot } from '../src/lib/parseVatSlots.js';
import { checkKT, extractMessage, makeKernelEndowments } from './util.js';

function capdata(body, slots = []) {
  return harden({ body, slots });
}

function capargs(args, slots = []) {
  return capdata(JSON.stringify(args), slots);
}

const slot0arg = { '@qclass': 'slot', index: 0 };
const emptyVP = capargs({});

function oneResolution(promiseID, rejected, data) {
  return [[promiseID, rejected, data]];
}

function checkPromises(t, kernel, expected) {
  // extract the kernel promise table and assert that the contents match the
  // expected list. This sorts on the promise ID, then does a t.deepEqual
  function comparePromiseIDs(a, b) {
    return Number(a.id - b.id);
  }

  const got = Array.from(kernel.dump().promises);
  got.sort(comparePromiseIDs);
  expected = Array.from(expected);
  expected.sort(comparePromiseIDs);
  t.deepEqual(got, expected);
}

function emptySetup(_syscall) {
  function dispatch() {}
  return dispatch;
}

function makeKernel() {
  const endowments = makeKernelEndowments();
  initializeKernel({}, endowments.hostStorage);
  return buildKernel(endowments, {}, {});
}

const tsv = [{ d: ['startVat', emptyVP], syscalls: [] }];

test('build kernel', async t => {
  const kernel = makeKernel();
  await kernel.start(); // empty queue
  const data = kernel.dump();
  t.deepEqual(data.vatTables, []);
  t.deepEqual(data.kernelTable, []);
});

test('simple call', async t => {
  const kernel = makeKernel();
  await kernel.start();
  const log = [];
  function setup1(syscall, state, _helpers, vatPowers) {
    function dispatch(vatDeliverObject) {
      // TODO: just push the vatDeliverObject
      if (vatDeliverObject[0] === 'startVat') {
        return; // skip startVat
      }
      const { facetID, method, args } = extractMessage(vatDeliverObject);
      log.push([facetID, method, args]);
      vatPowers.testLog(JSON.stringify({ facetID, method, args }));
    }
    return dispatch;
  }
  await kernel.createTestVat('vat1', setup1);
  const vat1 = kernel.vatNameToID('vat1');
  let data = kernel.dump();
  t.deepEqual(data.vatTables, [{ vatID: vat1, state: { transcript: tsv } }]);
  t.deepEqual(data.kernelTable, []);
  t.deepEqual(data.log, []);
  t.deepEqual(log, []);

  const o1 = kernel.addExport(vat1, 'o+1');
  kernel.queueToKref(o1, 'foo', capdata('args'));
  t.deepEqual(kernel.dump().acceptanceQueue, [
    {
      type: 'send',
      target: 'ko20',
      msg: {
        method: 'foo',
        args: capdata('args'),
        result: 'kp40',
      },
    },
  ]);
  t.deepEqual(log, []);
  await kernel.run();
  t.deepEqual(log, [['o+1', 'foo', capdata('args')]]);

  data = kernel.dump();
  t.is(data.log.length, 1);
  t.deepEqual(JSON.parse(data.log[0]), {
    facetID: 'o+1',
    method: 'foo',
    args: capdata('args'),
  });
});

test('vat store', async t => {
  const kernel = makeKernel();
  await kernel.start();
  const log = [];
  function setup(syscall, _state, _helpers, _vatPowers) {
    function dispatch(vatDeliverObject) {
      if (vatDeliverObject[0] === 'startVat') {
        return; // skip startVat
      }
      const { method, args } = extractMessage(vatDeliverObject);
      switch (method) {
        case 'get': {
          const v = syscall.vatstoreGet('zot');
          if (v) {
            log.push(`"${v}"`);
          } else {
            log.push(`${v}`);
          }
          break;
        }
        case 'store':
          syscall.vatstoreSet('zot', args.body);
          break;
        case 'delete':
          syscall.vatstoreDelete('zot');
          break;
        default:
          assert.fail(X`this can't happen`);
      }
    }
    return dispatch;
  }
  await kernel.createTestVat('vat', setup);
  const vat = kernel.vatNameToID('vat');

  const o1 = kernel.addExport(vat, 'o+1');
  kernel.queueToKref(o1, 'get', capdata('[]'));
  kernel.queueToKref(o1, 'store', capdata('first value'));
  kernel.queueToKref(o1, 'get', capdata('[]'));
  kernel.queueToKref(o1, 'store', capdata('second value'));
  kernel.queueToKref(o1, 'get', capdata('[]'));
  kernel.queueToKref(o1, 'delete', capdata('[]'));
  kernel.queueToKref(o1, 'get', capdata('[]'));
  t.deepEqual(log, []);
  await kernel.run();
  t.deepEqual(log, [
    'undefined',
    '"first value"',
    '"second value"',
    'undefined',
  ]);
  const data = kernel.dump();
  // check that we're not sticking an undefined into the transcript
  t.is(data.vatTables[0].state.transcript[1].syscalls[0].response, null);
});

test('map inbound', async t => {
  const kernel = makeKernel();
  await kernel.start();
  const log = [];
  function setup1(_syscall) {
    function dispatch(vatDeliverObject) {
      if (vatDeliverObject[0] === 'startVat') {
        return; // skip startVat
      }
      const { facetID, method, args } = extractMessage(vatDeliverObject);
      log.push([facetID, method, args]);
    }
    return dispatch;
  }
  await kernel.createTestVat('vat1', setup1);
  await kernel.createTestVat('vat2', setup1);
  const vat1 = kernel.vatNameToID('vat1');
  const vat2 = kernel.vatNameToID('vat2');
  const data = kernel.dump();
  t.deepEqual(data.vatTables, [
    { vatID: vat1, state: { transcript: tsv } },
    { vatID: vat2, state: { transcript: tsv } },
  ]);
  t.deepEqual(data.kernelTable, []);
  t.deepEqual(log, []);

  const o1 = kernel.addExport(vat1, 'o+1');
  const koFor5 = kernel.addExport(vat1, 'o+5');
  const koFor6 = kernel.addExport(vat2, 'o+6');
  kernel.queueToKref(o1, 'foo', capdata('args', [koFor5, koFor6]));
  t.deepEqual(kernel.dump().acceptanceQueue, [
    {
      type: 'send',
      target: o1,
      msg: {
        method: 'foo',
        args: capdata('args', [koFor5, koFor6]),
        result: 'kp40',
      },
    },
  ]);
  t.deepEqual(log, []);
  await kernel.run();
  t.deepEqual(log, [['o+1', 'foo', capdata('args', ['o+5', 'o-50'])]]);
  t.deepEqual(kernel.dump().kernelTable, [
    [o1, vat1, 'o+1'],
    [koFor5, vat1, 'o+5'],
    [koFor6, vat1, 'o-50'],
    [koFor6, vat2, 'o+6'],
    ['kp40', vat1, 'p-60'],
  ]);
});

test('addImport', async t => {
  const kernel = makeKernel();
  await kernel.start();
  function setup(_syscall) {
    function dispatch() {}
    return dispatch;
  }
  await kernel.createTestVat('vat1', setup);
  await kernel.createTestVat('vat2', setup);
  const vat1 = kernel.vatNameToID('vat1');
  const vat2 = kernel.vatNameToID('vat2');

  const slot = kernel.addImport(vat1, kernel.addExport(vat2, 'o+5'));
  t.deepEqual(slot, 'o-50'); // first import
  t.deepEqual(kernel.dump().kernelTable, [
    ['ko20', vat1, 'o-50'],
    ['ko20', vat2, 'o+5'],
  ]);
});

test('outbound call', async t => {
  const kernel = makeKernel();
  await kernel.start();
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
    function dispatch(vatDeliverObject) {
      if (vatDeliverObject[0] === 'startVat') {
        return; // skip startVat
      }
      const { facetID, method, args } = extractMessage(vatDeliverObject);
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
    return dispatch;
  }
  await kernel.createTestVat('vat1', setup1);

  function setup2(_syscall) {
    function dispatch(vatDeliverObject) {
      if (vatDeliverObject[0] === 'startVat') {
        return; // skip startVat
      }
      const { facetID, method, args } = extractMessage(vatDeliverObject);
      // console.log(`d2/${facetID} called`);
      log.push(['d2', facetID, method, args]);
      log.push(['d2 promises', kernel.dump().promises]);
    }
    return dispatch;
  }
  await kernel.createTestVat('vat2', setup2);
  const vat1 = kernel.vatNameToID('vat1');
  const vat2 = kernel.vatNameToID('vat2');

  const t1 = kernel.addExport(vat1, 'o+1');
  const vat2Obj5 = kernel.addExport(vat2, 'o+5');
  v1tovat25 = kernel.addImport(vat1, vat2Obj5);
  t.deepEqual(v1tovat25, 'o-50'); // first allocation

  const data = kernel.dump();
  t.deepEqual(data.vatTables, [
    { vatID: vat1, state: { transcript: tsv } },
    { vatID: vat2, state: { transcript: tsv } },
  ]);

  const kt = [
    [t1, vat1, 'o+1'],
    ['ko21', vat1, v1tovat25],
    ['ko21', vat2, 'o+5'],
  ];
  checkKT(t, kernel, kt);
  t.deepEqual(log, []);

  // o1!foo(args)
  const o1 = kernel.addExport(vat1, 'o+1');
  kernel.queueToKref(o1, 'foo', capdata('args'));
  t.deepEqual(log, []);
  t.deepEqual(kernel.dump().runQueue, []);
  t.deepEqual(kernel.dump().acceptanceQueue, [
    {
      type: 'send',
      target: t1,
      msg: {
        method: 'foo',
        args: capdata('args'),
        result: 'kp40',
      },
    },
  ]);

  // Move the send to the run-queue
  await kernel.step();
  t.deepEqual(log, []);
  t.deepEqual(kernel.dump().runQueue, [
    {
      type: 'send',
      target: t1,
      msg: {
        method: 'foo',
        args: capdata('args'),
        result: 'kp40',
      },
    },
  ]);
  t.deepEqual(kernel.dump().acceptanceQueue, []);

  // Deliver the send
  await kernel.step();
  // that queues pid=o2!bar(o2, o7, p7)

  t.deepEqual(log.shift(), ['d1', 'o+1', 'foo', capdata('args')]);
  t.deepEqual(log, []);

  t.deepEqual(kernel.dump().runQueue, []);
  t.deepEqual(kernel.dump().acceptanceQueue, [
    {
      type: 'send',
      target: vat2Obj5,
      msg: {
        method: 'bar',
        args: capdata('bargs', [vat2Obj5, 'ko22', 'kp41']),
        result: 'kp42',
      },
    },
  ]);
  t.deepEqual(kernel.dump().promises, [
    {
      id: 'kp40',
      state: 'unresolved',
      policy: 'ignore',
      refCount: 1,
      decider: vat1,
      subscribers: [],
      queue: [],
    },
    {
      id: 'kp41',
      state: 'unresolved',
      policy: 'ignore',
      refCount: 2,
      decider: vat1,
      subscribers: [],
      queue: [],
    },
    {
      id: 'kp42',
      state: 'unresolved',
      policy: 'ignore',
      refCount: 2,
      decider: undefined,
      subscribers: [],
      queue: [],
    },
  ]);

  kt.push(['ko22', vat1, 'o+7']);
  kt.push(['kp40', vat1, 'p-60']);
  kt.push(['kp41', vat1, p7]);
  kt.push(['kp42', vat1, 'p+5']);
  checkKT(t, kernel, kt);

  await kernel.step();
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
          policy: 'ignore',
          refCount: 1,
          decider: vat1,
          subscribers: [],
          queue: [],
        },
        {
          id: 'kp41',
          state: 'unresolved',
          policy: 'ignore',
          refCount: 2,
          decider: vat1,
          subscribers: [],
          queue: [],
        },
        {
          id: 'kp42',
          state: 'unresolved',
          policy: 'ignore',
          refCount: 2,
          decider: vat2,
          subscribers: [],
          queue: [],
        },
      ],
    ],
  ]);

  kt.push(['ko22', vat2, 'o-50']);
  kt.push(['kp42', vat2, 'p-61']);
  kt.push(['kp41', vat2, 'p-60']);
  checkKT(t, kernel, kt);

  t.deepEqual(kernel.dump().promises, [
    {
      id: 'kp40',
      state: 'unresolved',
      policy: 'ignore',
      refCount: 1,
      decider: vat1,
      subscribers: [],
      queue: [],
    },
    {
      id: 'kp41',
      state: 'unresolved',
      policy: 'ignore',
      refCount: 2,
      decider: vat1,
      // Sending a promise from vat1 to vat2 doesn't cause vat2 to be
      // subscribed unless they want it. Liveslots will always subscribe,
      // because we don't have enough hooks into Promises to detect a
      // .then(), but non-liveslots vats don't have to.
      subscribers: [],
      queue: [],
    },
    {
      id: 'kp42',
      state: 'unresolved',
      policy: 'ignore',
      refCount: 2,
      decider: vat2,
      subscribers: [],
      queue: [],
    },
  ]);
});

test('three-party', async t => {
  const kernel = makeKernel();
  await kernel.start();
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
    function dispatch(vatDeliverObject) {
      if (vatDeliverObject[0] === 'startVat') {
        return; // skip startVat
      }
      const { facetID, method, args } = extractMessage(vatDeliverObject);
      // console.log(`vatA/${facetID} called`);
      log.push(['vatA', facetID, method, args]);
      const pid = allocatePromise();
      syscall.send(bobForA, 'intro', capdata('bargs', [carolForA]), pid);
      log.push(['vatA', 'promiseID', pid]);
    }
    return dispatch;
  }
  await kernel.createTestVat('vatA', setupA);

  function setupB(_syscall) {
    function dispatch(vatDeliverObject) {
      if (vatDeliverObject[0] === 'startVat') {
        return; // skip startVat
      }
      const { facetID, method, args } = extractMessage(vatDeliverObject);
      // console.log(`vatB/${facetID} called`);
      log.push(['vatB', facetID, method, args]);
    }
    return dispatch;
  }
  await kernel.createTestVat('vatB', setupB);

  function setupC(_syscall) {
    function dispatch(vatDeliverObject) {
      if (vatDeliverObject[0] === 'startVat') {
        return; // skip startVat
      }
      const { facetID, method, args } = extractMessage(vatDeliverObject);
      log.push(['vatC', facetID, method, args]);
    }
    return dispatch;
  }
  await kernel.createTestVat('vatC', setupC);

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
    { vatID: vatA, state: { transcript: tsv } },
    { vatID: vatB, state: { transcript: tsv } },
    { vatID: vatC, state: { transcript: tsv } },
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

  const o4 = kernel.addExport(vatA, 'o+4');
  kernel.queueToKref(o4, 'foo', capdata('args'));
  // Move the send to the run-queue
  await kernel.step();
  // Deliver the send
  await kernel.step();

  t.deepEqual(log.shift(), ['vatA', 'o+4', 'foo', capdata('args')]);
  t.deepEqual(log.shift(), ['vatA', 'promiseID', 'p+5']);
  t.deepEqual(log, []);

  t.deepEqual(kernel.dump().runQueue, []);
  t.deepEqual(kernel.dump().acceptanceQueue, [
    {
      type: 'send',
      target: bob,
      msg: {
        method: 'intro',
        args: capdata('bargs', [carol]),
        result: 'kp42',
      },
    },
  ]);
  t.deepEqual(kernel.dump().promises, [
    {
      id: ap,
      state: 'unresolved',
      policy: 'ignore',
      refCount: 2,
      decider: vatA,
      subscribers: [],
      queue: [],
    },
    {
      id: 'kp41',
      state: 'unresolved',
      policy: 'ignore',
      refCount: 1,
      decider: vatA,
      subscribers: [],
      queue: [],
    },
    {
      id: 'kp42',
      state: 'unresolved',
      policy: 'ignore',
      refCount: 2,
      decider: undefined,
      subscribers: [],
      queue: [],
    },
  ]);
  kt.push(['kp41', vatA, 'p-60']);
  kt.push(['kp42', vatA, 'p+5']);
  checkKT(t, kernel, kt);

  await kernel.step();
  await kernel.step();
  t.deepEqual(log, [['vatB', 'o+5', 'intro', capdata('bargs', ['o-50'])]]);
  kt.push([carol, vatB, 'o-50']);
  kt.push(['kp42', vatB, 'p-60']);
  checkKT(t, kernel, kt);
});

test('transfer promise', async t => {
  const kernel = makeKernel();
  await kernel.start();
  let syscallA;
  const logA = [];
  function setupA(syscall) {
    syscallA = syscall;
    function dispatch(vatDeliverObject) {
      if (vatDeliverObject[0] === 'startVat') {
        return; // skip startVat
      }
      const { facetID, method, args } = extractMessage(vatDeliverObject);
      logA.push([facetID, method, args]);
    }
    return dispatch;
  }
  await kernel.createTestVat('vatA', setupA);

  let syscallB;
  const logB = [];
  function setupB(syscall) {
    syscallB = syscall;
    function dispatch(vatDeliverObject) {
      if (vatDeliverObject[0] === 'startVat') {
        return; // skip startVat
      }
      const { facetID, method, args } = extractMessage(vatDeliverObject);
      logB.push([facetID, method, args]);
    }
    return dispatch;
  }
  await kernel.createTestVat('vatB', setupB);

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
  t.deepEqual(kernel.dump().acceptanceQueue, [
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
    policy: 'ignore',
    refCount: 2,
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
});

test('subscribe to promise', async t => {
  const kernel = makeKernel();
  await kernel.start();
  let syscall;
  const log = [];
  function setup(s) {
    syscall = s;
    function dispatch(vatDeliverObject) {
      if (vatDeliverObject[0] === 'startVat') {
        return; // skip startVat
      }
      const { facetID, method, args } = extractMessage(vatDeliverObject);
      log.push(['deliver', facetID, method, args]);
    }
    return dispatch;
  }
  await kernel.createTestVat('vat1', setup);
  await kernel.createTestVat('vat2', emptySetup);

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
      policy: 'ignore',
      refCount: 3,
      decider: vat2,
      subscribers: [vat1],
      queue: [],
    },
  ]);
  t.deepEqual(kernel.dump().runQueue, []);
  t.deepEqual(log, []);
});

test('promise resolveToData', async t => {
  const kernel = makeKernel();
  await kernel.start();
  const log = [];

  let syscallA;
  function setupA(s) {
    syscallA = s;
    function dispatch(vatDeliverObject) {
      if (vatDeliverObject[0] === 'startVat') {
        return; // skip startVat
      }
      log.push(vatDeliverObject);
    }
    return dispatch;
  }
  await kernel.createTestVat('vatA', setupA);

  let syscallB;
  function setupB(s) {
    syscallB = s;
    function dispatch() {}
    return dispatch;
  }
  await kernel.createTestVat('vatB', setupB);

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
      policy: 'ignore',
      refCount: 3,
      decider: vatB,
      subscribers: [vatA],
      queue: [],
    },
  ]);

  syscallB.resolve([[pForB, false, capdata('"args"', [aliceForA])]]);
  // this causes a notify message to be queued
  t.deepEqual(log, []); // no other dispatch calls
  t.deepEqual(kernel.dump().acceptanceQueue, [
    {
      type: 'notify',
      vatID: vatA,
      kpid: pForKernel,
    },
  ]);

  // Move the notify to the run-queue
  await kernel.step();
  // Deliver the notify
  await kernel.step();

  // the kernelPromiseID gets mapped back to the vat PromiseID
  t.deepEqual(log.shift(), [
    'notify',
    oneResolution(pForA, false, capdata('"args"', ['o-50'])),
  ]);
  t.deepEqual(log, []); // no other dispatch calls
  t.deepEqual(kernel.dump().runQueue, []);
});

test('promise resolveToPresence', async t => {
  const kernel = makeKernel();
  await kernel.start();
  const log = [];

  let syscallA;
  function setupA(s) {
    syscallA = s;
    function dispatch(vatDeliverObject) {
      if (vatDeliverObject[0] === 'startVat') {
        return; // skip startVat
      }
      log.push(vatDeliverObject);
    }
    return dispatch;
  }
  await kernel.createTestVat('vatA', setupA);

  let syscallB;
  function setupB(s) {
    syscallB = s;
    function dispatch() {}
    return dispatch;
  }
  await kernel.createTestVat('vatB', setupB);

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
      policy: 'ignore',
      refCount: 3,
      decider: vatB,
      subscribers: [vatA],
      queue: [],
    },
  ]);

  syscallB.resolve([[pForB, false, capargs(slot0arg, [bobForB])]]);
  t.deepEqual(log, []); // no other dispatch calls
  t.deepEqual(kernel.dump().acceptanceQueue, [
    {
      type: 'notify',
      vatID: vatA,
      kpid: pForKernel,
    },
  ]);

  // Move the notify to the run-queue
  await kernel.step();
  // Deliver the notify
  await kernel.step();
  t.deepEqual(log.shift(), [
    'notify',
    oneResolution(pForA, false, {
      body: '{"@qclass":"slot","index":0}',
      slots: [bobForA],
    }),
  ]);
  t.deepEqual(log, []); // no other dispatch calls
  t.deepEqual(kernel.dump().runQueue, []);
  t.deepEqual(kernel.dump().acceptanceQueue, []);
});

test('promise fails when resolve to promise', async t => {
  const kernel = makeKernel();
  await kernel.start();
  const log = [];

  let syscallA;
  function setupA(s) {
    syscallA = s;
    function dispatch(vatDeliverObject) {
      if (vatDeliverObject[0] === 'startVat') {
        return; // skip startVat
      }
      log.push(vatDeliverObject);
    }
    return dispatch;
  }
  await kernel.createTestVat('vatA', setupA);

  let syscallB;
  function setupB(s) {
    syscallB = s;
    function dispatch() {}
    return dispatch;
  }
  await kernel.createTestVat('vatB', setupB);

  const vatA = kernel.vatNameToID('vatA');
  const vatB = kernel.vatNameToID('vatB');

  const p1ForB = 'p+5';
  const p1ForKernel = kernel.addExport(vatB, p1ForB);
  const p1ForA = kernel.addImport(vatA, p1ForKernel);

  const p2ForB = 'p+6';

  syscallA.subscribe(p1ForA);
  t.deepEqual(kernel.dump().promises, [
    {
      id: p1ForKernel,
      state: 'unresolved',
      policy: 'ignore',
      refCount: 3,
      decider: vatB,
      subscribers: [vatA],
      queue: [],
    },
  ]);

  t.throws(
    () => syscallB.resolve([[p1ForB, false, capargs(slot0arg, [p2ForB])]]),
    undefined,
    `Should throw when resolving to promise`,
  );
  t.deepEqual(log, []);
  t.deepEqual(kernel.dump().runQueue, []);
  t.deepEqual(kernel.dump().acceptanceQueue, []);
});

test('promise reject', async t => {
  const kernel = makeKernel();
  await kernel.start();
  const log = [];

  let syscallA;
  function setupA(s) {
    syscallA = s;
    function dispatch(vatDeliverObject) {
      if (vatDeliverObject[0] === 'startVat') {
        return; // skip startVat
      }
      log.push(vatDeliverObject);
    }
    return dispatch;
  }
  await kernel.createTestVat('vatA', setupA);

  let syscallB;
  function setupB(s) {
    syscallB = s;
    function dispatch() {}
    return dispatch;
  }
  await kernel.createTestVat('vatB', setupB);

  const vatA = kernel.vatNameToID('vatA');
  const vatB = kernel.vatNameToID('vatB');

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
      policy: 'ignore',
      refCount: 3,
      decider: vatB,
      subscribers: [vatA],
      queue: [],
    },
  ]);

  // Reject the promise with itself
  syscallB.resolve([[pForB, true, capargs(slot0arg, [pForB])]]);
  // this causes a notify message to be queued
  t.deepEqual(log, []); // no other dispatch calls
  t.deepEqual(kernel.dump().acceptanceQueue, [
    {
      type: 'notify',
      vatID: vatA,
      kpid: pForKernel,
    },
  ]);

  // Move the notify to the run-queue
  await kernel.step();
  // Deliver the notify
  await kernel.step();
  // the kernelPromiseID gets mapped back to the vat PromiseID
  t.deepEqual(log.shift(), [
    'notify',
    oneResolution(pForA, true, capargs(slot0arg, [pForA])),
  ]);
  t.deepEqual(log, []); // no other dispatch calls
  t.deepEqual(kernel.dump().runQueue, []);
  t.deepEqual(kernel.dump().acceptanceQueue, []);
});

async function doResultInArgs(t, enablePipelining) {
  // https://github.com/Agoric/agoric-sdk/issues/5189
  const kernel = makeKernel();
  await kernel.start();

  // Alice sends a message to Bob which references its own result
  // promise, Bob receives it. We allow this from pipelining vats like
  // comms (since remote systems might do that, and we don't want to
  // let that kill the comms vat), but not from local vats.

  const logA = [];
  let syscallA;
  function setupA(s) {
    syscallA = s;
    function dispatch(vatDeliverObject) {
      if (vatDeliverObject[0] === 'startVat') {
        return; // skip startVat
      }
      logA.push(vatDeliverObject);
    }
    return dispatch;
  }
  await kernel.createTestVat('vatA', setupA, {}, { enablePipelining });

  const logB = [];
  function setupB() {
    function dispatch(vatDeliverObject) {
      if (vatDeliverObject[0] === 'startVat') {
        return; // skip startVat
      }
      logB.push(vatDeliverObject);
    }
    return dispatch;
  }
  await kernel.createTestVat('vatB', setupB);

  const vatA = kernel.vatNameToID('vatA');
  const vatB = kernel.vatNameToID('vatB');

  const bobForB = 'o+5';
  const bobKref = kernel.addExport(vatB, bobForB);
  const bobForA = kernel.addImport(vatA, bobKref);

  const resP = 'p+1';
  const args = { resP: { '@qclass': 'slot', index: 0 } };
  if (!enablePipelining) {
    console.log(`intentional error, should get 'p+1 is already allocated'`);
    t.throws(() => syscallA.send(bobForA, 'one', capargs(args, [resP]), resP), {
      message: /syscall translation error: prepare to die/,
    });
    return;
  }
  syscallA.send(bobForA, 'one', capargs(args, [resP]), resP);

  const q1 = kernel.dump().acceptanceQueue[0];
  const m1 = q1.msg;
  const kpid = m1.result; // probably kp40
  t.is(kernel.dump().promises.length, 1);
  const p1 = kernel.dump().promises[0];
  t.is(p1.id, kpid);
  // if vatTranslator translated args before result, then 1: resP
  // might look like an exported promise, leaving decider as vatA, and
  // 2: the translator would balk at translating a non-new resP
  t.is(p1.decider, undefined);

  await kernel.run();
  const b1 = logB.shift();
  t.is(b1[0], 'message');
  t.is(b1[2].result, b1[2].args.slots[0]);

  t.is(kernel.dump().promises.length, 1);
  // vatB should now hold decision-making authority
  const p2 = kernel.dump().promises[0];
  t.is(p2.id, kpid);
  t.is(p2.decider, vatB);
}

test('result promise in args (pipelining)', doResultInArgs, true);

test('result promise in args (non-pipelining)', doResultInArgs, false);

test('transcript', async t => {
  const aliceForAlice = 'o+1';
  const kernel = makeKernel();
  await kernel.start();

  function setup(syscall, _state) {
    function dispatch(vatDeliverObject) {
      if (vatDeliverObject[0] === 'startVat') {
        return; // skip startVat
      }
      const { facetID, args } = extractMessage(vatDeliverObject);
      if (facetID === aliceForAlice) {
        syscall.send(args.slots[1], 'foo', capdata('fooarg'), 'p+5');
      }
    }
    return dispatch;
  }
  await kernel.createTestVat('vatA', setup);
  await kernel.createTestVat('vatB', emptySetup);
  const vatA = kernel.vatNameToID('vatA');
  const vatB = kernel.vatNameToID('vatB');

  const alice = kernel.addExport(vatA, aliceForAlice);
  const bob = kernel.addExport(vatB, 'o+2');
  const bobForAlice = kernel.addImport(vatA, bob);

  kernel.queueToKref(alice, 'store', capdata('args string', [alice, bob]));
  // Move the send to the run-queue
  await kernel.step();
  // Deliver the send
  await kernel.step();

  // the transcript records vat-specific import/export slots

  const tr = kernel.dump().vatTables[0].state.transcript;
  t.is(tr.length, 2);
  t.deepEqual(tr[0], tsv[0]);
  t.deepEqual(tr[1], {
    d: [
      'message',
      aliceForAlice,
      {
        method: 'store',
        args: capdata('args string', [aliceForAlice, bobForAlice]),
        result: 'p-60',
      },
    ],
    syscalls: [
      {
        d: [
          'send',
          bobForAlice,
          { method: 'foo', args: capdata('fooarg'), result: 'p+5' },
        ],
        response: null,
      },
    ],
  });
});

// p1=x!foo(); p2=p1!bar(); p3=p2!urgh(); no pipelining. p1 will have a
// decider but bar gets queued in p1 (not pipelined to vat-with-x) so p2 won't
// have a decider. Make sure urgh gets queued in p2 rather than exploding.

test('non-pipelined promise queueing', async t => {
  const kernel = makeKernel();
  await kernel.start();
  const log = [];

  let syscall;
  function setupA(s) {
    syscall = s;
    function dispatch() {}
    return dispatch;
  }
  await kernel.createTestVat('vatA', setupA);

  function setupB(_s) {
    function dispatch(vatDeliverObject) {
      if (vatDeliverObject[0] === 'startVat') {
        return; // skip startVat
      }
      const { facetID, method, args, result } =
        extractMessage(vatDeliverObject);
      log.push([facetID, method, args, result]);
    }
    return dispatch;
  }
  await kernel.createTestVat('vatB', setupB);

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
      policy: 'ignore',
      refCount: 4,
      decider: undefined,
      subscribers: [],
      queue: [],
    },
    {
      id: p2ForKernel,
      state: 'unresolved',
      policy: 'ignore',
      refCount: 4,
      decider: undefined,
      subscribers: [],
      queue: [],
    },
    {
      id: p3ForKernel,
      state: 'unresolved',
      policy: 'ignore',
      refCount: 3,
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
      policy: 'ignore',
      refCount: 4,
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
      policy: 'ignore',
      refCount: 4,
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
      policy: 'ignore',
      refCount: 3,
      decider: undefined,
      subscribers: [],
      queue: [],
    },
  ]);
});

// p1=x!foo(); p2=p1!bar(); p3=p2!urgh(); with pipelining. All three should
// get delivered to vat-with-x.

const pipelinedSendTest = async (t, delayed) => {
  const kernel = makeKernel();
  await kernel.start();
  const log = [];

  let syscall;
  function setupA(s) {
    syscall = s;
    function dispatch() {}
    return dispatch;
  }
  await kernel.createTestVat('vatA', setupA);

  function setupB(_s) {
    function dispatch(vatDeliverObject) {
      if (vatDeliverObject[0] === 'startVat') {
        return; // skip startVat
      }
      const { facetID, method, args, result } =
        extractMessage(vatDeliverObject);
      log.push([facetID, method, args, result]);
    }
    return dispatch;
  }
  await kernel.createTestVat('vatB', setupB, {}, { enablePipelining: true });

  const vatA = kernel.vatNameToID('vatA');
  const vatB = kernel.vatNameToID('vatB');

  const bobForB = 'o+6';
  const bobForKernel = kernel.addExport(vatB, bobForB);
  const bobForA = kernel.addImport(vatA, bobForKernel);

  const p0ForA = 'p+0';
  const p0ForKernel = kernel.addExport(vatA, p0ForA);

  const initialTarget = delayed ? p0ForA : bobForA;

  const p1ForA = 'p+1';
  syscall.send(initialTarget, 'foo', capdata('fooargs'), p1ForA);
  const p1ForKernel = kernel.addExport(vatA, p1ForA);

  const p2ForA = 'p+2';
  syscall.send(p1ForA, 'bar', capdata('barargs'), p2ForA);
  const p2ForKernel = kernel.addExport(vatA, p2ForA);

  const p3ForA = 'p+3';
  syscall.send(p2ForA, 'urgh', capdata('urghargs'), p3ForA);
  const p3ForKernel = kernel.addExport(vatA, p3ForA);

  t.deepEqual(kernel.dump().promises, [
    {
      id: p0ForKernel,
      state: 'unresolved',
      policy: 'ignore',
      refCount: delayed ? 3 : 2,
      decider: vatA,
      subscribers: [],
      queue: [],
    },
    {
      id: p1ForKernel,
      state: 'unresolved',
      policy: 'ignore',
      refCount: 4,
      decider: undefined,
      subscribers: [],
      queue: [],
    },
    {
      id: p2ForKernel,
      state: 'unresolved',
      policy: 'ignore',
      refCount: 4,
      decider: undefined,
      subscribers: [],
      queue: [],
    },
    {
      id: p3ForKernel,
      state: 'unresolved',
      policy: 'ignore',
      refCount: 3,
      decider: undefined,
      subscribers: [],
      queue: [],
    },
  ]);

  // move foo send from acceptance to run-queue
  await kernel.step();
  // move bar send from acceptance to run-queue
  await kernel.step();
  // move urgh send from acceptance to run-queue
  await kernel.step();
  // deliver/move foo send from run-queue to vatB/p0-queue
  await kernel.step();
  // deliver/move bar send from run-queue to vatB/p1-queue
  await kernel.step();
  // deliver/move urgh send from run-queue to vatB/p2-queue
  await kernel.step();

  if (delayed) {
    t.deepEqual(log, []);
    t.deepEqual(kernel.dump().promises, [
      {
        id: p0ForKernel,
        state: 'unresolved',
        policy: 'ignore',
        refCount: 3,
        decider: vatA,
        subscribers: [],
        queue: [
          {
            method: 'foo',
            args: capdata('fooargs'),
            result: p1ForKernel,
          },
        ],
      },
      {
        id: p1ForKernel,
        state: 'unresolved',
        policy: 'ignore',
        refCount: 4,
        decider: undefined,
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
        policy: 'ignore',
        refCount: 4,
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
        policy: 'ignore',
        refCount: 3,
        decider: undefined,
        subscribers: [],
        queue: [],
      },
    ]);

    syscall.resolve([[p0ForA, false, capargs(slot0arg, [bobForA])]]);

    // move foo send from acceptance to run-queue
    await kernel.step();
    // deliver foo send from run-queue to vatB
    await kernel.step();
    // move bar send from acceptance to run-queue
    await kernel.step();
    // deliver bar send from run-queue to vatB
    await kernel.step();
    // move urgh send from acceptance to run-queue
    await kernel.step();
    // deliver urgh send from run-queue to vatB
    await kernel.step();
  }

  const p1ForB = kernel.addImport(vatB, p1ForKernel);
  const p2ForB = kernel.addImport(vatB, p2ForKernel);
  const p3ForB = kernel.addImport(vatB, p3ForKernel);
  t.deepEqual(log.shift(), [bobForB, 'foo', capdata('fooargs'), p1ForB]);
  t.deepEqual(log.shift(), [p1ForB, 'bar', capdata('barargs'), p2ForB]);
  t.deepEqual(log.shift(), [p2ForB, 'urgh', capdata('urghargs'), p3ForB]);
  t.deepEqual(log, []);

  t.deepEqual(kernel.dump().promises, [
    delayed
      ? {
          id: p0ForKernel,
          state: 'fulfilled',
          refCount: 1,
          data: capargs(slot0arg, [bobForKernel]),
        }
      : {
          id: p0ForKernel,
          state: 'unresolved',
          policy: 'ignore',
          refCount: 2,
          decider: vatA,
          subscribers: [],
          queue: [],
        },
    {
      id: p1ForKernel,
      state: 'unresolved',
      policy: 'ignore',
      refCount: 3,
      decider: vatB,
      subscribers: [],
      queue: [],
    },
    {
      id: p2ForKernel,
      state: 'unresolved',
      policy: 'ignore',
      refCount: 3,
      decider: vatB,
      subscribers: [],
      queue: [],
    },
    {
      id: p3ForKernel,
      state: 'unresolved',
      policy: 'ignore',
      refCount: 3,
      decider: vatB,
      subscribers: [],
      queue: [],
    },
  ]);
};

test('pipelined promise queueing', pipelinedSendTest, false);
test('pipelined promise queueing with delay', pipelinedSendTest, true);

test('xs-worker default manager type', async t => {
  const endowments = makeKernelEndowments();
  initializeKernel({ defaultManagerType: 'xs-worker' }, endowments.hostStorage);
  buildKernel(endowments, {}, {});
  t.deepEqual(
    endowments.hostStorage.kvStore.get('kernel.defaultManagerType'),
    'xs-worker',
  );
});

async function reapTest(t, freq) {
  const kernel = makeKernel();
  await kernel.start();
  const log = [];
  function setup() {
    function dispatch(vatDeliverObject) {
      if (vatDeliverObject[0] === 'startVat') {
        return; // skip startVat
      }
      log.push(vatDeliverObject);
    }
    return dispatch;
  }
  await kernel.createTestVat('vat1', setup, {}, { reapInterval: freq });
  const vat1 = kernel.vatNameToID('vat1');
  t.deepEqual(log, []);

  const vatRoot = kernel.addExport(vat1, 'o+1');
  function deliverMessage(ordinal) {
    kernel.queueToKref(vatRoot, `msg_${ordinal}`, capdata('[]'));
  }
  function matchMsg(ordinal) {
    return [
      'message',
      'o+1',
      {
        args: {
          body: '[]',
          slots: [],
        },
        method: `msg_${ordinal}`,
        result: `p-${60 + ordinal}`,
      },
    ];
  }
  function matchReap() {
    return ['bringOutYourDead'];
  }

  for (let i = 0; i < 100; i += 1) {
    deliverMessage(i);
  }
  t.deepEqual(log, []);
  await kernel.run();
  for (let i = 0; i < 100; i += 1) {
    t.deepEqual(log.shift(), matchMsg(i));
    if (freq !== 'never' && (i + 1) % freq === 0) {
      t.deepEqual(log.shift(), matchReap());
    }
  }
  t.deepEqual(log, []);
}

test('reap interval 1', async t => {
  await reapTest(t, 1);
});

test('reap interval 2', async t => {
  await reapTest(t, 2);
});

test('reap interval 5', async t => {
  await reapTest(t, 5);
});

test('reap interval 17', async t => {
  await reapTest(t, 17);
});

test('reap interval never', async t => {
  await reapTest(t, 'never');
});
