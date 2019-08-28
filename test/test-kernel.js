// eslint-disable-next-line no-redeclare
/* global setImmediate */
import { test } from 'tape-promise/tape';
import buildKernel from '../src/kernel/index';
import { checkKT } from './util';

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

test('build kernel', async t => {
  const kernel = buildKernel({ setImmediate });
  await kernel.start(); // empty queue
  const data = kernel.dump();
  t.deepEqual(data.vatTables, []);
  t.deepEqual(data.kernelTable, []);
  t.end();
});

test('simple call', async t => {
  const kernel = buildKernel({ setImmediate });
  const log = [];
  function setup1(syscall, state, helpers) {
    function deliver(facetID, method, argsString, slots) {
      log.push([facetID, method, argsString, slots]);
      helpers.log(JSON.stringify({ facetID, method, argsString, slots }));
    }
    return { deliver };
  }
  kernel.addGenesisVat('vat1', setup1);
  await kernel.start();
  let data = kernel.dump();
  t.deepEqual(data.vatTables, [{ vatID: 'vat1', state: { transcript: [] } }]);
  t.deepEqual(data.kernelTable, []);
  t.deepEqual(data.log, []);
  t.deepEqual(log, []);

  kernel.queueToExport('vat1', 'o+1', 'foo', 'args');
  t.deepEqual(kernel.dump().runQueue, [
    {
      vatID: 'vat1',
      type: 'deliver',
      target: 'ko20',
      msg: {
        method: 'foo',
        argsString: 'args',
        slots: [],
        kernelResolverID: null,
      },
    },
  ]);
  t.deepEqual(log, []);
  await kernel.run();
  t.deepEqual(log, [['o+1', 'foo', 'args', []]]);

  data = kernel.dump();
  t.equal(data.log.length, 1);
  t.deepEqual(JSON.parse(data.log[0]), {
    facetID: 'o+1',
    method: 'foo',
    argsString: 'args',
    slots: [],
  });

  t.end();
});

test('map inbound', async t => {
  const kernel = buildKernel({ setImmediate });
  const log = [];
  function setup1(_syscall) {
    function deliver(facetID, method, argsString, slots) {
      log.push([facetID, method, argsString, slots]);
    }
    return { deliver };
  }
  kernel.addGenesisVat('vat1', setup1);
  kernel.addGenesisVat('vat2', setup1);
  await kernel.start();
  const data = kernel.dump();
  t.deepEqual(data.vatTables, [
    { vatID: 'vat1', state: { transcript: [] } },
    { vatID: 'vat2', state: { transcript: [] } },
  ]);
  t.deepEqual(data.kernelTable, []);
  t.deepEqual(log, []);

  const koFor5 = kernel.addExport('vat1', 'o+5');
  const koFor6 = kernel.addExport('vat2', 'o+6');
  kernel.queueToExport('vat1', 'o+1', 'foo', 'args', [koFor5, koFor6]);
  t.deepEqual(kernel.dump().runQueue, [
    {
      msg: {
        argsString: 'args',
        kernelResolverID: null,
        method: 'foo',
        slots: [koFor5, koFor6],
      },
      target: 'ko22',
      type: 'deliver',
      vatID: 'vat1',
    },
  ]);
  t.deepEqual(log, []);
  await kernel.run();
  t.deepEqual(log, [['o+1', 'foo', 'args', ['o+5', 'o-50']]]);
  t.deepEqual(kernel.dump().kernelTable, [
    [koFor5, 'vat1', 'o+5'],
    [koFor6, 'vat1', 'o-50'],
    [koFor6, 'vat2', 'o+6'],
    ['ko22', 'vat1', 'o+1'],
  ]);

  t.end();
});

