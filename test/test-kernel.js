/* global setImmediate */
import { test } from 'tape-promise/tape';
import buildKernel from '../src/kernel/index';

test('build kernel', t => {
  const kernel = buildKernel({ setImmediate });
  kernel.run(); // empty queue
  const data = kernel.dump();
  t.deepEqual(data.vatTables, []);
  t.deepEqual(data.kernelTable, []);
  t.end();
});

test('simple call', async t => {
  const kernel = buildKernel({ setImmediate });
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
  t.deepEqual(data.vatTables, [{ vatID: 'vat1' }]);
  t.deepEqual(data.kernelTable, []);
  t.deepEqual(data.log, []);
  t.deepEqual(log, []);

  kernel.queue('vat1', 1, 'foo', 'args');
  t.deepEqual(kernel.dump().runQueue, [
    { vatID: 'vat1', facetID: 1, method: 'foo', argsString: 'args', slots: [] },
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
  const kernel = buildKernel({ setImmediate });
  const log = [];
  function setup1(_syscall) {
    function deliver(facetID, method, argsString, slots) {
      log.push([facetID, method, argsString, slots]);
    }
    return { deliver };
  }
  kernel.addVat('vat1', setup1);
  const data = kernel.dump();
  t.deepEqual(data.vatTables, [{ vatID: 'vat1' }]);
  t.deepEqual(data.kernelTable, []);
  t.deepEqual(log, []);

  kernel.queue('vat1', 1, 'foo', 'args', [
    { type: 'export', vatID: 'vat1', id: 5 },
    { type: 'export', vatID: 'vat2', id: 6 },
  ]);
  t.deepEqual(kernel.dump().runQueue, [
    {
      vatID: 'vat1',
      facetID: 1,
      method: 'foo',
      argsString: 'args',
      slots: [
        { type: 'export', vatID: 'vat1', id: 5 },
        { type: 'export', vatID: 'vat2', id: 6 },
      ],
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
  const kernel = buildKernel({ setImmediate });
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

test('outbound call', async t => {
  const kernel = buildKernel({ setImmediate });
  const log = [];
  let v1tovat25;

  function setup1(syscall) {
    function deliver(facetID, method, argsString, slots) {
      // console.log(`d1/${facetID} called`);
      log.push(['d1', facetID, method, argsString, slots]);
      syscall.send(v1tovat25.id, 'bar', 'bargs', [
        { type: 'import', id: v1tovat25.id },
        { type: 'export', id: 7 },
      ]);
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
  t.deepEqual(data.vatTables, [{ vatID: 'vat1' }, { vatID: 'vat2' }]);
  t.deepEqual(data.kernelTable, [
    ['vat1', 'import', v1tovat25.id, 'export', 'vat2', 5],
  ]);
  t.deepEqual(log, []);

  kernel.queue('vat1', 1, 'foo', 'args');
  t.deepEqual(log, []);
  t.deepEqual(kernel.dump().runQueue, [
    { vatID: 'vat1', facetID: 1, method: 'foo', argsString: 'args', slots: [] },
  ]);

  await kernel.step();

  t.deepEqual(log, [['d1', 1, 'foo', 'args', []]]);
  log.shift();

  t.deepEqual(kernel.dump().runQueue, [
    {
      vatID: 'vat2',
      facetID: 5,
      method: 'bar',
      argsString: 'bargs',
      slots: [
        { type: 'export', vatID: 'vat2', id: 5 },
        { type: 'export', vatID: 'vat1', id: 7 },
      ],
    },
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
    ['vat2', 'import', 10, 'export', 'vat1', 7],
  ]);

  t.end();
});

test('three-party', async t => {
  const kernel = buildKernel({ setImmediate });
  const log = [];
  let bobForA;
  let carolForA;

  function setupA(syscall) {
    function deliver(facetID, method, argsString, slots) {
      console.log(`vatA/${facetID} called`);
      log.push(['vatA', facetID, method, argsString, slots]);
      syscall.send(bobForA.id, 'intro', 'bargs', [
        { type: 'import', id: carolForA.id },
      ]);
    }
    return { deliver };
  }
  kernel.addVat('vatA', setupA);

  function setupB(_syscall) {
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

  const data = kernel.dump();
  t.deepEqual(data.vatTables, [
    { vatID: 'vatA' },
    { vatID: 'vatB' },
    { vatID: 'vatC' },
  ]);
  t.deepEqual(data.kernelTable, [
    ['vatA', 'import', bobForA.id, 'export', 'vatB', 5],
    ['vatA', 'import', carolForA.id, 'export', 'vatC', 6],
  ]);
  t.deepEqual(log, []);

  kernel.queue('vatA', 1, 'foo', 'args');
  await kernel.step();

  t.deepEqual(log, [['vatA', 1, 'foo', 'args', []]]);
  log.shift();

  t.deepEqual(kernel.dump().runQueue, [
    {
      vatID: 'vatB',
      facetID: 5,
      method: 'intro',
      argsString: 'bargs',
      slots: [{ type: 'export', vatID: 'vatC', id: 6 }],
    },
  ]);

  await kernel.step();
  t.deepEqual(log, [
    ['vatB', 5, 'intro', 'bargs', [{ type: 'import', id: 10 }]],
  ]);
  t.deepEqual(kernel.dump().kernelTable, [
    ['vatA', 'import', bobForA.id, 'export', 'vatB', 5],
    ['vatA', 'import', carolForA.id, 'export', 'vatC', 6],
    ['vatB', 'import', 10, 'export', 'vatC', 6],
  ]);

  t.end();
});

test('createPromise', t => {
  const kernel = buildKernel({ setImmediate });
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
    { id: 40, state: 'unresolved', decider: 'vat1', subscribers: [] },
  ]);

  t.deepEqual(kernel.dump().kernelTable, [['vat1', 'promise', 20, 40]]);
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
    ['vatB', 'import', 10, 'export', 'vatA', 6],
  ]);

  // sending a promise should arrive as a promise
  syscallA.send(B.id, 'foo1', 'args', [{ type: 'promise', id: pr2.promiseID }]);
  t.deepEqual(kernel.dump().runQueue, [
    {
      vatID: 'vatB',
      facetID: 5,
      method: 'foo1',
      argsString: 'args',
      slots: [{ type: 'promise', id: 41 }],
    },
  ]);
  await kernel.run();
  t.deepEqual(logB, [[5, 'foo1', 'args', [{ type: 'promise', id: 20 }]]]);
  logB.shift();

  // sending it a second time should arrive as the same thing
  syscallA.send(B.id, 'foo2', 'args', [{ type: 'promise', id: pr2.promiseID }]);
  await kernel.run();
  t.deepEqual(logB, [[5, 'foo2', 'args', [{ type: 'promise', id: 20 }]]]);
  logB.shift();

  // sending it back should arrive with the sender's index
  syscallB.send(A.id, 'foo3', 'args', [{ type: 'promise', id: 20 }]);
  await kernel.run();
  t.deepEqual(logA, [
    [6, 'foo3', 'args', [{ type: 'promise', id: pr2.promiseID }]],
  ]);
  logA.shift();

  // sending it back a second time should arrive as the same thing
  syscallB.send(A.id, 'foo4', 'args', [{ type: 'promise', id: 20 }]);
  await kernel.run();
  t.deepEqual(logA, [
    [6, 'foo4', 'args', [{ type: 'promise', id: pr2.promiseID }]],
  ]);
  logA.shift();

  t.deepEqual(kernel.dump().kernelTable, [
    ['vatA', 'import', 10, 'export', 'vatB', 5],
    ['vatA', 'promise', 20, 40], // pr1
    ['vatA', 'promise', 21, 41], // pr2
    ['vatB', 'import', 10, 'export', 'vatA', 6],
    ['vatB', 'promise', 20, 41], // B's view of pr2
  ]);

  t.end();
});

test('subscribe to promise', t => {
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
  kernel.addVat('vat1', setup);

  const pr = syscall.createPromise();
  t.deepEqual(pr, { promiseID: 20, resolverID: 30 });
  t.deepEqual(kernel.dump().kernelTable, [['vat1', 'promise', 20, 40]]);

  syscall.subscribe(pr.promiseID);
  t.deepEqual(kernel.dump().promises, [
    { id: 40, state: 'unresolved', decider: 'vat1', subscribers: ['vat1'] },
  ]);

  t.end();
});
