import test from 'tape';
import maybeExtendPromise from '../src/index';

if (typeof window !== 'undefined') {
  // Let the browser detect when the tests are done.
  /* eslint-disable-next-line no-undef */
  window.testDonePromise = new Promise(resolve => {
    test.onFinish(() => {
      // Allow the summary to be printed.
      setTimeout(resolve, 1);
    });
  });
}

test('handlers are always async', async t => {
  try {
    const EPromise = maybeExtendPromise(Promise);

    const queue = [];
    const handler = {
      POST(_o, fn, args) {
        queue.push([fn, args]);
        return 'foo';
      },
    };
    let resolver;
    const ep = EPromise.makeHandled(resolve => {
      resolver = resolve;
    }, handler);

    // Make sure asynchronous posts go through.
    const firstPost = ep.post('myfn', ['abc', 123]).then(v => {
      t.equal(v, 'foo', 'post return value is foo');
      t.deepEqual(queue, [['myfn', ['abc', 123]]], 'single post in queue');
    });

    t.deepEqual(queue, [], 'unfulfilled post is asynchronous');
    await firstPost;
    t.deepEqual(
      queue,
      [['myfn', ['abc', 123]]],
      'single post in queue after await',
    );

    const target = {};
    resolver(target, handler);
    const secondPost = ep.post('myotherfn', ['def', 456]).then(v => {
      t.equal(v, 'foo', 'second post return value is foo');
      t.deepEqual(
        queue,
        [['myfn', ['abc', 123]], ['myotherfn', ['def', 456]]],
        'second post is queued',
      );
    });

    t.deepEqual(queue, [['myfn', ['abc', 123]]], 'second post is asynchronous');
    await secondPost;
    t.deepEqual(
      queue,
      [['myfn', ['abc', 123]], ['myotherfn', ['def', 456]]],
      'second post is queued after await',
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('maybeExtendPromise will not overwrite', async t => {
  try {
    const { makeHandled: secondMakeHandled } = maybeExtendPromise(Promise);
    const { makeHandled: thirdMakeHandled } = maybeExtendPromise(Promise);
    t.equal(thirdMakeHandled, secondMakeHandled);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('EPromise.makeHandled expected errors', async t => {
  try {
    const EPromise = maybeExtendPromise(Promise);

    const relay = {
      GET(key) {
        return key;
      },
      DELETE(_key) {
        return true;
      },
      PUT(key, value) {
        return value;
      },
      POST(key, args) {
        return args;
      },
    };

    // Full relay succeeds.
    const fullObj = {};
    t.equal(
      await EPromise.makeHandled(resolve => resolve(fullObj, relay)),
      fullObj,
    );

    // Primitive relay fails.
    try {
      t.assert(
        (await EPromise.makeHandled(resolve => resolve({}, 123))) && false,
      );
    } catch (e) {
      t.throws(() => {
        throw e;
      }, /cannot be a primitive/);
    }

    // Relay missing a method fails.
    for (const method of Object.keys(relay)) {
      const { [method]: elide, ...relay2 } = relay;
      t.equal(elide, relay[method]);
      let op;
      switch (method) {
        case 'GET':
          op = p => p.get('foo');
          break;
        case 'PUT':
          op = p => p.put('foo', 123);
          break;
        case 'POST':
          op = p => p.post('bar', ['abc', 123]);
          break;
        case 'DELETE':
          op = p => p.delete('foo');
          break;
        default:
          throw TypeError(`Unrecognized method type ${method}`);
      }
      try {
        t.assert(
          // eslint-disable-next-line no-await-in-loop
          (await op(EPromise.makeHandled(resolve => resolve({}, relay2)))) &&
            false,
        );
      } catch (e) {
        t.throws(() => {
          throw e;
        }, new RegExp(`fulfilledHandler.${method} is not a function`));
      }
    }

    // Primitive resolve fails.
    try {
      t.assert(
        (await EPromise.makeHandled(resolve => resolve(123, relay))) && false,
      );
    } catch (e) {
      t.throws(() => {
        throw e;
      }, /cannot be a primitive/);
    }

    // Promise resolve fails.
    const promise = EPromise.resolve({});
    try {
      t.assert(
        (await EPromise.makeHandled(resolve => resolve(promise, relay))) &&
          false,
      );
    } catch (e) {
      t.throws(() => {
        throw e;
      }, /cannot be a Promise/);
    }

    // First resolve succeeds.
    const obj = {};
    t.assert(await EPromise.makeHandled(resolve => resolve(obj, relay)));

    // And second does too.
    t.assert(await EPromise.makeHandled(resolve => resolve(obj, relay)));
  } catch (e) {
    t.assert(false, `Unexpected exception ${e}`);
  } finally {
    t.end();
  }
});

test('EPromise.makeHandled(executor, undefined)', async t => {
  try {
    const EPromise = maybeExtendPromise(Promise);

    const remoteP = EPromise.makeHandled(resolve => {
      setTimeout(() => {
        const o = {
          num: 123,
          str: 'my string',
          hello(name, punct = '') {
            return `Hello, ${name}${punct}`;
          },
        };

        const resolvedRelay = {
          GET(p, key) {
            return o[key];
          },
          PUT(p, key, value) {
            return (o[key] = value);
          },
          DELETE(p, key) {
            return delete o[key];
          },
          POST(p, key, args) {
            return o[key](...args);
          },
        };
        resolve({}, resolvedRelay);
      }, 200);
    });

    t.equal(await remoteP.post('hello', ['World', '!']), 'Hello, World!');
    t.equal(await remoteP.get('str'), 'my string');
    t.equal(await remoteP.get('num'), 123);
    t.equal(await remoteP.put('num', 789), 789);
    t.equal(await remoteP.get('num'), 789);
    t.equal(await remoteP.delete('str'), true);
    t.equal(await remoteP.get('str'), undefined);
    t.equal(await remoteP.delete('str'), true);
    t.equal(await remoteP.get('str'), undefined);
    t.equal(await remoteP.invoke('hello', 'World'), 'Hello, World');
  } catch (e) {
    t.assert(false, `Unexpected exception ${e}`);
  } finally {
    t.end();
  }
});

test('EPromise.all', async t => {
  let EPromise;
  function* generator() {
    yield 9;
    yield EPromise.resolve(8).then(res => res * 10);
    yield Promise.resolve(7).then(res => -res);
  }

  try {
    EPromise = maybeExtendPromise(Promise);

    t.deepEqual(await EPromise.all([1, Promise.resolve(2), 3]), [1, 2, 3]);
    t.deepEqual(await EPromise.all(generator()), [9, 80, -7]);

    // Ensure that a rejected promise rejects all.
    const toThrow = RangeError('expected');
    try {
      t.assert((await EPromise.all([1, Promise.reject(toThrow), 3])) && false);
    } catch (e) {
      t.equal(e, toThrow);
    }
  } catch (e) {
    t.assert(false, `Unexpected exception ${e}`);
  } finally {
    t.end();
  }
});

test.skip('EPromise.allSettled', async t => {
  let EPromise;
  let shouldThrow;
  function* generator() {
    yield 9;
    shouldThrow = Error('expected');
    yield EPromise.reject(shouldThrow).catch(_ => 80);
    yield Promise.resolve(7).then(res => -res);
  }

  try {
    EPromise = maybeExtendPromise(Promise);

    t.deepEqual(await EPromise.allSettled([1, Promise.resolve(2), 3]), [
      { status: 'fulfilled', value: 1 },
      { status: 'fulfilled', value: 2 },
      { status: 'fulfilled', value: 3 },
    ]);

    t.deepEqual(await EPromise.allSettled(generator()), [
      { status: 'fulfilled', value: 9 },
      { status: 'fulfilled', value: 80 },
      { status: 'fulfilled', value: -7 },
    ]);

    // Ensure that a rejected promise still settles.
    shouldThrow = Error('expected');
    t.deepEqual(
      await EPromise.allSettled([1, Promise.reject(shouldThrow), 3]),
      [
        { status: 'fulfilled', value: 1 },
        { status: 'rejected', reason: shouldThrow },
        { status: 'fulfilled', value: 3 },
      ],
    );
  } catch (e) {
    t.assert(false, `Unexpected exception ${e}`);
  } finally {
    t.end();
  }
});

test('EPromise.race', async t => {
  let EPromise;
  let shouldThrow;
  const delay = (value, millis, ...args) =>
    new EPromise(resolve => setTimeout(() => resolve(value), millis), ...args);

  function* generator() {
    yield delay(9, 500);
    shouldThrow = Error('expected');
    yield EPromise.reject(shouldThrow);
    yield delay(7, 1000);
  }

  try {
    EPromise = maybeExtendPromise(Promise);

    try {
      t.equal(await EPromise.race([1, delay(2, 1000), delay(3, 500)]), 1);
    } catch (e) {
      t.assert(false, `unexpected exception ${e}`);
    }

    try {
      t.assert((await EPromise.race(generator())) && false);
    } catch (e) {
      t.equal(e, shouldThrow);
    }
  } catch (e) {
    t.assert(false, `Unexpected exception ${e}`);
  } finally {
    t.end();
  }
});

test('get', async t => {
  try {
    const EPromise = maybeExtendPromise(Promise);
    const res = await EPromise.resolve([123, 456, 789]).get(1);
    t.equal(res, 456);
  } catch (e) {
    t.assert(false, `Unexpected exception ${e}`);
  } finally {
    t.end();
  }
});

test('put', async t => {
  try {
    const EPromise = maybeExtendPromise(Promise);
    const a = [123, 456, 789];
    const ep = EPromise.resolve(a);
    t.equal(await ep.put(1, 999), 999);
    t.deepEqual(a, [123, 999, 789]);
  } catch (e) {
    t.assert(false, `Unexpected exception ${e}`);
  } finally {
    t.end();
  }
});

test('post', async t => {
  try {
    const EPromise = maybeExtendPromise(Promise);
    const fn = () => 'hello';
    fn.a = n => n + 1;
    fn[2] = (n1, n2) => n1 * n2;
    const ep = EPromise.resolve(fn);
    t.equal(await ep.post('a', [3]), 4);
    t.equal(await ep.post(2, [3, 4]), 12);
    t.equal(await ep.get(2).post(undefined, [3, 4]), 12);
    t.equal(await ep.post(undefined, []), 'hello');
  } catch (e) {
    t.assert(false, `Unexpected exception ${e}`);
  } finally {
    t.end();
  }
});

test('invoke', async t => {
  try {
    const EPromise = maybeExtendPromise(Promise);
    const fn = () => 'hello';
    fn.a = n => n + 1;
    fn[2] = (n1, n2) => n1 * n2;
    const ep = EPromise.resolve(fn);
    t.equal(await ep.invoke('a', 3), 4);
    t.equal(await ep.invoke(2, 3, 4), 12);
    t.equal(await ep.invoke(undefined), 'hello');
  } catch (e) {
    t.assert(false, `Unexpected exception ${e}`);
  } finally {
    t.end();
  }
});

test('fcall', async t => {
  try {
    const EPromise = maybeExtendPromise(Promise);
    const ep = EPromise.resolve((a, b) => a * b);
    t.equal(await ep.fcall(3, 6), 18);
  } catch (e) {
    t.assert(false, `Unexpected exception ${e}`);
  } finally {
    t.end();
  }
});

test('fapply', async t => {
  try {
    const EPromise = maybeExtendPromise(Promise);
    const ep = EPromise.resolve((a, b) => a * b);
    t.equal(await ep.fapply([3, 6]), 18);
  } catch (e) {
    t.assert(false, `Unexpected exception ${e}`);
  } finally {
    t.end();
  }
});
