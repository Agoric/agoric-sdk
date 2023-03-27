// @ts-check
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { makePromiseSpace } from '../src/core/promise-space.js';

test('makePromiseSpace', async t => {
  const { produce, consume } = makePromiseSpace();

  const checkAlice = async (alice, res) => {
    let resolved = false;
    t.is(Promise.resolve(alice), alice, 'alice is a promise');
    const aliceDone = alice.then(val => {
      t.assert(resolved);
      t.is(val, res);
    });
    await null;
    produce.alice.resolve(res);
    resolved = true;
    await aliceDone;
  };

  await checkAlice(consume.alice, `Hi, I'm Alice!`);

  // @ts-expect-error
  produce.alice.reset(`I'm ignored!`);
  await checkAlice(consume.alice, `Hi, I'm Alice again!`);

  produce.alice.reset();
  const newAlice = consume.alice;
  // @ts-expect-error
  produce.alice.reset(`I'm rejected!`);
  await newAlice.then(
    res => t.assert(false, `unexpected resolution ${res}`),
    err => t.is(err, `I'm rejected!`),
  );

  const reusedAlice = consume.alice;
  produce.alice.reset();
  await checkAlice(reusedAlice, `Hi, I'm Alice 3!`);
});