test('addImport', async t => {
  const kernel = buildKernel({ setImmediate });
  function setup(_syscall) {
    function deliver(_facetID, _method, _argsString, _slots) {}
    return { deliver };
  }
  kernel.addGenesisVat('vat1', setup);
  kernel.addGenesisVat('vat2', setup);
  await kernel.start();

  const slot = kernel.addImport('vat1', kernel.addExport('vat2', 'o+5'));
  t.deepEqual(slot, 'o-50'); // first import
  t.deepEqual(kernel.dump().kernelTable, [
    ['ko20', 'vat1', 'o-50'],
    ['ko20', 'vat2', 'o+5'],
  ]);
  t.end();
});

test('outbound call', async t => {
  const kernel = buildKernel({ setImmediate });
  const log = [];
  let v1tovat25;

  function setup1(syscall) {
    function deliver(facetID, method, argsString, slots) {
      // console.log(`d1/${facetID} called`);
      log.push(['d1', facetID, method, argsString, slots]);
      const pid = syscall.send(v1tovat25, 'bar', 'bargs', [v1tovat25, 'o+7']);
      log.push(['d1', 'promiseid', pid]);
    }
    return { deliver };
  }
  kernel.addGenesisVat('vat1', setup1);

  function setup2(_syscall) {
    function deliver(facetID, method, argsString, slots) {
      // console.log(`d2/${facetID} called`);
      log.push(['d2', facetID, method, argsString, slots]);
    }
    return { deliver };
  }
  kernel.addGenesisVat('vat2', setup2);
  await kernel.start();

  const t1 = kernel.addExport('vat1', 'o+1');
  const vat2Obj5 = kernel.addExport('vat2', 'o+5');
  v1tovat25 = kernel.addImport('vat1', vat2Obj5);
  t.deepEqual(v1tovat25, 'o-50'); // first allocation

  const data = kernel.dump();
  t.deepEqual(data.vatTables, [
    { vatID: 'vat1', state: { transcript: [] } },
    { vatID: 'vat2', state: { transcript: [] } },
  ]);

  const kt = [
    [t1, 'vat1', 'o+1'],
    ['ko21', 'vat1', v1tovat25],
    ['ko21', 'vat2', 'o+5'],
  ];
  checkKT(t, kernel, kt);
  t.deepEqual(log, []);

  kernel.queueToExport('vat1', 'o+1', 'foo', 'args');
  t.deepEqual(log, []);
  t.deepEqual(kernel.dump().runQueue, [
    {
      msg: {
        argsString: 'args',
        kernelResolverID: null,
        method: 'foo',
        slots: [],
      },
      target: t1,
      type: 'deliver',
      vatID: 'vat1',
    },
  ]);

  await kernel.step();

  t.deepEqual(log.shift(), ['d1', 'o+1', 'foo', 'args', []]);
  t.deepEqual(log.shift(), ['d1', 'promiseid', 'p-60']);
  t.deepEqual(log, []);

  t.deepEqual(kernel.dump().runQueue, [
    {
      vatID: 'vat2',
      type: 'deliver',
      target: vat2Obj5,
      msg: {
        method: 'bar',
        argsString: 'bargs',
        slots: [vat2Obj5, 'ko22'],
        kernelResolverID: 'kp40',
      },
    },
  ]);
  t.deepEqual(kernel.dump().promises, [
    {
      id: 'kp40',
      state: 'unresolved',
      decider: 'vat2',
      subscribers: [],
      queue: [],
    },
  ]);
  kt.push(['ko22', 'vat1', 'o+7']);
  kt.push(['kp40', 'vat1', 'p-60']);
  checkKT(t, kernel, kt);

  await kernel.step();
  t.deepEqual(log, [['d2', 'o+5', 'bar', 'bargs', ['o+5', 'o-50']]]);
  // our temporary handling of resolverIDs causes vat2's clist to have a
  // funny mapping. (kp40->p-60, p-60->kp40, r-60->kp40). The dump() function
  // assumes a strictly bijective mapping and doesn't include the surjective
  // r-60->kp40 edge. So instead of ['kp40', 'vat2', 'r-60'], we see:
  kt.push(['kp40', 'vat2', 'p-60']);
  kt.push(['ko22', 'vat2', 'o-50']);
  checkKT(t, kernel, kt);

  t.end();
});

