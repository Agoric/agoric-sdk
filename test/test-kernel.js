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
    function d1(facetID, method, argsString, slots) {
      log.push([facetID, method, argsString, slots]);
      syscall.log(JSON.stringify({ facetID, method, argsString, slots }));
    }
    return d1;
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
    function d1(facetID, method, argsString, slots) {
      log.push([facetID, method, argsString, slots]);
    }
    return d1;
  }
  kernel.addVat('vat1', setup1);
  const data = kernel.dump();
  t.deepEqual(data.vatTables, [{ vatID: 'vat1' }]);
  t.deepEqual(data.kernelTable, []);
  t.deepEqual(log, []);

  kernel.queue('vat1', 1, 'foo', 'args', [
    { type: 'export', vatID: 'vat1', slotID: 5 },
    { type: 'export', vatID: 'vat2', slotID: 6 },
  ]);
  t.deepEqual(kernel.dump().runQueue, [
    {
      vatID: 'vat1',
      facetID: 1,
      method: 'foo',
      argsString: 'args',
      slots: [
        { type: 'export', vatID: 'vat1', slotID: 5 },
        { type: 'export', vatID: 'vat2', slotID: 6 },
      ],
    },
  ]);
  t.deepEqual(log, []);
  await kernel.run();
  t.deepEqual(log, [
    [
      1,
      'foo',
      'args',
      [{ type: 'export', slotID: 5 }, { type: 'import', slotID: 1 }],
    ],
  ]);
  t.deepEqual(kernel.dump().kernelTable, [
    ['vat1', 'import', 1, 'export', 'vat2', 6],
  ]);

  t.end();
});

test('addImport', t => {
  const kernel = buildKernel({ setImmediate });
  function setup(_syscall) {
    function d1(_facetID, _method, _argsString, _slots) {}
    return d1;
  }
  kernel.addVat('vat1', setup);
  kernel.addVat('vat2', setup);

  const slotID = kernel.addImport('vat1', {
    type: 'export',
    vatID: 'vat2',
    slotID: 5,
  });
  t.deepEqual(slotID, { type: 'import', slotID: 1 }); // first import
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
    function d1(facetID, method, argsString, slots) {
      // console.log(`d1/${facetID} called`);
      log.push(['d1', facetID, method, argsString, slots]);
      syscall.send(v1tovat25.slotID, 'bar', 'bargs', [
        { type: 'import', slotID: v1tovat25.slotID },
        { type: 'export', slotID: 7 },
      ]);
    }
    return d1;
  }
  kernel.addVat('vat1', setup1);

  function setup2(_syscall) {
    function d2(facetID, method, argsString, slots) {
      // console.log(`d2/${facetID} called`);
      log.push(['d2', facetID, method, argsString, slots]);
    }
    return d2;
  }
  kernel.addVat('vat2', setup2);

  v1tovat25 = kernel.addImport('vat1', {
    type: 'export',
    vatID: 'vat2',
    slotID: 5,
  });
  t.deepEqual(v1tovat25, { type: 'import', slotID: 1 }); // first allocation

  const data = kernel.dump();
  t.deepEqual(data.vatTables, [{ vatID: 'vat1' }, { vatID: 'vat2' }]);
  t.deepEqual(data.kernelTable, [
    ['vat1', 'import', v1tovat25.slotID, 'export', 'vat2', 5],
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
        { type: 'export', vatID: 'vat2', slotID: 5 },
        { type: 'export', vatID: 'vat1', slotID: 7 },
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
      [{ type: 'export', slotID: 5 }, { type: 'import', slotID: 1 }],
    ],
  ]);
  t.deepEqual(kernel.dump().kernelTable, [
    ['vat1', 'import', v1tovat25.slotID, 'export', 'vat2', 5],
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
    function vatA(facetID, method, argsString, slots) {
      console.log(`vatA/${facetID} called`);
      log.push(['vatA', facetID, method, argsString, slots]);
      syscall.send(bobForA.slotID, 'intro', 'bargs', [
        { type: 'import', slotID: carolForA.slotID },
      ]);
    }
    return vatA;
  }
  kernel.addVat('vatA', setupA);

  function setupB(_syscall) {
    function vatB(facetID, method, argsString, slots) {
      console.log(`vatB/${facetID} called`);
      log.push(['vatB', facetID, method, argsString, slots]);
    }
    return vatB;
  }
  kernel.addVat('vatB', setupB);

  function setupC(_syscall) {
    function vatC(facetID, method, argsString, slots) {
      log.push(['vatC', facetID, method, argsString, slots]);
    }
    return vatC;
  }
  kernel.addVat('vatC', setupC);

  bobForA = kernel.addImport('vatA', {
    type: 'export',
    vatID: 'vatB',
    slotID: 5,
  });
  carolForA = kernel.addImport('vatA', {
    type: 'export',
    vatID: 'vatC',
    slotID: 6,
  });

  const data = kernel.dump();
  t.deepEqual(data.vatTables, [
    { vatID: 'vatA' },
    { vatID: 'vatB' },
    { vatID: 'vatC' },
  ]);
  t.deepEqual(data.kernelTable, [
    ['vatA', 'import', bobForA.slotID, 'export', 'vatB', 5],
    ['vatA', 'import', carolForA.slotID, 'export', 'vatC', 6],
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
      slots: [{ type: 'export', vatID: 'vatC', slotID: 6 }],
    },
  ]);

  await kernel.step();
  t.deepEqual(log, [
    ['vatB', 5, 'intro', 'bargs', [{ type: 'import', slotID: 1 }]],
  ]);
  t.deepEqual(kernel.dump().kernelTable, [
    ['vatA', 'import', bobForA.slotID, 'export', 'vatB', 5],
    ['vatA', 'import', carolForA.slotID, 'export', 'vatC', 6],
    ['vatB', 'import', 1, 'export', 'vatC', 6],
  ]);

  t.end();
});
