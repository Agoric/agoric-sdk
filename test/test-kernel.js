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
  function d1(_syscall, facetID, method, argsString, slots) {
    log.push([facetID, method, argsString, slots]);
  }
  kernel.addVat('vat1', d1);
  const data = kernel.dump();
  t.deepEqual(data.vatTables, [{ vatID: 'vat1' }]);
  t.deepEqual(data.kernelTable, []);
  t.deepEqual(log, []);

  kernel.queue('vat1', 1, 'foo', 'args');
  t.deepEqual(kernel.dump().runQueue, [
    { vatID: 'vat1', facetID: 1, method: 'foo', argsString: 'args', slots: [] },
  ]);
  t.deepEqual(log, []);
  kernel.run();
  t.deepEqual(log, [[1, 'foo', 'args', []]]);

  t.end();
});

test('addImport', t => {
  const kernel = buildKernel({});
  function d1(syscall, facetID, method, argsString, slots) {}
  kernel.addVat('vat1', d1);

  function d2(syscall, facetID, method, argsString, slots) {}
  kernel.addVat('vat2', d1);

  const slotID = kernel.addImport('vat1', 'vat2', 5);
  t.equal(slotID, -1); // first import
  t.deepEqual(kernel.dump().kernelTable, [['vat1', slotID, 'vat2', 5]]);
  t.end();
});

test('outbound call', t => {
  const kernel = buildKernel({});
  const log = [];
  let v1tovat25;

  function d1(syscall, facetID, method, argsString, slots) {
    // console.log(`d1/${facetID} called`);
    log.push(['d1', facetID, method, argsString, slots]);
    syscall.send(v1tovat25, 'bar', 'bargs', []);
  }
  kernel.addVat('vat1', d1);

  function d2(syscall, facetID, method, argsString, slots) {
    // console.log(`d2/${facetID} called`);
    log.push(['d2', facetID, method, argsString, slots]);
  }
  kernel.addVat('vat2', d2);

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
      slots: [],
    },
  ]);

  kernel.step();
  t.deepEqual(log, [['d2', 5, 'bar', 'bargs', []]]);

  t.end();
});
