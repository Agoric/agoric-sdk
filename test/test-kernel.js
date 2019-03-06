import { test } from 'tape-promise/tape';
import { buildVatController } from '../src/index';
import buildKernel from '../src/kernel/index';

test('kernel', t => {
  const controller = buildKernel({});
  controller.run(); // empty queue
  t.end();
});
