import path from 'path';
import { test } from 'tape-promise/tape';
import { buildVatController, loadBasedir } from '../src/index';
import { makeStorageInMemory } from '../src/stateInMemory';
import stringify from '../src/kernel/json-stable-stringify';

async function testLoadState(t, withSES) {
  const config = await loadBasedir(
    path.resolve(__dirname, 'basedir-transcript'),
  );
  const s = {};
  config.externalStorage = makeStorageInMemory(s);
  const c = await buildVatController(config, withSES, ['one']);
  const state0 = stringify(s);

  await c.step();
  const state1 = stringify(s);

  await c.step();
  const state2 = stringify(s);

  await c.step();
  const state3 = stringify(s);

  await c.step();
  const state4 = stringify(s);

  await c.step();
  const state5 = stringify(s);

  // build from loaded state
  // Step 0

  const cfg0 = await loadBasedir(path.resolve(__dirname, 'basedir-transcript'));
  const s0 = JSON.parse(state0);
  cfg0.externalStorage = makeStorageInMemory(s0);
  const c0 = await buildVatController(cfg0, withSES, ['one']);

  await c0.step();
  t.deepEqual(state1, stringify(s0));

  await c0.step();
  t.deepEqual(state2, stringify(s0));

  await c0.step();
  t.deepEqual(state3, stringify(s0));

  await c0.step();
  t.deepEqual(state4, stringify(s0));

  await c0.step();
  t.deepEqual(state5, stringify(s0));

  // Step 1

  const cfg1 = await loadBasedir(path.resolve(__dirname, 'basedir-transcript'));
  const s1 = JSON.parse(state1);
  cfg1.externalStorage = makeStorageInMemory(s1);
  const c1 = await buildVatController(cfg1, withSES, ['one']);

  t.deepEqual(stringify(s1), state1); // actual, expected

  await c1.step();
  t.deepEqual(state2, stringify(s1));

  await c1.step();
  t.deepEqual(state3, stringify(s1));

  await c1.step();
  t.deepEqual(state4, stringify(s1));

  await c1.step();
  t.deepEqual(state5, stringify(s1));

  // Step 2

  const cfg2 = await loadBasedir(path.resolve(__dirname, 'basedir-transcript'));
  const s2 = JSON.parse(state2);
  cfg2.externalStorage = makeStorageInMemory(s2);
  const c2 = await buildVatController(cfg2, withSES, ['one']);

  t.deepEqual(state2, stringify(s2));

  await c2.step();
  t.deepEqual(state3, stringify(s2));

  await c2.step();
  t.deepEqual(state4, stringify(s2));

  await c2.step();
  t.deepEqual(state5, stringify(s2));

  t.end();
}

test('transcript-light load with SES', async t => {
  await testLoadState(t, true);
});

test('transcript-light load without SES', async t => {
  await testLoadState(t, false);
});
