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
    [1, 'foo', 'args', [{ type: 'export', id: 5 }, { type: 'import', id: 1 }]],
  ]);
  t.deepEqual(kernel.dump().kernelTable, [
    ['vat1', 'import', 1, 'export', 'vat2', 6],
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
  t.deepEqual(slot, { type: 'import', id: 1 }); // first import
  t.deepEqual(kernel.dump().kernelTable, [
    ['vat1', 'import', 1, 'export', 'vat2', 5],
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
  t.deepEqual(v1tovat25, { type: 'import', id: 1 }); // first allocation

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
      [{ type: 'export', id: 5 }, { type: 'import', id: 1 }],
    ],
  ]);
  t.deepEqual(kernel.dump().kernelTable, [
    ['vat1', 'import', v1tovat25.id, 'export', 'vat2', 5],
    ['vat2', 'import', 1, 'export', 'vat1', 7],
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
    ['vatB', 5, 'intro', 'bargs', [{ type: 'import', id: 1 }]],
  ]);
  t.deepEqual(kernel.dump().kernelTable, [
    ['vatA', 'import', bobForA.id, 'export', 'vatB', 5],
    ['vatA', 'import', carolForA.id, 'export', 'vatC', 6],
    ['vatB', 'import', 1, 'export', 'vatC', 6],
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

  const pr = syscall.createPromise();
  t.deepEqual(pr, { promiseID: 1, resolverID: 1 });

  t.deepEqual(kernel.dump().kernelTable, [['vat1', 'promise', 1, 1]]);
  t.end();
});
