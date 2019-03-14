import path from 'path';
import { test } from 'tape-promise/tape';
import { buildVatController, loadBasedir } from '../src/index';

async function testFlush(t, withSES) {
  const config = await loadBasedir(path.resolve(__dirname, 'd4'));
  const c = await buildVatController(config, withSES, ['flush']);
  // all promises should settle before c.step() fires
  await c.step();
  t.deepEqual(c.dump().log, ['bootstrap called', 'then1', 'then2']);
  t.end();
}

test('flush with SES', async t => {
  await testFlush(t, true);
});

test('flush without SES', async t => {
  await testFlush(t, false);
});

async function testEThen(t, withSES) {
  const config = await loadBasedir(path.resolve(__dirname, 'd4'));
  const c = await buildVatController(config, withSES, ['e-then']);

  await c.run();
  t.deepEqual(c.dump().log, [
    'bootstrap called',
    'left.callRight 1',
    'right 2',
    'b.resolved 3',
    'left.then 4',
  ]);
  t.end();
}

test('E() resolve with SES', async t => {
  await testEThen(t, true);
});

test('E() resolve without SES', async t => {
  await testEThen(t, false);
});