test('three-party', async t => {
  const kernel = buildKernel({ setImmediate });
  const log = [];
  let bobForA;
  let carolForA;

  let aliceSyscall;
  function setupA(syscall) {
    aliceSyscall = syscall;
    function deliver(facetID, method, argsString, slots) {
      console.log(`vatA/${facetID} called`);
      log.push(['vatA', facetID, method, argsString, slots]);
      const pid = syscall.send(bobForA, 'intro', 'bargs', [carolForA]);
      log.push(['vatA', 'promiseID', pid]);
    }
    return { deliver };
  }
  kernel.addGenesisVat('vatA', setupA);

  function setupB(_syscall) {
    function deliver(facetID, method, argsString, slots) {
      console.log(`vatB/${facetID} called`);
      log.push(['vatB', facetID, method, argsString, slots]);
    }
    return { deliver };
  }
  kernel.addGenesisVat('vatB', setupB);

  function setupC(_syscall) {
    function deliver(facetID, method, argsString, slots) {
      log.push(['vatC', facetID, method, argsString, slots]);
    }
    return { deliver };
  }
  kernel.addGenesisVat('vatC', setupC);

  await kernel.start();

  const alice = kernel.addExport('vatA', 'o+4');
  const bob = kernel.addExport('vatB', 'o+5');
  const carol = kernel.addExport('vatC', 'o+6');

  bobForA = kernel.addImport('vatA', bob);
  carolForA = kernel.addImport('vatA', carol);

  // this extra allocation causes alice's send() promise index to be
  // different than bob's, so we can check that the promiseID coming back
  // from send() is scoped to the sender, not the recipient
  const ap = aliceSyscall.createPromise();
  t.equal(ap.promiseID, 'p-60');

  const data = kernel.dump();
  t.deepEqual(data.vatTables, [
    { vatID: 'vatA', state: { transcript: [] } },
    { vatID: 'vatB', state: { transcript: [] } },
    { vatID: 'vatC', state: { transcript: [] } },
  ]);
  const kt = [
    [alice, 'vatA', 'o+4'],
    [bob, 'vatA', bobForA],
    [bob, 'vatB', 'o+5'],
    [carol, 'vatA', carolForA],
    [carol, 'vatC', 'o+6'],
    ['kp40', 'vatA', ap.promiseID],
  ];
  checkKT(t, kernel, kt);
  t.deepEqual(log, []);

  kernel.queueToExport('vatA', 'o+4', 'foo', 'args');
  await kernel.step();

  t.deepEqual(log.shift(), ['vatA', 'o+4', 'foo', 'args', []]);
  t.deepEqual(log.shift(), ['vatA', 'promiseID', 'p-61']);
  t.deepEqual(log, []);

  t.deepEqual(kernel.dump().runQueue, [
    {
      vatID: 'vatB',
      type: 'deliver',
      target: bob,
      msg: {
        method: 'intro',
        argsString: 'bargs',
        slots: [carol],
        kernelResolverID: 'kp41',
      },
    },
  ]);
  t.deepEqual(kernel.dump().promises, [
    {
      id: 'kp40',
      state: 'unresolved',
      decider: 'vatA',
      subscribers: [],
      queue: [],
    },
    {
      id: 'kp41',
      state: 'unresolved',
      decider: 'vatB',
      subscribers: [],
      queue: [],
    },
  ]);
  kt.push(['kp41', 'vatA', 'p-61']);
  checkKT(t, kernel, kt);

  await kernel.step();
  t.deepEqual(log, [['vatB', 'o+5', 'intro', 'bargs', ['o-50']]]);
  kt.push([carol, 'vatB', 'o-50']);
  kt.push(['kp41', 'vatB', 'p-60']); // dump() omits resolver
  checkKT(t, kernel, kt);

  t.end();
});

