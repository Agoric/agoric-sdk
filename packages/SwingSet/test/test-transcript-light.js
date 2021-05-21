/* global __dirname */
// eslint-disable-next-line import/order
import { test } from '../tools/prepare-test-env-ava';

import path from 'path';
import { getAllState, setAllState } from '@agoric/swing-store-simple';
import { provideHostStorage } from '../src/hostStorage';
import { buildVatController, loadBasedir } from '../src/index';

test('transcript-light load', async t => {
  const config = await loadBasedir(
    path.resolve(__dirname, 'basedir-transcript'),
  );
  const hostStorage = provideHostStorage();
  const c = await buildVatController(config, ['one'], { hostStorage });
  const kvStore = hostStorage.kvStore;
  const state0 = getAllState(kvStore);
  t.is(state0.initialized, 'true');
  t.not(state0.runQueue, '[]');

  await c.step();
  const state1 = getAllState(kvStore);

  await c.step();
  const state2 = getAllState(kvStore);

  await c.step();
  const state3 = getAllState(kvStore);

  await c.step();
  const state4 = getAllState(kvStore);

  await c.step();
  const state5 = getAllState(kvStore);

  // build from loaded state
  // Step 0

  const cfg0 = await loadBasedir(path.resolve(__dirname, 'basedir-transcript'));
  const hostStorage0 = provideHostStorage();
  const kvStore0 = hostStorage0.kvStore;
  // XXX TODO copy transcripts
  setAllState(kvStore0, state0);
  const c0 = await buildVatController(cfg0, ['one'], {
    hostStorage: hostStorage0,
  });

  await c0.step();
  t.deepEqual(state1, getAllState(kvStore0), `p1`);

  await c0.step();
  t.deepEqual(state2, getAllState(kvStore0), `p2`);

  await c0.step();
  t.deepEqual(state3, getAllState(kvStore0), `p3`);

  await c0.step();
  t.deepEqual(state4, getAllState(kvStore0), `p4`);

  await c0.step();
  t.deepEqual(state5, getAllState(kvStore0), `p5`);

  // Step 1

  const cfg1 = await loadBasedir(path.resolve(__dirname, 'basedir-transcript'));
  const hostStorage1 = provideHostStorage();
  const kvStore1 = hostStorage1.kvStore;
  setAllState(kvStore1, state1);
  const c1 = await buildVatController(cfg1, ['one'], {
    hostStorage: hostStorage1,
  });

  t.deepEqual(state1, getAllState(kvStore1), `p6`); // actual, expected

  await c1.step();
  t.deepEqual(state2, getAllState(kvStore1), `p7`);

  await c1.step();
  t.deepEqual(state3, getAllState(kvStore1), `p8`);

  await c1.step();
  t.deepEqual(state4, getAllState(kvStore1), `p9`);

  await c1.step();
  t.deepEqual(state5, getAllState(kvStore1), `p10`);

  // Step 2

  const cfg2 = await loadBasedir(path.resolve(__dirname, 'basedir-transcript'));
  const hostStorage2 = provideHostStorage();
  const kvStore2 = hostStorage2.kvStore;
  setAllState(kvStore2, state2);
  const c2 = await buildVatController(cfg2, ['one'], {
    hostStorage: hostStorage2,
  });

  t.deepEqual(state2, getAllState(kvStore2), `p11`);

  await c2.step();
  t.deepEqual(state3, getAllState(kvStore2), `p12`);

  await c2.step();
  t.deepEqual(state4, getAllState(kvStore2), `p13`);

  await c2.step();
  t.deepEqual(state5, getAllState(kvStore2), `p14`);
});
