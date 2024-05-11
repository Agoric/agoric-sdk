import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { makeScalarBigMapStore } from '@agoric/vat-data';

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

  produce.alice.reset(`I'm ignored!`);
  await checkAlice(consume.alice, `Hi, I'm Alice again!`);

  produce.alice.reset();
  const newAlice = consume.alice;
  produce.alice.reset(`I'm rejected!`);
  await newAlice.then(
    res => t.assert(false, `unexpected resolution ${res}`),
    err => t.is(err, `I'm rejected!`),
  );

  const reusedAlice = consume.alice;
  produce.alice.reset();
  await checkAlice(reusedAlice, `Hi, I'm Alice 3!`);
});

test('makePromiseSpace copied into store', async t => {
  /** @type {MapStore<string, string>} */
  const store = makeScalarBigMapStore('stuff', { durable: true });
  {
    const { produce, consume } = makePromiseSpace({ store });
    produce.alice.resolve(`Hi, I'm Alice!`);
    await consume.alice;
  }
  t.is(store.get('alice'), `Hi, I'm Alice!`);
  const p = Promise.resolve(`Hi again!`);
  {
    const { produce, consume } = makePromiseSpace({ store });
    produce.alice.reset();
    produce.alice.resolve(p);
    await consume.alice;
  }
  await p;
  t.is(store.get('alice'), `Hi again!`);

  {
    const { produce } = makePromiseSpace({ store });
    produce.vanilla.resolve(`vanilla`);
    const doesNotResolve = new Promise(() => {});
    produce.chocolate.resolve(doesNotResolve);
    const nonPassable = harden(() => {});
    produce.strawberry.resolve(nonPassable);
    await null;
    const actual = Object.fromEntries(store.entries());
    t.deepEqual(
      actual,
      {
        alice: 'Hi again!',
        vanilla: 'vanilla',
      },
      'strore hooks filter unresolved promises and non-passables',
    );

    await null;
    produce.strawberry.resolve('ignored already resolved');
  }
});

test('resolve after reset', async t => {
  /** @type {MapStore<string, string>} */
  const store = makeScalarBigMapStore('stuff', { durable: true });

  const { consume, produce } = makePromiseSpace({ store });

  // sample resolve/consume early, then use after reset(): #7709

  // for foo, we produce first
  {
    // reset before resolving the first time
    const { resolve, reset } = produce.foo;
    const foo1 = consume.foo;
    reset();
    resolve(1);
    t.is(await foo1, 1);
    const foo2 = consume.foo;
    t.is(await foo2, 1);
  }

  {
    const { resolve, reset } = produce.foo;
    const foo1 = consume.foo;
    reset();
    resolve(2);
    t.is(await foo1, 1); // captured before reset()
    const foo2 = consume.foo;
    t.is(await foo2, 2);
  }

  {
    const foo1 = consume.foo;
    produce.foo.reset();
    const foo2 = consume.foo;
    produce.foo.resolve(3);
    const foo3 = consume.foo;
    t.is(await foo1, 2); // captured before reset()
    t.is(await foo2, 3);
    t.is(await foo3, 3);
  }

  // for 'bar', we consume first
  {
    const bar1 = consume.bar;
    const { resolve, reset } = produce.bar;
    reset();
    resolve(1);
    t.is(await bar1, 1);
    const bar2 = consume.bar;
    t.is(await bar2, 1);
  }

  {
    const { resolve, reset } = produce.bar;
    const bar1 = consume.bar;
    reset();
    resolve(2);
    t.is(await bar1, 1); // captured before reset()
    const bar2 = consume.bar;
    t.is(await bar2, 2);
  }

  {
    const bar1 = consume.bar;
    produce.bar.reset();
    const bar2 = consume.bar;
    produce.bar.resolve(3);
    const bar3 = consume.bar;
    t.is(await bar1, 2); // captured before reset()
    t.is(await bar2, 3);
    t.is(await bar3, 3);
  }
});