test('createPromise', async t => {
  const kernel = buildKernel({ setImmediate });
  let syscall;
  function setup(s) {
    syscall = s;
    function deliver(_facetID, _method, _argsString, _slots) {}
    return { deliver };
  }
  kernel.addGenesisVat('vat1', setup);
  await kernel.start();

  t.deepEqual(kernel.dump().promises, []);
  const pr = syscall.createPromise();
  t.deepEqual(pr, { promiseID: 'p-60', resolverID: 'r-60' });
  t.deepEqual(kernel.dump().promises, [
    {
      id: 'kp40',
      state: 'unresolved',
      decider: 'vat1',
      subscribers: [],
      queue: [],
    },
  ]);

  t.deepEqual(kernel.dump().kernelTable, [
    ['kp40', 'vat1', 'p-60'], // dump() omits resolver
  ]);
  t.end();
});

test('transfer promise', async t => {
  const kernel = buildKernel({ setImmediate });
  let syscallA;
  const logA = [];
  function setupA(syscall) {
    syscallA = syscall;
    function deliver(facetID, method, argsString, slots) {
      logA.push([facetID, method, argsString, slots]);
    }
    return { deliver };
  }
  kernel.addGenesisVat('vatA', setupA);

  let syscallB;
  const logB = [];
  function setupB(syscall) {
    syscallB = syscall;
    function deliver(facetID, method, argsString, slots) {
      logB.push([facetID, method, argsString, slots]);
    }
    return { deliver };
  }
  kernel.addGenesisVat('vatB', setupB);

  await kernel.start();

  const alice = kernel.addExport('vatA', 'o+6');
  const bob = kernel.addExport('vatB', 'o+5');

  const B = kernel.addImport('vatA', bob);
  const A = kernel.addImport('vatB', alice);

  const pr1 = syscallA.createPromise();
  t.deepEqual(pr1, { promiseID: 'p-60', resolverID: 'r-60' });
  // we send pr2
  const pr2 = syscallA.createPromise();
  t.deepEqual(pr2, { promiseID: 'p-61', resolverID: 'r-61' });

  const kt = [
    ['ko20', 'vatA', 'o+6'],
    ['ko20', 'vatB', 'o-50'],
    ['ko21', 'vatA', 'o-50'],
    ['ko21', 'vatB', 'o+5'],
    ['kp40', 'vatA', 'p-60'], // pr1
    ['kp41', 'vatA', 'p-61'], // pr2
  ];
  checkKT(t, kernel, kt);
  const kp = [
    {
      id: 'kp40',
      state: 'unresolved',
      decider: 'vatA',
      subscribers: [],
      queue: [],
    },
    {
      id: 'kp41',
      state: 'unresolved',
      decider: 'vatA',
      subscribers: [],
      queue: [],
    },
  ];
  checkPromises(t, kernel, kp);

  // sending a promise should arrive as a promise
  syscallA.send(B, 'foo1', 'args', [pr2.promiseID]);
  t.deepEqual(kernel.dump().runQueue, [
    {
      vatID: 'vatB',
      type: 'deliver',
      target: bob,
      msg: {
        method: 'foo1',
        argsString: 'args',
        slots: ['kp41'],
        kernelResolverID: 'kp42',
      },
    },
  ]);
  kt.push(['kp42', 'vatA', 'p-62']); // promise for answer of foo1()
  checkKT(t, kernel, kt);
  kp.push({
    id: 'kp42',
    state: 'unresolved',
    decider: 'vatB',
    subscribers: [],
    queue: [],
  });
  checkPromises(t, kernel, kp);

  await kernel.run();
  t.deepEqual(logB.shift(), ['o+5', 'foo1', 'args', ['p-60']]);
  t.deepEqual(logB, []);
  kt.push(['kp41', 'vatB', 'p-60']); // pr2 for B
  kt.push(['kp42', 'vatB', 'p-61']); // resolver for answer of foo1()
  checkKT(t, kernel, kt);

  // sending it a second time should arrive as the same thing
  syscallA.send(B, 'foo2', 'args', [pr2.promiseID]);
  await kernel.run();
  t.deepEqual(logB.shift(), ['o+5', 'foo2', 'args', ['p-60']]);

  t.deepEqual(logB, []);
  kt.push(['kp43', 'vatA', 'p-63']); // promise for answer of foo2()
  kt.push(['kp43', 'vatB', 'p-62']); // resolver for answer of foo2()
  checkKT(t, kernel, kt);

  kp.push({
    id: 'kp43',
    state: 'unresolved',
    decider: 'vatB',
    subscribers: [],
    queue: [],
  });
  checkPromises(t, kernel, kp);

  // sending it back should arrive with the sender's index
  syscallB.send(A, 'foo3', 'args', ['p-60']);
  await kernel.run();
  t.deepEqual(logA.shift(), ['o+6', 'foo3', 'args', [pr2.promiseID]]);
  t.deepEqual(logA, []);
  kt.push(['kp44', 'vatA', 'p-64']); // resolver for answer of foo3()
  kt.push(['kp44', 'vatB', 'p-63']); // promise for answer of foo3()
  checkKT(t, kernel, kt);

  // sending it back a second time should arrive as the same thing
  syscallB.send(A, 'foo4', 'args', ['p-60']);
  await kernel.run();
  t.deepEqual(logA.shift(), ['o+6', 'foo4', 'args', [pr2.promiseID]]);
  t.deepEqual(logA, []);

  kp.push({
    id: 'kp44',
    state: 'unresolved',
    decider: 'vatA',
    subscribers: [],
    queue: [],
  });
  kp.push({
    id: 'kp45',
    state: 'unresolved',
    decider: 'vatA',
    subscribers: [],
    queue: [],
  });
  checkPromises(t, kernel, kp);

  kt.push(['kp45', 'vatA', 'p-65']); // resolver for answer of foo4()
  kt.push(['kp45', 'vatB', 'p-64']); // promise for answer of foo4()
  checkKT(t, kernel, kt);

  t.end();
});

