// @ts-nocheck

import { test } from '../tools/prepare-test-env-ava.js';
// eslint-disable-next-line import/order
import { initSwingStore } from '@agoric/swing-store';
import { buildVatController, loadBasedir } from '../src/index.js';

// this test wants to compare the swing-store state from one run to
// another, so we need to dump the state in a deterministic fashion

test('transcript-light load', async t => {
  const config = await loadBasedir(
    new URL('basedir-transcript', import.meta.url).pathname,
  );
  const { kernelStorage, debug } = initSwingStore();
  const c = await buildVatController(config, ['one'], { kernelStorage });
  t.teardown(c.shutdown);
  const serialized0 = debug.serialize();
  const kvstate0 = debug.dump().kvEntries;
  t.is(kvstate0.version, '2');
  t.is(kvstate0.runQueue, '[1,1]');
  t.not(kvstate0.acceptanceQueue, '[]');

  await c.step();
  const state1 = debug.dump();
  const serialized1 = debug.serialize();

  await c.step();
  const state2 = debug.dump();
  const serialized2 = debug.serialize();

  await c.step();
  const state3 = debug.dump();

  await c.step();
  const state4 = debug.dump();

  await c.step();
  const state5 = debug.dump();

  // build from loaded state
  // Step 0

  const cfg0 = await loadBasedir(
    new URL('basedir-transcript', import.meta.url).pathname,
  );
  const ss0 = initSwingStore(null, { serialized: serialized0 });
  const c0 = await buildVatController(cfg0, ['one'], {
    kernelStorage: ss0.kernelStorage,
  });
  t.teardown(c0.shutdown);

  await c0.step();
  t.deepEqual(state1, ss0.debug.dump(), `p1`);

  await c0.step();
  t.deepEqual(state2, ss0.debug.dump(), `p2`);

  await c0.step();
  t.deepEqual(state3, ss0.debug.dump(), `p3`);

  await c0.step();
  t.deepEqual(state4, ss0.debug.dump(), `p4`);

  await c0.step();
  t.deepEqual(state5, ss0.debug.dump(), `p5`);

  // Step 1

  const cfg1 = await loadBasedir(
    new URL('basedir-transcript', import.meta.url).pathname,
  );
  const ss1 = initSwingStore(null, { serialized: serialized1 });
  const c1 = await buildVatController(cfg1, ['one'], {
    kernelStorage: ss1.kernelStorage,
  });
  t.teardown(c1.shutdown);

  t.deepEqual(state1, ss1.debug.dump(), `p6`); // actual, expected

  await c1.step();
  t.deepEqual(state2, ss1.debug.dump(), `p7`);

  await c1.step();
  t.deepEqual(state3, ss1.debug.dump(), `p8`);

  await c1.step();
  t.deepEqual(state4, ss1.debug.dump(), `p9`);

  await c1.step();
  t.deepEqual(state5, ss1.debug.dump(), `p10`);

  // Step 2

  const cfg2 = await loadBasedir(
    new URL('basedir-transcript', import.meta.url).pathname,
  );
  const ss2 = initSwingStore(null, { serialized: serialized2 });
  const c2 = await buildVatController(cfg2, ['one'], {
    kernelStorage: ss2.kernelStorage,
  });
  t.teardown(c2.shutdown);

  t.deepEqual(state2, ss2.debug.dump(), `p11`);

  await c2.step();
  t.deepEqual(state3, ss2.debug.dump(), `p12`);

  await c2.step();
  t.deepEqual(state4, ss2.debug.dump(), `p13`);

  await c2.step();
  t.deepEqual(state5, ss2.debug.dump(), `p14`);
});
