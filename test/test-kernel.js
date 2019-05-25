/* global setImmediate */
import { test } from 'tape-promise/tape';
import buildKernel from '../src/kernel/index';
import { makeExternal } from '../src/controller';

test('build kernel', t => {
  const external = makeExternal();
  const kernel = buildKernel({ setImmediate }, external);
  kernel.run(); // empty queue
  const data = kernel.dump();
  t.deepEqual(data.vatTables, []);
  t.deepEqual(data.kernelTable, []);
  t.end();
});

test('simple call', async t => {
  const external = makeExternal();
  const kernel = buildKernel({ setImmediate }, external);
  const log = [];
  function setup1(syscall) {
    function deliver(facetID, method, argsString, slots) {
      log.push([facetID, method, argsString, slots]);
      syscall.log(JSON.stringify({ facetID, method, argsString, slots }));
    }
    return { deliver };
  }
  kernel.addVat('vat1', setup1);
  let data = kernel.dump();
  t.deepEqual(data.vatTables, [{ vatID: 'vat1', state: { transcript: [] } }]);
  t.deepEqual(data.kernelTable, []);
  t.deepEqual(data.log, []);
  t.deepEqual(log, []);

  kernel.queueToExport('vat1', 1, 'foo', 'args');
  t.deepEqual(kernel.dump().runQueue, [
    {
      vatID: 'vat1',
      type: 'deliver',
      target: {
        type: 'export',
        vatID: 'vat1',
        id: 1,
      },
      msg: {
        method: 'foo',
        argsString: 'args',
        slots: [],
        kernelResolverID: undefined,
      },
    },
  ]);
  t.deepEqual(log, []);
  await kernel.run();
  t.deepEqual(log, [[1, 'foo', 'args', []]]);

  data = kernel.dump();
  t.equal(data.log.length, 1);
  t.deepEqual(JSON.parse(data.log[0]), {
    facetID: 1,
    method: 'foo',
    argsString: 'args',
    slots: [],
  });

  t.end();
});

test('map inbound', async t => {
  const external = makeExternal();
  const kernel = buildKernel({ setImmediate }, external);
  const log = [];
  function setup1(_syscall) {
    function deliver(facetID, method, argsString, slots) {
      log.push([facetID, method, argsString, slots]);
    }
    return { deliver };
  }
  kernel.addVat('vat1', setup1);
  const data = kernel.dump();
  t.deepEqual(data.vatTables, [{ vatID: 'vat1', state: { transcript: [] } }]);
  t.deepEqual(data.kernelTable, []);
  t.deepEqual(log, []);

  kernel.queueToExport('vat1', 1, 'foo', 'args', [
    { type: 'export', vatID: 'vat1', id: 5 },
    { type: 'export', vatID: 'vat2', id: 6 },
  ]);
  t.deepEqual(kernel.dump().runQueue, [
    {
      vatID: 'vat1',
      type: 'deliver',
      target: {
        type: 'export',
        vatID: 'vat1',
        id: 1,
      },
      msg: {
        method: 'foo',
        argsString: 'args',
        slots: [
          { type: 'export', vatID: 'vat1', id: 5 },
          { type: 'export', vatID: 'vat2', id: 6 },
        ],
        kernelResolverID: undefined,
      },
    },
  ]);
  t.deepEqual(log, []);
  await kernel.run();
  t.deepEqual(log, [
    [1, 'foo', 'args', [{ type: 'export', id: 5 }, { type: 'import', id: 10 }]],
  ]);
  t.deepEqual(kernel.dump().kernelTable, [
    ['vat1', 'import', 10, 'export', 'vat2', 6],
  ]);

  t.end();
});

test('addImport', t => {
  const external = makeExternal();
  const kernel = buildKernel({ setImmediate }, external);
  function setup(_syscall) {
    function deliver(_facetID, _method, _argsString, _slots) {}
    return { deliver };
  }
  kernel.addVat('vat1', setup);
  kernel.addVat('vat2', setup);

  const slot = kernel.addImport('vat1', {
    type: 'export',
    vatID: 'vat2',
    id: 5,
  });
  t.deepEqual(slot, { type: 'import', id: 10 }); // first import
  t.deepEqual(kernel.dump().kernelTable, [
    ['vat1', 'import', 10, 'export', 'vat2', 5],
  ]);
  t.end();
});

