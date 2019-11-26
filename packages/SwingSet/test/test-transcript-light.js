import path from 'path';
import { test } from 'tape-promise/tape';
import { buildVatController, loadBasedir } from '../src/index';
import { buildStorageInMemory } from '../src/hostStorage';

async function testLoadState(t, withSES) {
  const config = await loadBasedir(
    path.resolve(__dirname, 'basedir-transcript'),
  );
  const storage = buildStorageInMemory();
  config.hostStorage = storage.storage;
  const c = await buildVatController(config, withSES, ['one']);
  const state0 = storage.getState();

  await c.step();
  const state1 = storage.getState();

  await c.step();
  const state2 = storage.getState();

  await c.step();
  const state3 = storage.getState();

  await c.step();
  const state4 = storage.getState();

  await c.step();
  const state5 = storage.getState();

  // build from loaded state
  // Step 0

  const cfg0 = await loadBasedir(path.resolve(__dirname, 'basedir-transcript'));
  const storage0 = buildStorageInMemory(state0);
  cfg0.hostStorage = storage0.storage;
  const c0 = await buildVatController(cfg0, withSES, ['one']);

  await c0.step();
  t.deepEqual(state1, storage0.getState());

  await c0.step();
  t.deepEqual(state2, storage0.getState());

  await c0.step();
  t.deepEqual(state3, storage0.getState());

  await c0.step();
  t.deepEqual(state4, storage0.getState());

  await c0.step();
  t.deepEqual(state5, storage0.getState());

  // Step 1

  const cfg1 = await loadBasedir(path.resolve(__dirname, 'basedir-transcript'));
  const storage1 = buildStorageInMemory(state1);
  cfg1.hostStorage = storage1.storage;
  const c1 = await buildVatController(cfg1, withSES, ['one']);

  t.deepEqual(storage1.getState(), state1); // actual, expected

  await c1.step();
  t.deepEqual(state2, storage1.getState());

  await c1.step();
  t.deepEqual(state3, storage1.getState());

  await c1.step();
  t.deepEqual(state4, storage1.getState());

  await c1.step();
  t.deepEqual(state5, storage1.getState());

  // Step 2

  const cfg2 = await loadBasedir(path.resolve(__dirname, 'basedir-transcript'));
  const storage2 = buildStorageInMemory(state2);
  cfg2.hostStorage = storage2.storage;
  const c2 = await buildVatController(cfg2, withSES, ['one']);

  t.deepEqual(state2, storage2.getState());

  await c2.step();
  t.deepEqual(state3, storage2.getState());

  await c2.step();
  t.deepEqual(state4, storage2.getState());

  await c2.step();
  t.deepEqual(state5, storage2.getState());

  t.end();
}

test('transcript-light load with SES', async t => {
  await testLoadState(t, true);
});

test('transcript-light load without SES', async t => {
  await testLoadState(t, false);
});
