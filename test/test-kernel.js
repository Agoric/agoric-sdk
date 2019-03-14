import { test } from 'tape-promise/tape';
import Nat from '@agoric/nat';
import buildKernel from '../src/kernel/index';

test('build kernel', t => {
  const kernel = buildKernel({});
  kernel.run(); // empty queue
  const data = kernel.dump();
  t.deepEqual(data.vatTables, []);
  t.deepEqual(data.kernelTable, []);
  t.end();
});

test('simple call', t => {
  const kernel = buildKernel({});
  const log = [];
  function setup1() {
    function d1(syscall, facetID, method, argsString, slots) {
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
  kernel.run();
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

test('map inbound', t => {
  const kernel = buildKernel({});
  const log = [];
  function setup1() {
    function d1(_syscall, facetID, method, argsString, slots) {
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
    { vatID: 'vat1', slotID: 5 },
    { vatID: 'vat2', slotID: 6 },
  ]);
  t.deepEqual(kernel.dump().runQueue, [
    {
      vatID: 'vat1',
      facetID: 1,
      method: 'foo',
      argsString: 'args',
      slots: [{ vatID: 'vat1', slotID: 5 }, { vatID: 'vat2', slotID: 6 }],
    },
  ]);
  t.deepEqual(log, []);
  kernel.run();
  t.deepEqual(log, [[1, 'foo', 'args', [5, -1]]]);
  t.deepEqual(kernel.dump().kernelTable, [['vat1', -1, 'vat2', 6]]);

  t.end();
});

test('addImport', t => {
  const kernel = buildKernel({});
  function setup() {
    function d1(_syscall, _facetID, _method, _argsString, _slots) {}
    return d1;
  }
  kernel.addVat('vat1', setup);
  kernel.addVat('vat2', setup);

  const slotID = kernel.addImport('vat1', 'vat2', 5);
  t.equal(slotID, -1); // first import
  t.deepEqual(kernel.dump().kernelTable, [['vat1', slotID, 'vat2', 5]]);
  t.end();
});

test('outbound call', t => {
  const kernel = buildKernel({});
  const log = [];
  let v1tovat25;

  function setup1() {
    function d1(syscall, facetID, method, argsString, slots) {
      // console.log(`d1/${facetID} called`);
      log.push(['d1', facetID, method, argsString, slots]);
      syscall.send(v1tovat25, 'bar', 'bargs', [v1tovat25, 7]);
    }
    return d1;
  }
  kernel.addVat('vat1', setup1);

  function setup2() {
    function d2(syscall, facetID, method, argsString, slots) {
      // console.log(`d2/${facetID} called`);
      log.push(['d2', facetID, method, argsString, slots]);
    }
    return d2;
  }
  kernel.addVat('vat2', setup2);

  v1tovat25 = kernel.addImport('vat1', 'vat2', 5);
  t.ok(v1tovat25 < 0);
  t.ok(Nat(-v1tovat25));
  t.equal(v1tovat25, -1); // first allocation

  const data = kernel.dump();
  t.deepEqual(data.vatTables, [{ vatID: 'vat1' }, { vatID: 'vat2' }]);
  t.deepEqual(data.kernelTable, [['vat1', v1tovat25, 'vat2', 5]]);
  t.deepEqual(log, []);

  kernel.queue('vat1', 1, 'foo', 'args');
  t.deepEqual(log, []);
  t.deepEqual(kernel.dump().runQueue, [
    { vatID: 'vat1', facetID: 1, method: 'foo', argsString: 'args', slots: [] },
  ]);

  kernel.step();

  t.deepEqual(log, [['d1', 1, 'foo', 'args', []]]);
  log.shift();

  t.deepEqual(kernel.dump().runQueue, [
    {
      vatID: 'vat2',
      facetID: 5,
      method: 'bar',
      argsString: 'bargs',
      slots: [{ vatID: 'vat2', slotID: 5 }, { vatID: 'vat1', slotID: 7 }],
    },
  ]);

  kernel.step();
  t.deepEqual(log, [['d2', 5, 'bar', 'bargs', [5, -1]]]);
  t.deepEqual(kernel.dump().kernelTable, [
    ['vat1', v1tovat25, 'vat2', 5],
    ['vat2', -1, 'vat1', 7],
  ]);

  t.end();
});

test('three-party', t => {
  const kernel = buildKernel({});
  const log = [];
  let bobForA;
  let carolForA;

  function setupA() {
    function vatA(syscall, facetID, method, argsString, slots) {
      console.log(`vatA/${facetID} called`);
      log.push(['vatA', facetID, method, argsString, slots]);
      syscall.send(bobForA, 'intro', 'bargs', [carolForA]);
    }
    return vatA;
  }
  kernel.addVat('vatA', setupA);

  function setupB() {
    function vatB(syscall, facetID, method, argsString, slots) {
      console.log(`vatB/${facetID} called`);
      log.push(['vatB', facetID, method, argsString, slots]);
    }
    return vatB;
  }
  kernel.addVat('vatB', setupB);

  function setupC() {
    function vatC(syscall, facetID, method, argsString, slots) {
      log.push(['vatC', facetID, method, argsString, slots]);
    }
    return vatC;
  }
  kernel.addVat('vatC', setupC);

  bobForA = kernel.addImport('vatA', 'vatB', 5);
  carolForA = kernel.addImport('vatA', 'vatC', 6);

  const data = kernel.dump();
  t.deepEqual(data.vatTables, [
    { vatID: 'vatA' },
    { vatID: 'vatB' },
    { vatID: 'vatC' },
  ]);
  t.deepEqual(data.kernelTable, [
    ['vatA', carolForA, 'vatC', 6],
    ['vatA', bobForA, 'vatB', 5],
  ]);
  t.deepEqual(log, []);

  kernel.queue('vatA', 1, 'foo', 'args');
  kernel.step();

  t.deepEqual(log, [['vatA', 1, 'foo', 'args', []]]);
  log.shift();

  t.deepEqual(kernel.dump().runQueue, [
    {
      vatID: 'vatB',
      facetID: 5,
      method: 'intro',
      argsString: 'bargs',
      slots: [{ vatID: 'vatC', slotID: 6 }],
    },
  ]);

  kernel.step();
  t.deepEqual(log, [['vatB', 5, 'intro', 'bargs', [-1]]]);
  t.deepEqual(kernel.dump().kernelTable, [
    ['vatA', carolForA, 'vatC', 6],
    ['vatA', bobForA, 'vatB', 5],
    ['vatB', -1, 'vatC', 6],
  ]);

  t.end();
});