test('outbound call to my own export should fail', async t => {
  const external = makeExternal();
  const kernel = buildKernel({ setImmediate }, external);
  const log = [];
  let s;
  function setup1(syscall) {
    s = syscall;
    function deliver(facetID, method, argsString, slots) {
      log.push([facetID, method, argsString, slots]);
    }
    return { deliver };
  }
  kernel.addVat('vat1', setup1);

  t.throws(
    () => s.send({ type: 'export', id: 5 }, 'methodname', 'body', []),
    /send\(\) is calling itself/,
  );

  t.end();
});

test('outbound call', async t => {
  const external = makeExternal();
  const kernel = buildKernel({ setImmediate }, external);
  const log = [];
  let v1tovat25;

  function setup1(syscall) {
    function deliver(facetID, method, argsString, slots) {
      // console.log(`d1/${facetID} called`);
      log.push(['d1', facetID, method, argsString, slots]);
      const pid = syscall.send(
        { type: 'import', id: v1tovat25.id },
        'bar',
        'bargs',
        [{ type: 'import', id: v1tovat25.id }, { type: 'export', id: 7 }],
      );
      log.push(['d1', 'promiseid', pid]);
    }
    return { deliver };
  }
  kernel.addVat('vat1', setup1);

  function setup2(_syscall) {
    function deliver(facetID, method, argsString, slots) {
      // console.log(`d2/${facetID} called`);
      log.push(['d2', facetID, method, argsString, slots]);
    }
    return { deliver };
  }
  kernel.addVat('vat2', setup2);

  v1tovat25 = kernel.addImport('vat1', {
    type: 'export',
    vatID: 'vat2',
    id: 5,
  });
  t.deepEqual(v1tovat25, { type: 'import', id: 10 }); // first allocation

  const data = kernel.dump();
  t.deepEqual(data.vatTables, [
    { vatID: 'vat1', state: { transcript: [] } },
    { vatID: 'vat2', state: { transcript: [] } },
  ]);
  t.deepEqual(data.kernelTable, [
    ['vat1', 'import', v1tovat25.id, 'export', 'vat2', 5],
  ]);
  t.deepEqual(log, []);

  kernel.queueToExport('vat1', 1, 'foo', 'args');
  t.deepEqual(log, []);
  t.deepEqual(kernel.dump().runQueue, [
    {
      vatID: 'vat1',
      type: 'deliver',
      target: {
        type: 'export',
        vatID: 'vat1',
        id: 1,
      },
      msg: {
        method: 'foo',
        argsString: 'args',
        slots: [],
        kernelResolverID: undefined,
      },
    },
  ]);

  await kernel.step();

  t.deepEqual(log.shift(), ['d1', 1, 'foo', 'args', []]);
  t.deepEqual(log.shift(), ['d1', 'promiseid', 20]);
  t.deepEqual(log, []);

  t.deepEqual(kernel.dump().runQueue, [
    {
      vatID: 'vat2',
      type: 'deliver',
      target: {
        type: 'export',
        vatID: 'vat2',
        id: 5,
      },
      msg: {
        method: 'bar',
        argsString: 'bargs',
        slots: [
          { type: 'export', vatID: 'vat2', id: 5 },
          { type: 'export', vatID: 'vat1', id: 7 },
        ],
        kernelResolverID: 40,
      },
    },
  ]);
  t.deepEqual(kernel.dump().promises, [
    {
      id: 40,
      state: 'unresolved',
      decider: 'vat2',
      subscribers: [],
      queue: [],
    },
  ]);
  t.deepEqual(kernel.dump().kernelTable, [
    ['vat1', 'import', v1tovat25.id, 'export', 'vat2', 5],
    ['vat1', 'promise', 20, 40],
  ]);

  await kernel.step();
  t.deepEqual(log, [
    [
      'd2',
      5,
      'bar',
      'bargs',
      [{ type: 'export', id: 5 }, { type: 'import', id: 10 }],
    ],
  ]);
  t.deepEqual(kernel.dump().kernelTable, [
    ['vat1', 'import', v1tovat25.id, 'export', 'vat2', 5],
    ['vat1', 'promise', 20, 40],
    ['vat2', 'import', 10, 'export', 'vat1', 7],
    ['vat2', 'resolver', 30, 40],
  ]);

  t.end();
});

