import { test } from 'tape-promise/tape';
import buildKernel from '../src/kernel/index';

test('kernel', t => {
  const controller = buildKernel({});
  controller.run(); // empty queue
  const data = controller.dumpSlots();
  console.log(data);
  t.deepEqual(data.vatTables, []);
  t.deepEqual(data.kernelTable, []);
  t.end();
});
