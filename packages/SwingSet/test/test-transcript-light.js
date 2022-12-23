// eslint-disable-next-line import/order
import { test } from '../tools/prepare-test-env-ava.js';
// eslint-disable-next-line import/order
import { initSwingStore } from '@agoric/swing-store';
import { buildVatController, loadBasedir } from '../src/index.js';

test('transcript-light load', async t => {
  const config = await loadBasedir(
    new URL('basedir-transcript', import.meta.url).pathname,
  );
  const { kernelStorage, debug } = initSwingStore();
  const c = await buildVatController(config, ['one'], { kernelStorage });
  t.teardown(c.shutdown);
  const state0 = debug.getAllState();
  t.is(state0.kvStuff.initialized, 'true');
  t.is(state0.kvStuff.runQueue, '[1,1]');
  t.not(state0.kvStuff.acceptanceQueue, '[]');

  await c.step();
  const state1 = debug.getAllState();

  await c.step();
  const state2 = debug.getAllState();

  await c.step();
  const state3 = debug.getAllState();

  await c.step();
  const state4 = debug.getAllState();

  await c.step();
  const state5 = debug.getAllState();

  // build from loaded state
  // Step 0

  const cfg0 = await loadBasedir(
    new URL('basedir-transcript', import.meta.url).pathname,
  );
  const { kernelStorage: kernelStorage0, debug: debug0 } = initSwingStore();
  debug0.setAllState(state0);
  const c0 = await buildVatController(cfg0, ['one'], {
    kernelStorage: kernelStorage0,
  });
  t.teardown(c0.shutdown);

  await c0.step();
  t.deepEqual(state1, debug0.getAllState(), `p1`);

  await c0.step();
  t.deepEqual(state2, debug0.getAllState(), `p2`);

  await c0.step();
  t.deepEqual(state3, debug0.getAllState(), `p3`);

  await c0.step();
  t.deepEqual(state4, debug0.getAllState(), `p4`);

  await c0.step();
  t.deepEqual(state5, debug0.getAllState(), `p5`);

  // Step 1

  const cfg1 = await loadBasedir(
    new URL('basedir-transcript', import.meta.url).pathname,
  );
  const { kernelStorage: kernelStorage1, debug: debug1 } = initSwingStore();
  debug1.setAllState(state1);
  const c1 = await buildVatController(cfg1, ['one'], {
    kernelStorage: kernelStorage1,
  });
  t.teardown(c1.shutdown);

  t.deepEqual(state1, debug1.getAllState(), `p6`); // actual, expected

  await c1.step();
  t.deepEqual(state2, debug1.getAllState(), `p7`);

  await c1.step();
  t.deepEqual(state3, debug1.getAllState(), `p8`);

  await c1.step();
  t.deepEqual(state4, debug1.getAllState(), `p9`);

  await c1.step();
  t.deepEqual(state5, debug1.getAllState(), `p10`);

  // Step 2

  const cfg2 = await loadBasedir(
    new URL('basedir-transcript', import.meta.url).pathname,
  );
  const { kernelStorage: kernelStorage2, debug: debug2 } = initSwingStore();
  debug2.setAllState(state2);
  const c2 = await buildVatController(cfg2, ['one'], {
    kernelStorage: kernelStorage2,
  });
  t.teardown(c2.shutdown);

  t.deepEqual(state2, debug2.getAllState(), `p11`);

  await c2.step();
  t.deepEqual(state3, debug2.getAllState(), `p12`);

  await c2.step();
  t.deepEqual(state4, debug2.getAllState(), `p13`);

  await c2.step();
  t.deepEqual(state5, debug2.getAllState(), `p14`);
});