test('three-party', async t => {
  const external = makeExternal();
  const kernel = buildKernel({ setImmediate }, external);
  const log = [];
  let bobForA;
  let carolForA;

  function setupA(syscall) {
    function deliver(facetID, method, argsString, slots) {
      console.log(`vatA/${facetID} called`);
      log.push(['vatA', facetID, method, argsString, slots]);
      const pid = syscall.send(
        { type: 'import', id: bobForA.id },
        'intro',
        'bargs',
        [{ type: 'import', id: carolForA.id }],
      );
      log.push(['vatA', 'promiseID', pid]);
    }
    return { deliver };
  }
  kernel.addVat('vatA', setupA);

  let bobSyscall;
  function setupB(syscall) {
    bobSyscall = syscall;
    function deliver(facetID, method, argsString, slots) {
      console.log(`vatB/${facetID} called`);
      log.push(['vatB', facetID, method, argsString, slots]);
    }
    return { deliver };
  }
  kernel.addVat('vatB', setupB);

  function setupC(_syscall) {
    function deliver(facetID, method, argsString, slots) {
      log.push(['vatC', facetID, method, argsString, slots]);
    }
    return { deliver };
  }
  kernel.addVat('vatC', setupC);

  bobForA = kernel.addImport('vatA', {
    type: 'export',
    vatID: 'vatB',
    id: 5,
  });
  carolForA = kernel.addImport('vatA', {
    type: 'export',
    vatID: 'vatC',
    id: 6,
  });

  // get bob's promise index to be different than alice's, to check that the
  // promiseID coming back from send() is scoped to the sender, not the
  // recipient
  const bp = bobSyscall.createPromise();

  const data = kernel.dump();
  t.deepEqual(data.vatTables, [
    { vatID: 'vatA', state: { transcript: [] } },
    { vatID: 'vatB', state: { transcript: [] } },
    { vatID: 'vatC', state: { transcript: [] } },
  ]);
  t.deepEqual(data.kernelTable, [
    ['vatA', 'import', bobForA.id, 'export', 'vatB', 5],
    ['vatA', 'import', carolForA.id, 'export', 'vatC', 6],
    ['vatB', 'promise', bp.promiseID, 40],
    ['vatB', 'resolver', 30, 40],
  ]);
  t.deepEqual(log, []);

  kernel.queueToExport('vatA', 1, 'foo', 'args');
  await kernel.step();

  t.deepEqual(log.shift(), ['vatA', 1, 'foo', 'args', []]);
  t.deepEqual(log.shift(), ['vatA', 'promiseID', 20]);
  t.deepEqual(log, []);

  t.deepEqual(kernel.dump().runQueue, [
    {
      vatID: 'vatB',
      type: 'deliver',
      target: {
        type: 'export',
        vatID: 'vatB',
        id: 5,
      },
      msg: {
        method: 'intro',
        argsString: 'bargs',
        slots: [{ type: 'export', vatID: 'vatC', id: 6 }],
        kernelResolverID: 41,
      },
    },
  ]);
  t.deepEqual(kernel.dump().promises, [
    {
      id: 40,
      state: 'unresolved',
      decider: 'vatB',
      subscribers: [],
      queue: [],
    },
    {
      id: 41,
      state: 'unresolved',
      decider: 'vatB',
      subscribers: [],
      queue: [],
    },
  ]);
  t.deepEqual(kernel.dump().kernelTable, [
    ['vatA', 'import', bobForA.id, 'export', 'vatB', 5],
    ['vatA', 'import', carolForA.id, 'export', 'vatC', 6],
    ['vatA', 'promise', 20, 41],
    ['vatB', 'promise', bp.promiseID, 40],
    ['vatB', 'resolver', 30, 40],
  ]);

  await kernel.step();
  t.deepEqual(log, [
    ['vatB', 5, 'intro', 'bargs', [{ type: 'import', id: 10 }]],
  ]);
  t.deepEqual(kernel.dump().kernelTable, [
    ['vatA', 'import', bobForA.id, 'export', 'vatB', 5],
    ['vatA', 'import', carolForA.id, 'export', 'vatC', 6],
    ['vatA', 'promise', 20, 41],
    ['vatB', 'import', 10, 'export', 'vatC', 6],
    ['vatB', 'promise', bp.promiseID, 40],
    ['vatB', 'resolver', 30, 40],
    ['vatB', 'resolver', 31, 41],
  ]);

  t.end();
});