test('subscribe to promise', async t => {
  const kernel = buildKernel({ setImmediate });
  let syscall;
  const log = [];
  function setup(s) {
    syscall = s;
    function deliver(facetID, method, argsString, slots) {
      log.push(['deliver', facetID, method, argsString, slots]);
    }
    return { deliver };
  }
  kernel.addGenesisVat('vat1', setup);
  await kernel.start();

  const pr = syscall.createPromise();
  t.deepEqual(pr, { promiseID: 'p-60', resolverID: 'r-60' });
  t.deepEqual(kernel.dump().kernelTable, [['kp40', 'vat1', 'p-60']]);

  syscall.subscribe(pr.promiseID);
  t.deepEqual(kernel.dump().promises, [
    {
      id: 'kp40',
      state: 'unresolved',
      decider: 'vat1',
      subscribers: ['vat1'],
      queue: [],
    },
  ]);
  t.deepEqual(kernel.dump().runQueue, []);
  t.deepEqual(log, []);

  t.end();
});

// promise redirection is not yet implemented
test.skip('promise redirection', async t => {
  const kernel = buildKernel({ setImmediate });
  let syscall;
  const log = [];
  function setup(s) {
    syscall = s;
    function deliver(facetID, method, argsString, slots) {
      log.push([facetID, method, argsString, slots]);
    }
    return { deliver };
  }
  kernel.addGenesisVat('vat1', setup);
  await kernel.start();

  const pr1 = syscall.createPromise();
  const pr2 = syscall.createPromise();
  t.deepEqual(kernel.dump().kernelTable, [
    ['vat1', 'promise', 20, 40],
    ['vat1', 'promise', 21, 41],
    ['vat1', 'resolver', 30, 40],
    ['vat1', 'resolver', 31, 41],
  ]);

  syscall.subscribe(pr1.promiseID);
  t.deepEqual(kernel.dump().promises, [
    {
      id: 40,
      state: 'unresolved',
      decider: 'vat1',
      subscribers: ['vat1'],
      queue: [],
    },
    {
      id: 41,
      state: 'unresolved',
      decider: 'vat1',
      subscribers: [],
      queue: [],
    },
  ]);

  syscall.redirect(pr1.resolverID, pr2.promiseID);
  t.deepEqual(log, []); // vat is not notified
  t.deepEqual(kernel.dump().promises, [
    {
      id: 40,
      state: 'redirected',
      redirectedTo: 41,
      subscribers: ['vat1'],
      queue: [],
    },
    {
      id: 41,
      state: 'unresolved',
      decider: 'vat1',
      subscribers: [],
      queue: [],
    },
  ]);

  t.end();
});

