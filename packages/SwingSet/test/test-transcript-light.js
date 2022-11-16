// eslint-disable-next-line import/order
import { test } from '../tools/prepare-test-env-ava.js';
// eslint-disable-next-line import/order
import { initSwingStore, getAllState, setAllState } from '@agoric/swing-store';
import { buildVatController, loadBasedir } from '../src/index.js';

test('transcript-light load', async t => {
  const config = await loadBasedir(
    new URL('basedir-transcript', import.meta.url).pathname,
  );
  const kernelStorage = initSwingStore().kernelStorage;
  const c = await buildVatController(config, ['one'], { kernelStorage });
  t.teardown(c.shutdown);
  const state0 = getAllState(kernelStorage);
  t.is(state0.kvStuff.initialized, 'true');
  t.is(state0.kvStuff.runQueue, '[1,1]');
  t.not(state0.kvStuff.acceptanceQueue, '[]');

  await c.step();
  const state1 = getAllState(kernelStorage);

  await c.step();
  const state2 = getAllState(kernelStorage);

  await c.step();
  const state3 = getAllState(kernelStorage);

  await c.step();
  const state4 = getAllState(kernelStorage);

  await c.step();
  const state5 = getAllState(kernelStorage);

  // build from loaded state
  // Step 0

  const cfg0 = await loadBasedir(
    new URL('basedir-transcript', import.meta.url).pathname,
  );
  const kernelStorage0 = initSwingStore().kernelStorage;
  setAllState(kernelStorage0, state0);
  const c0 = await buildVatController(cfg0, ['one'], {
    kernelStorage: kernelStorage0,
  });
  t.teardown(c0.shutdown);

  await c0.step();
  t.deepEqual(state1, getAllState(kernelStorage0), `p1`);

  await c0.step();
  t.deepEqual(state2, getAllState(kernelStorage0), `p2`);

  await c0.step();
  t.deepEqual(state3, getAllState(kernelStorage0), `p3`);

  await c0.step();
  t.deepEqual(state4, getAllState(kernelStorage0), `p4`);

  await c0.step();
  t.deepEqual(state5, getAllState(kernelStorage0), `p5`);

  // Step 1

  const cfg1 = await loadBasedir(
    new URL('basedir-transcript', import.meta.url).pathname,
  );
  const kernelStorage1 = initSwingStore().kernelStorage;
  setAllState(kernelStorage1, state1);
  const c1 = await buildVatController(cfg1, ['one'], {
    kernelStorage: kernelStorage1,
  });
  t.teardown(c1.shutdown);

  t.deepEqual(state1, getAllState(kernelStorage1), `p6`); // actual, expected

  await c1.step();
  t.deepEqual(state2, getAllState(kernelStorage1), `p7`);

  await c1.step();
  t.deepEqual(state3, getAllState(kernelStorage1), `p8`);

  await c1.step();
  t.deepEqual(state4, getAllState(kernelStorage1), `p9`);

  await c1.step();
  t.deepEqual(state5, getAllState(kernelStorage1), `p10`);

  // Step 2

  const cfg2 = await loadBasedir(
    new URL('basedir-transcript', import.meta.url).pathname,
  );
  const kernelStorage2 = initSwingStore().kernelStorage;
  setAllState(kernelStorage2, state2);
  const c2 = await buildVatController(cfg2, ['one'], {
    kernelStorage: kernelStorage2,
  });
  t.teardown(c2.shutdown);

  t.deepEqual(state2, getAllState(kernelStorage2), `p11`);

  await c2.step();
  t.deepEqual(state3, getAllState(kernelStorage2), `p12`);

  await c2.step();
  t.deepEqual(state4, getAllState(kernelStorage2), `p13`);

  await c2.step();
  t.deepEqual(state5, getAllState(kernelStorage2), `p14`);
});