test('createPromise', t => {
  const external = makeExternal();
  const kernel = buildKernel({ setImmediate }, external);
  let syscall;
  function setup(s) {
    syscall = s;
    function deliver(_facetID, _method, _argsString, _slots) {}
    return { deliver };
  }
  kernel.addVat('vat1', setup);

  t.deepEqual(kernel.dump().promises, []);
  const pr = syscall.createPromise();
  t.deepEqual(pr, { promiseID: 20, resolverID: 30 });
  t.deepEqual(kernel.dump().promises, [
    {
      id: 40,
      state: 'unresolved',
      decider: 'vat1',
      subscribers: [],
      queue: [],
    },
  ]);

  t.deepEqual(kernel.dump().kernelTable, [
    ['vat1', 'promise', 20, 40],
    ['vat1', 'resolver', 30, 40],
  ]);
  t.end();
});

test('transfer promise', async t => {
  const external = makeExternal();
  const kernel = buildKernel({ setImmediate }, external);
  let syscallA;
  const logA = [];
  function setupA(syscall) {
    syscallA = syscall;
    function deliver(facetID, method, argsString, slots) {
      logA.push([facetID, method, argsString, slots]);
    }
    return { deliver };
  }
  kernel.addVat('vatA', setupA);

  let syscallB;
  const logB = [];
  function setupB(syscall) {
    syscallB = syscall;
    function deliver(facetID, method, argsString, slots) {
      logB.push([facetID, method, argsString, slots]);
    }
    return { deliver };
  }
  kernel.addVat('vatB', setupB);

  const B = kernel.addImport('vatA', { type: 'export', vatID: 'vatB', id: 5 });
  const A = kernel.addImport('vatB', { type: 'export', vatID: 'vatA', id: 6 });

  const pr1 = syscallA.createPromise();
  t.deepEqual(pr1, { promiseID: 20, resolverID: 30 });
  // we send pr2
  const pr2 = syscallA.createPromise();
  t.deepEqual(pr2, { promiseID: 21, resolverID: 31 });

  t.deepEqual(kernel.dump().kernelTable, [
    ['vatA', 'import', 10, 'export', 'vatB', 5],
    ['vatA', 'promise', 20, 40], // pr1
    ['vatA', 'promise', 21, 41], // pr2
    ['vatA', 'resolver', 30, 40], // pr1
    ['vatA', 'resolver', 31, 41], // pr2
    ['vatB', 'import', 10, 'export', 'vatA', 6],
  ]);
  t.deepEqual(kernel.dump().promises, [
    {
      id: 40,
      state: 'unresolved',
      decider: 'vatA',
      subscribers: [],
      queue: [],
    },
    {
      id: 41,
      state: 'unresolved',
      decider: 'vatA',
      subscribers: [],
      queue: [],
    },
  ]);

  // sending a promise should arrive as a promise
  syscallA.send({ type: 'import', id: B.id }, 'foo1', 'args', [
    { type: 'promise', id: pr2.promiseID },
  ]);
  t.deepEqual(kernel.dump().runQueue, [
    {
      vatID: 'vatB',
      type: 'deliver',
      target: {
        type: 'export',
        vatID: 'vatB',
        id: 5,
      },
      msg: {
        method: 'foo1',
        argsString: 'args',
        slots: [{ type: 'promise', id: 41 }],
        kernelResolverID: 42,
      },
    },
  ]);
  t.deepEqual(kernel.dump().kernelTable, [
    ['vatA', 'import', 10, 'export', 'vatB', 5],
    ['vatA', 'promise', 20, 40], // pr1
    ['vatA', 'promise', 21, 41], // pr2
    ['vatA', 'promise', 22, 42], // answer for foo1()
    ['vatA', 'resolver', 30, 40], // pr1
    ['vatA', 'resolver', 31, 41], // pr2
    ['vatB', 'import', 10, 'export', 'vatA', 6],
  ]);
  t.deepEqual(kernel.dump().promises, [
    {
      id: 40,
      state: 'unresolved',
      decider: 'vatA',
      subscribers: [],
      queue: [],
    },
    {
      id: 41,
      state: 'unresolved',
      decider: 'vatA',
      subscribers: [],
      queue: [],
    },
    {
      id: 42,
      state: 'unresolved',
      decider: 'vatB',
      subscribers: [],
      queue: [],
    },
  ]);

  await kernel.run();
  t.deepEqual(logB.shift(), [5, 'foo1', 'args', [{ type: 'promise', id: 20 }]]);
  t.deepEqual(logB, []);
  t.deepEqual(kernel.dump().kernelTable, [
    ['vatA', 'import', 10, 'export', 'vatB', 5],
    ['vatA', 'promise', 20, 40], // pr1
    ['vatA', 'promise', 21, 41], // pr2
    ['vatA', 'promise', 22, 42], // promise for answer of foo1()
    ['vatA', 'resolver', 30, 40], // pr1
    ['vatA', 'resolver', 31, 41], // pr2
    ['vatB', 'import', 10, 'export', 'vatA', 6],
    ['vatB', 'promise', 20, 41],
    ['vatB', 'resolver', 30, 42], // resolver for answer of foo1()
  ]);

  // sending it a second time should arrive as the same thing
  syscallA.send({ type: 'import', id: B.id }, 'foo2', 'args', [
    { type: 'promise', id: pr2.promiseID },
  ]);
  await kernel.run();
  t.deepEqual(logB.shift(), [5, 'foo2', 'args', [{ type: 'promise', id: 20 }]]);
  t.deepEqual(logB, []);
  t.deepEqual(kernel.dump().kernelTable, [
    ['vatA', 'import', 10, 'export', 'vatB', 5],
    ['vatA', 'promise', 20, 40], // pr1
    ['vatA', 'promise', 21, 41], // pr2
    ['vatA', 'promise', 22, 42], // promise for answer of foo1()
    ['vatA', 'promise', 23, 43], // promise for answer of foo2()
    ['vatA', 'resolver', 30, 40], // pr1
    ['vatA', 'resolver', 31, 41], // pr2
    ['vatB', 'import', 10, 'export', 'vatA', 6],
    ['vatB', 'promise', 20, 41],
    ['vatB', 'resolver', 30, 42], // resolver for answer of foo1()
    ['vatB', 'resolver', 31, 43], // resolver for answer of foo2()
  ]);

  t.deepEqual(kernel.dump().promises, [
    {
      id: 40,
      state: 'unresolved',
      decider: 'vatA',
      subscribers: [],
      queue: [],
    },
    {
      id: 41,
      state: 'unresolved',
      decider: 'vatA',
      subscribers: [],
      queue: [],
    },
    {
      id: 42,
      state: 'unresolved',
      decider: 'vatB',
      subscribers: [],
      queue: [],
    },
    {
      id: 43,
      state: 'unresolved',
      decider: 'vatB',
      subscribers: [],
      queue: [],
    },
  ]);

  // sending it back should arrive with the sender's index
  syscallB.send({ type: 'import', id: A.id }, 'foo3', 'args', [
    { type: 'promise', id: 20 },
  ]);
  await kernel.run();
  t.deepEqual(logA.shift(), [
    6,
    'foo3',
    'args',
    [{ type: 'promise', id: pr2.promiseID }],
  ]);
  t.deepEqual(logA, []);
  t.deepEqual(kernel.dump().kernelTable, [
    ['vatA', 'import', 10, 'export', 'vatB', 5],
    ['vatA', 'promise', 20, 40], // pr1
    ['vatA', 'promise', 21, 41], // pr2
    ['vatA', 'promise', 22, 42], // promise for answer of foo1()
    ['vatA', 'promise', 23, 43], // promise for answer of foo2()
    ['vatA', 'resolver', 30, 40], // pr1
    ['vatA', 'resolver', 31, 41], // pr2
    ['vatA', 'resolver', 32, 44], // resolver for answer of foo3()
    ['vatB', 'import', 10, 'export', 'vatA', 6],
    ['vatB', 'promise', 20, 41],
    ['vatB', 'promise', 21, 44], // promise for answer of foo3()
    ['vatB', 'resolver', 30, 42], // resolver for answer of foo1()
    ['vatB', 'resolver', 31, 43], // resolver for answer of foo2()
  ]);

  // sending it back a second time should arrive as the same thing
  syscallB.send({ type: 'import', id: A.id }, 'foo4', 'args', [
    { type: 'promise', id: 20 },
  ]);
  await kernel.run();
  t.deepEqual(logA.shift(), [
    6,
    'foo4',
    'args',
    [{ type: 'promise', id: pr2.promiseID }],
  ]);
  t.deepEqual(logA, []);

  t.deepEqual(kernel.dump().promises, [
    {
      id: 40,
      state: 'unresolved',
      decider: 'vatA',
      subscribers: [],
      queue: [],
    },
    {
      id: 41,
      state: 'unresolved',
      decider: 'vatA',
      subscribers: [],
      queue: [],
    },
    {
      id: 42,
      state: 'unresolved',
      decider: 'vatB',
      subscribers: [],
      queue: [],
    },
    {
      id: 43,
      state: 'unresolved',
      decider: 'vatB',
      subscribers: [],
      queue: [],
    },
    {
      id: 44,
      state: 'unresolved',
      decider: 'vatA',
      subscribers: [],
      queue: [],
    },
    {
      id: 45,
      state: 'unresolved',
      decider: 'vatA',
      subscribers: [],
      queue: [],
    },
  ]);

  t.deepEqual(kernel.dump().kernelTable, [
    ['vatA', 'import', 10, 'export', 'vatB', 5],
    ['vatA', 'promise', 20, 40], // pr1
    ['vatA', 'promise', 21, 41], // pr2
    ['vatA', 'promise', 22, 42], // promise for answer of foo1()
    ['vatA', 'promise', 23, 43], // promise for answer of foo2()
    ['vatA', 'resolver', 30, 40], // pr1
    ['vatA', 'resolver', 31, 41], // pr2
    ['vatA', 'resolver', 32, 44], // resolver for answer of foo3()
    ['vatA', 'resolver', 33, 45], // resolver for answer of foo4()
    ['vatB', 'import', 10, 'export', 'vatA', 6],
    ['vatB', 'promise', 20, 41],
    ['vatB', 'promise', 21, 44], // promise for answer of foo3()
    ['vatB', 'promise', 22, 45], // promise for answer of foo4()
    ['vatB', 'resolver', 30, 42], // resolver for answer of foo1()
    ['vatB', 'resolver', 31, 43], // resolver for answer of foo2()
  ]);

  t.end();
});