test('promise resolveToData', async t => {
  const kernel = buildKernel({ setImmediate });
  let syscall;
  const log = [];
  function setup(s) {
    syscall = s;
    function deliver(facetID, method, argsString, slots) {
      log.push(['deliver', facetID, method, argsString, slots]);
    }
    function notifyFulfillToData(promiseID, fulfillData, slots) {
      log.push(['notify', promiseID, fulfillData, slots]);
    }
    return { deliver, notifyFulfillToData };
  }
  kernel.addGenesisVat('vatA', setup);
  await kernel.start();

  const alice = 'o+6';
  const pr = syscall.createPromise();
  t.deepEqual(kernel.dump().kernelTable, [['kp40', 'vatA', 'p-60']]);

  syscall.subscribe(pr.promiseID);
  t.deepEqual(kernel.dump().promises, [
    {
      id: 'kp40',
      state: 'unresolved',
      decider: 'vatA',
      subscribers: ['vatA'],
      queue: [],
    },
  ]);

  syscall.fulfillToData(pr.resolverID, 'args', [alice]);
  // the resolverID gets mapped to a kernelPromiseID first, and a
  // notifyFulfillToData message is queued
  t.deepEqual(log, []); // no other dispatch calls
  t.deepEqual(kernel.dump().runQueue, [
    {
      type: 'notifyFulfillToData',
      vatID: 'vatA',
      kernelPromiseID: 'kp40',
    },
  ]);

  await kernel.step();
  // the kernelPromiseID gets mapped back to the vat PromiseID
  t.deepEqual(log.shift(), ['notify', pr.promiseID, 'args', [alice]]);
  t.deepEqual(log, []); // no other dispatch calls
  t.deepEqual(kernel.dump().promises, [
    {
      id: 'kp40',
      fulfillData: 'args',
      fulfillSlots: ['ko20'],
      state: 'fulfilledToData',
    },
  ]);
  t.deepEqual(kernel.dump().runQueue, []);

  t.end();
});

function emptySetup(_syscall) {
  function deliver() {}
  return { deliver };
}

test('promise resolveToPresence', async t => {
  const kernel = buildKernel({ setImmediate });
  let syscall;
  const log = [];
  function setup(s) {
    syscall = s;
    function deliver(facetID, method, argsString, slots) {
      log.push(['deliver', facetID, method, argsString, slots]);
    }
    function notifyFulfillToPresence(promiseID, slot) {
      log.push(['notify', promiseID, slot]);
    }
    return { deliver, notifyFulfillToPresence };
  }
  kernel.addGenesisVat('vatA', setup);
  kernel.addGenesisVat('vatB', emptySetup);
  await kernel.start();
  const bob = kernel.addExport('vatB', 'o+6');
  const bobForAlice = kernel.addImport('vatA', bob);

  const pr = syscall.createPromise();
  const kt = [
    ['ko20', 'vatB', 'o+6'],
    ['ko20', 'vatA', 'o-50'],
    ['kp40', 'vatA', 'p-60'],
  ];
  checkKT(t, kernel, kt);

  syscall.subscribe(pr.promiseID);
  t.deepEqual(kernel.dump().promises, [
    {
      id: 'kp40',
      state: 'unresolved',
      decider: 'vatA',
      subscribers: ['vatA'],
      queue: [],
    },
  ]);

  syscall.fulfillToPresence(pr.resolverID, bobForAlice);
  t.deepEqual(log, []); // no other dispatch calls
  t.deepEqual(kernel.dump().runQueue, [
    {
      type: 'notifyFulfillToPresence',
      vatID: 'vatA',
      kernelPromiseID: 'kp40',
    },
  ]);

  await kernel.step();

  t.deepEqual(log.shift(), ['notify', pr.promiseID, bobForAlice]);
  t.deepEqual(log, []); // no other dispatch calls
  t.deepEqual(kernel.dump().promises, [
    {
      id: 'kp40',
      fulfillSlot: bob,
      state: 'fulfilledToPresence',
    },
  ]);
  t.deepEqual(kernel.dump().runQueue, []);
  t.end();
});

