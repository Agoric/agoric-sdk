import test from 'tape';
import makeEPromiseClass from '../src/index';

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

test('EPromise.all', async t => {
  try {
    const EPromise = makeEPromiseClass(Promise);

    t.deepEqual(await EPromise.all([1, Promise.resolve(2), 3]), [1, 2, 3]);

    function* generator() {
      yield 9;
      yield EPromise.resolve(8).then(res => res * 10);
      yield Promise.resolve(7).then(res => -res);
    }
    t.deepEqual(await EPromise.all(generator()), [9, 80, -7]);

    // Ensure that a rejected promise rejects all.
    const toThrow = RangeError('expected');
    try {
      t.assert(await EPromise.all([1, Promise.reject(toThrow), 3]) && false);
    } catch (e) {
      t.is(e, toThrow);
    }
  } finally {
    t.end();
  }
});

test('EPromise.allSettled', async t => {
  try {
    const EPromise = makeEPromiseClass(Promise);

    t.deepEqual(await EPromise.allSettled([1, Promise.resolve(2), 3]), [
      {status: 'fulfilled', value: 1},
      {status: 'fulfilled', value: 2},
      {status: 'fulfilled', value: 3},
    ]);

    let shouldThrow;
    function* generator() {
      yield 9;
      shouldThrow = Error('expected');
      yield EPromise.reject(shouldThrow).catch(e => 80);
      yield Promise.resolve(7).then(res => -res);
    }
    try {
      t.deepEqual(await EPromise.allSettled(generator()), [
        {status: 'fulfilled', value: 9},
        {status: 'fulfilled', value: 80},
        {status: 'fulfilled', value: -7},
      ]);
    } catch (e) {
      t.assert(false, `unexpected throw ${e}`);
    }

    // Ensure that a rejected promise still settles.
    shouldThrow = Error('expected');
    try {
      t.deepEqual(await EPromise.allSettled([1, Promise.reject(shouldThrow), 3]), [
        {status: 'fulfilled', value: 1},
        {status: 'rejected', reason: shouldThrow},
        {status: 'fulfilled', value: 3},
      ]);
    } catch (e) {
      t.assert(false, `unexpected throw ${e}`);
    }
  } finally {
    t.end();
  }
});

test('EPromise.race', async t => {
  try {
    const EPromise = makeEPromiseClass(Promise);
    function delay(value, millis) {
      return new EPromise(resolve => setTimeout(() => resolve(value), millis));
    }

    try {
      t.equal(await EPromise.race([1, delay(2, 1000), delay(3, 500)]), 1);
    } catch (e) {
      t.assert(false, `unexpected exception ${e}`);
    }

    let shouldThrow;
    function* generator() {
      yield delay(9, 500);
      shouldThrow = Error('expected');
      yield EPromise.reject(shouldThrow);
      yield delay(7, 1000);
    }
    try {
      t.assert(await EPromise.race(generator()) && false);
    } catch (e) {
      t.equal(e, shouldThrow);
    }
  } finally {
    t.end();
  }
});

test('get', async t => {
  try {
    const EPromise = makeEPromiseClass(Promise);
    const res = await EPromise.resolve([123, 456, 789]).get(1);
    t.equal(res, 456);
  } finally {
    t.end();
  }
});

test('put', async t => {
  try {
    const EPromise = makeEPromiseClass(Promise);
    const a = [123, 456, 789];
    const ep = EPromise.resolve(a);
    t.equal(await ep.put(1, 999), 999);
    t.deepEqual(a, [123, 999, 789]);
  } finally {
    t.end();
  }
});

test('post', async t => {
  try {
    const EPromise = makeEPromiseClass(Promise);
    const fn = () => 'hello';
    fn.a = n => n + 1;
    fn[2] = (n1, n2) => n1 * n2;
    const ep = EPromise.resolve(fn);
    t.equal(await ep.post('a', [3]), 4);
    t.equal(await ep.post(2, [3, 4]), 12);
    t.equal(await ep.post(undefined, []), 'hello');
  } finally {
    t.end();
  }
});

test('invoke', async t => {
  try {
    const EPromise = makeEPromiseClass(Promise);
    const fn = () => 'hello';
    fn.a = n => n + 1;
    fn[2] = (n1, n2) => n1 * n2;
    const ep = EPromise.resolve(fn);
    t.equal(await ep.invoke('a', 3), 4);
    t.equal(await ep.invoke(2, 3, 4), 12);
    t.equal(await ep.invoke(undefined), 'hello');
  } finally {
    t.end();
  }
});

test('fcall', async t => {
  try {
    const EPromise = makeEPromiseClass(Promise);
    const ep = EPromise.resolve((a, b) => a * b);
    t.equal(await ep.fcall(3, 6), 18);
  } finally {
    t.end();
  }
});

test('fapply', async t => {
  try {
    const EPromise = makeEPromiseClass(Promise);
    const ep = EPromise.resolve((a, b) => a * b);
    t.equal(await ep.fapply([3, 6]), 18);
  } finally {
    t.end();
  }
});