test('subscribe to promise', async t => {
  const external = makeExternal();
  const kernel = buildKernel({ setImmediate }, external);
  let syscall;
  const log = [];
  function setup(s) {
    syscall = s;
    function deliver(facetID, method, argsString, slots) {
      log.push(['deliver', facetID, method, argsString, slots]);
    }
    return { deliver };
  }
  kernel.addVat('vat1', setup);

  const pr = syscall.createPromise();
  t.deepEqual(pr, { promiseID: 20, resolverID: 30 });
  t.deepEqual(kernel.dump().kernelTable, [
    ['vat1', 'promise', 20, 40],
    ['vat1', 'resolver', 30, 40],
  ]);

  syscall.subscribe(pr.promiseID);
  t.deepEqual(kernel.dump().promises, [
    {
      id: 40,
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

test.skip('promise redirection', t => {
  const external = makeExternal();
  const kernel = buildKernel({ setImmediate }, external);
  let syscall;
  const log = [];
  function setup(s) {
    syscall = s;
    function deliver(facetID, method, argsString, slots) {
      log.push([facetID, method, argsString, slots]);
    }
    return { deliver };
  }
  kernel.addVat('vat1', setup);

  const pr1 = syscall.createPromise();
  const pr2 = syscall.createPromise();
  t.deepEqual(kernel.dump().kernelTable, [
    ['vat1', 'promise', 20, 40],
    ['vat1', 'promise', 21, 41],
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
  const external = makeExternal();
  const kernel = buildKernel({ setImmediate }, external);
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
  kernel.addVat('vatA', setup);

  const pr = syscall.createPromise();
  t.deepEqual(kernel.dump().kernelTable, [
    ['vatA', 'promise', 20, 40],
    ['vatA', 'resolver', 30, 40],
  ]);

  const ex1 = { type: 'export', vatID: 'vatB', id: 6 };
  const A = kernel.addImport('vatA', ex1);

  syscall.subscribe(pr.promiseID);
  t.deepEqual(kernel.dump().promises, [
    {
      id: 40,
      state: 'unresolved',
      decider: 'vatA',
      subscribers: ['vatA'],
      queue: [],
    },
  ]);

  syscall.fulfillToData(pr.resolverID, 'args', [A]);
  // A gets mapped to a kernelPromiseID first, and a notifyFulfillToData
  // message is queued
  t.deepEqual(log, []); // no other dispatch calls
  t.deepEqual(kernel.dump().runQueue, [
    {
      type: 'notifyFulfillToData',
      vatID: 'vatA',
      kernelPromiseID: 40,
    },
  ]);

  await kernel.step();
  // the kernelPromiseID gets mapped back to A
  t.deepEqual(log.shift(), ['notify', pr.promiseID, 'args', [A]]);
  t.deepEqual(log, []); // no other dispatch calls
  t.deepEqual(kernel.dump().promises, [
    {
      id: 40,
      state: 'fulfilledToData',
      fulfillData: 'args',
      fulfillSlots: [ex1],
    },
  ]);
  t.deepEqual(kernel.dump().runQueue, []);

  t.end();
});

test('promise resolveToPresence', async t => {
  const external = makeExternal();
  const kernel = buildKernel({ setImmediate }, external);
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
  kernel.addVat('vatA', setup);

  const pr = syscall.createPromise();
  t.deepEqual(kernel.dump().kernelTable, [
    ['vatA', 'promise', 20, 40],
    ['vatA', 'resolver', 30, 40],
  ]);

  const ex1 = { type: 'export', vatID: 'vatB', id: 6 };
  const A = kernel.addImport('vatA', ex1);

  syscall.subscribe(pr.promiseID);
  t.deepEqual(kernel.dump().promises, [
    {
      id: 40,
      state: 'unresolved',
      decider: 'vatA',
      subscribers: ['vatA'],
      queue: [],
    },
  ]);

  syscall.fulfillToPresence(pr.resolverID, A);
  // A gets mapped to a kernelPromiseID first, and a notifyFulfillToPresence
  // message is queued
  t.deepEqual(log, []); // no other dispatch calls
  t.deepEqual(kernel.dump().runQueue, [
    {
      type: 'notifyFulfillToPresence',
      vatID: 'vatA',
      kernelPromiseID: 40,
    },
  ]);

  await kernel.step();

  // the kernelPromiseID gets mapped back to A
  t.deepEqual(log.shift(), ['notify', pr.promiseID, A]);
  t.deepEqual(log, []); // no other dispatch calls
  t.deepEqual(kernel.dump().promises, [
    {
      id: 40,
      state: 'fulfilledToPresence',
      fulfillSlot: ex1,
    },
  ]);
  t.deepEqual(kernel.dump().runQueue, []);

  t.end();
});

test('promise reject', async t => {
  const external = makeExternal();
  const kernel = buildKernel({ setImmediate }, external);
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
  kernel.addVat('vatA', setup);

  const pr = syscall.createPromise();
  t.deepEqual(kernel.dump().kernelTable, [
    ['vatA', 'promise', 20, 40],
    ['vatA', 'resolver', 30, 40],
  ]);

  const ex1 = { type: 'export', vatID: 'vatB', id: 6 };
  const A = kernel.addImport('vatA', ex1);

  syscall.subscribe(pr.promiseID);
  t.deepEqual(kernel.dump().promises, [
    {
      id: 40,
      state: 'unresolved',
      decider: 'vatA',
      subscribers: ['vatA'],
      queue: [],
    },
  ]);

  // the resolver-holder calls reject right away, because now we
  // automatically subscribe

  syscall.reject(pr.resolverID, 'args', [A]);
  // A gets mapped to a kernelPromiseID first, and a notifyReject message is
  // queued
  t.deepEqual(log, []); // no other dispatch calls
  t.deepEqual(kernel.dump().runQueue, [
    {
      type: 'notifyReject',
      vatID: 'vatA',
      kernelPromiseID: 40,
    },
  ]);
  await kernel.step();

  // the kernelPromiseID gets mapped back to A
  t.deepEqual(log.shift(), ['notify', pr.promiseID, 'args', [A]]);
  t.deepEqual(log, []); // no other dispatch calls
  t.deepEqual(kernel.dump().promises, [
    {
      id: 40,
      state: 'rejected',
      rejectData: 'args',
      rejectSlots: [ex1],
    },
  ]);
  t.deepEqual(kernel.dump().runQueue, []);

  t.end();
});

test('transcript', async t => {
  const external = makeExternal();
  const kernel = buildKernel({ setImmediate }, external);
  const log = [];
  function setup(syscall, _state) {
    function deliver(facetID, _method, _argsString, slots) {
      if (facetID === 1) {
        syscall.send(slots[1], 'foo', 'fooarg', []);
      }
    }
    return { deliver };
  }
  kernel.addVat('vatA', setup);
  kernel.queueToExport('vatA', 1, 'store', 'args string', [
    { type: 'export', vatID: 'vatA', id: 1 },
    { type: 'export', vatID: 'vatB', id: 2 },
  ]);
  await kernel.step();

  // the transcript records vat-specific import/export slots, so figure out
  // what vatA will receive
  const slot1 = kernel.dump().kernelTable[0];
  // vatA's import-X is mapped to vatB:export-2
  t.equal(slot1[0], 'vatA');
  t.equal(slot1[1], 'import');
  const X = slot1[2];
  t.equal(slot1[3], 'export');
  t.equal(slot1[4], 'vatB');
  t.equal(slot1[5], 2);

  const slot2 = kernel.dump().kernelTable[1];
  t.equal(slot2[0], 'vatA');
  t.equal(slot2[1], 'promise');
  const Y = slot2[2];

  t.deepEqual(log, []);
  const tr = kernel.dump().vatTables[0].state.transcript;
  t.equal(tr.length, 1);
  t.deepEqual(tr[0], {
    d: [
      'deliver',
      1,
      'store',
      'args string',
      [{ type: 'export', id: 1 }, { type: 'import', id: X }],
      undefined,
    ],
    syscalls: [
      {
        d: ['send', { type: 'import', id: X }, 'foo', 'fooarg', []],
        response: Y,
      },
    ],
  });

  t.end();
});