test('promise reject', async t => {
  const kernel = buildKernel({ setImmediate });
  let syscall;
  const log = [];
  function setup(s) {
    syscall = s;
    function deliver(facetID, method, argsString, slots) {
      log.push(['deliver', facetID, method, argsString, slots]);
    }
    function notifyReject(promiseID, rejectData, slots) {
      log.push(['notify', promiseID, rejectData, slots]);
    }
    return { deliver, notifyReject };
  }
  kernel.addGenesisVat('vatA', setup);
  kernel.addGenesisVat('vatB', emptySetup);
  await kernel.start();

  const bob = kernel.addExport('vatB', 'o+6');
  const bobForAlice = kernel.addImport('vatA', bob);

  const pr = syscall.createPromise();
  const kt = [
    ['ko20', 'vatB', 'o+6'],
    ['ko20', 'vatA', 'o-50'],
    ['kp40', 'vatA', 'p-60'],
  ];
  checkKT(t, kernel, kt);

  syscall.subscribe(pr.promiseID);
  t.deepEqual(kernel.dump().promises, [
    {
      id: 'kp40',
      state: 'unresolved',
      decider: 'vatA',
      subscribers: ['vatA'],
      queue: [],
    },
  ]);

  // the resolver-holder calls reject right away, because now we
  // automatically subscribe

  syscall.reject(pr.resolverID, 'args', [bobForAlice]);
  t.deepEqual(log, []); // no other dispatch calls
  t.deepEqual(kernel.dump().runQueue, [
    {
      type: 'notifyReject',
      vatID: 'vatA',
      kernelPromiseID: 'kp40',
    },
  ]);
  await kernel.step();

  t.deepEqual(log.shift(), ['notify', pr.promiseID, 'args', [bobForAlice]]);
  t.deepEqual(log, []); // no other dispatch calls
  t.deepEqual(kernel.dump().promises, [
    {
      id: 'kp40',
      rejectData: 'args',
      rejectSlots: [bob],
      state: 'rejected',
    },
  ]);
  t.deepEqual(kernel.dump().runQueue, []);

  t.end();
});

test('transcript', async t => {
  const aliceForAlice = 'o+1';
  const kernel = buildKernel({ setImmediate });
  const log = [];
  function setup(syscall, _state) {
    function deliver(facetID, _method, _argsString, slots) {
      if (facetID === aliceForAlice) {
        const p = syscall.send(slots[1], 'foo', 'fooarg', []);
        log.push(p);
      }
    }
    return { deliver };
  }
  kernel.addGenesisVat('vatA', setup);
  kernel.addGenesisVat('vatB', emptySetup);
  await kernel.start();

  const alice = kernel.addExport('vatA', aliceForAlice);
  const bob = kernel.addExport('vatB', 'o+2');
  const bobForAlice = kernel.addImport('vatA', bob);

  kernel.queueToExport('vatA', aliceForAlice, 'store', 'args string', [
    alice,
    bob,
  ]);
  await kernel.step();
  const p1 = log.shift();
  t.equal(p1, 'p-60');

  // the transcript records vat-specific import/export slots

  const tr = kernel.dump().vatTables[0].state.transcript;
  t.equal(tr.length, 1);
  t.deepEqual(tr[0], {
    d: [
      'deliver',
      aliceForAlice,
      'store',
      'args string',
      [aliceForAlice, bobForAlice],
      null,
    ],
    syscalls: [
      {
        d: ['send', bobForAlice, 'foo', 'fooarg', []],
        response: p1,
      },
    ],
  });

  t.end();
});
