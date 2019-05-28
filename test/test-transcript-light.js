import path from 'path';
import { test } from 'tape-promise/tape';
import { buildVatController, loadBasedir } from '../src/index';

async function testLoadState(t, withSES) {
  const config = await loadBasedir(
    path.resolve(__dirname, 'basedir-transcript'),
  );
  const c = await buildVatController(config, withSES, ['one']);

  const state0 = c.getState();

  await c.step();

  const state1 = c.getState();

  await c.step();

  const state2 = c.getState();

  await c.step();

  const state3 = c.getState();

  await c.step();

  const state4 = c.getState();

  await c.step();

  const state5 = c.getState();

  // build from loaded state
  // Step 0

  const cfg0 = await loadBasedir(
    path.resolve(__dirname, 'basedir-transcript'),
    state0,
  );

  const c0 = await buildVatController(cfg0, withSES, ['one']);
  await c0.step();

  t.deepEqual(state1, c0.getState());

  await c0.step();

  t.deepEqual(state2, c0.getState());

  await c0.step();

  t.deepEqual(state3, c0.getState());

  await c0.step();

  t.deepEqual(state4, c0.getState());

  await c0.step();

  t.deepEqual(state5, c0.getState());

  // Step 1

  const cfg1 = await loadBasedir(
    path.resolve(__dirname, 'basedir-transcript'),
    state1,
  );

  const c1 = await buildVatController(cfg1, withSES, ['one']);

  t.deepEqual(c1.getState(), state1); // actual, expected

  await c1.step();

  t.deepEqual(state2, c1.getState());

  await c1.step();

  t.deepEqual(state3, c1.getState());

  await c1.step();

  t.deepEqual(state4, c1.getState());

  await c1.step();

  t.deepEqual(state5, c1.getState());

  // Step 2

  const cfg2 = await loadBasedir(
    path.resolve(__dirname, 'basedir-transcript'),
    state2,
  );

  const c2 = await buildVatController(cfg2, withSES, ['one']);

  t.deepEqual(state2, c2.getState());

  await c2.step();

  t.deepEqual(state3, c2.getState());

  await c2.step();

  t.deepEqual(state4, c2.getState());

  await c2.step();

  t.deepEqual(state5, c2.getState());

  t.end();
}

test('transcript-light load with SES', async t => {
  await testLoadState(t, true);
});

test('transcript-light load without SES', async t => {
  await testLoadState(t, false);
});
