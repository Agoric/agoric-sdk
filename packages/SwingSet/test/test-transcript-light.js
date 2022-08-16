// eslint-disable-next-line import/order
import { test } from '../tools/prepare-test-env-ava.js';
// eslint-disable-next-line import/order
import { getAllState, setAllState } from '@agoric/swing-store';

import { provideHostStorage } from '../src/controller/hostStorage.js';
import { buildVatController, loadBasedir } from '../src/index.js';

test('transcript-light load', async t => {
  const config = await loadBasedir(
    new URL('basedir-transcript', import.meta.url).pathname,
  );
  const hostStorage = provideHostStorage();
  const c = await buildVatController(config, ['one'], { hostStorage });
  t.teardown(c.shutdown);
  const state0 = getAllState(hostStorage);
  t.is(state0.kvStuff.initialized, 'true');
  t.is(state0.kvStuff.runQueue, '[1,1]');
  t.not(state0.kvStuff.acceptanceQueue, '[]');

  await c.step();
  const state1 = getAllState(hostStorage);

  await c.step();
  const state2 = getAllState(hostStorage);

  await c.step();
  const state3 = getAllState(hostStorage);

  await c.step();
  const state4 = getAllState(hostStorage);

  await c.step();
  const state5 = getAllState(hostStorage);

  // build from loaded state
  // Step 0

  const cfg0 = await loadBasedir(
    new URL('basedir-transcript', import.meta.url).pathname,
  );
  const hostStorage0 = provideHostStorage();
  setAllState(hostStorage0, state0);
  const c0 = await buildVatController(cfg0, ['one'], {
    hostStorage: hostStorage0,
  });
  t.teardown(c0.shutdown);

  await c0.step();
  t.deepEqual(state1, getAllState(hostStorage0), `p1`);

  await c0.step();
  t.deepEqual(state2, getAllState(hostStorage0), `p2`);

  await c0.step();
  t.deepEqual(state3, getAllState(hostStorage0), `p3`);

  await c0.step();
  t.deepEqual(state4, getAllState(hostStorage0), `p4`);

  await c0.step();
  t.deepEqual(state5, getAllState(hostStorage0), `p5`);

  // Step 1

  const cfg1 = await loadBasedir(
    new URL('basedir-transcript', import.meta.url).pathname,
  );
  const hostStorage1 = provideHostStorage();
  setAllState(hostStorage1, state1);
  const c1 = await buildVatController(cfg1, ['one'], {
    hostStorage: hostStorage1,
  });
  t.teardown(c1.shutdown);

  t.deepEqual(state1, getAllState(hostStorage1), `p6`); // actual, expected

  await c1.step();
  t.deepEqual(state2, getAllState(hostStorage1), `p7`);

  await c1.step();
  t.deepEqual(state3, getAllState(hostStorage1), `p8`);

  await c1.step();
  t.deepEqual(state4, getAllState(hostStorage1), `p9`);

  await c1.step();
  t.deepEqual(state5, getAllState(hostStorage1), `p10`);

  // Step 2

  const cfg2 = await loadBasedir(
    new URL('basedir-transcript', import.meta.url).pathname,
  );
  const hostStorage2 = provideHostStorage();
  setAllState(hostStorage2, state2);
  const c2 = await buildVatController(cfg2, ['one'], {
    hostStorage: hostStorage2,
  });
  t.teardown(c2.shutdown);

  t.deepEqual(state2, getAllState(hostStorage2), `p11`);

  await c2.step();
  t.deepEqual(state3, getAllState(hostStorage2), `p12`);

  await c2.step();
  t.deepEqual(state4, getAllState(hostStorage2), `p13`);

  await c2.step();
  t.deepEqual(state5, getAllState(hostStorage2), `p14`);
});
