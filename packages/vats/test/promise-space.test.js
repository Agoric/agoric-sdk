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
    t.is(store.get('alice'), `Hi, I'm Alice!`);

    // Reusing the same store with a new promise space should not need to reset
    // for an update.
    const pc2 = makePromiseSpace({ store });
    pc2.produce.alice.resolve(`I updated the store!`);
    await pc2.consume.alice;
    t.is(store.get('alice'), `I updated the store!`);

    const p = Promise.resolve(`Hi again!`);
    produce.alice.reset();
    produce.alice.resolve(p);
    produce.alice.reject(Error('should be ignored (alice has not been reset)'));
    await consume.alice;
    await p;
    t.is(store.get('alice'), `Hi again!`);
  }

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

  // A reset before the first resolve reuses the same promise.
  {
    const baz1 = consume.baz;
    produce.baz.reset();
    const baz2 = consume.baz;
    produce.baz.resolve(2);
    const baz3 = consume.baz;
    t.is(baz1, baz2, 'baz1 and baz2 are the same promise');
    t.is(baz2, baz3, 'baz2 and baz3 are the same promise');
    t.is(await baz1, 2);
    t.is(await baz2, 2);
    t.is(await baz3, 2);
  }
});
