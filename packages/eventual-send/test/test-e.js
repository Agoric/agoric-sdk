import '@agoric/install-ses';
import test from 'ava';
import { E, HandledPromise } from '../src/index';

test('E reexports', async t => {
  try {
   t.is(E.resolve, HandledPromise.resolve, 'E reexports resolve');
  } catch (e) {
   t.not(e, e, 'unexpected exception');
  } finally {
   return; // t.end();
  }
});

test('E.when', async t => {
  try {
    let stash;
    await E.when(123, val => (stash = val));
   t.is(stash, 123, `onfulfilled handler fires`);
    let raised;
    // eslint-disable-next-line prefer-promise-reject-errors
    await E.when(Promise.reject('foo'), undefined, val => (raised = val));
    t.assert(raised, 'foo', 'onrejected handler fires');

    let ret;
    let exc;
    await E.when(
      Promise.resolve('foo'),
      val => (ret = val),
      val => (exc = val),
    );
   t.is(ret, 'foo', 'onfulfilled option fires');
   t.is(exc, undefined, 'onrejected option does not fire');

    let ret2;
    let exc2;
    await E.when(
      // eslint-disable-next-line prefer-promise-reject-errors
      Promise.reject('foo'),
      val => (ret2 = val),
      val => (exc2 = val),
    );
   t.is(ret2, undefined, 'onfulfilled option does not fire');
   t.is(exc2, 'foo', 'onrejected option fires');
  } catch (e) {
   t.not(e, e, 'unexpected exception');
  } finally {
   return; // t.end();
  }
});

test('E method calls', async t => {
  try {
    const x = {
      double(n) {
        return 2 * n;
      },
    };
    const d = E(x).double(6);
   t.is(typeof d.then, 'function', 'return is a thenable');
   t.is(await d, 12, 'method call works');
  } catch (e) {
   t.not(e, e, 'unexpected exception');
  } finally {
   return; // t.end();
  }
});

test('E shortcuts', async t => {
  try {
    const x = {
      name: 'buddy',
      val: 123,
      y: Object.freeze({
        val2: 456,
        name2: 'holly',
        fn: n => 2 * n,
      }),
      hello(greeting) {
        return `${greeting}, ${this.name}!`;
      },
    };
   t.is(await E(x).hello('Hello'), 'Hello, buddy!', 'method call works');
   t.is(
      await E(await E.G(await E.G(x).y).fn)(4),
      8,
      'anonymous method works',
    );
   t.is(await E.G(x).val, 123, 'property get');
  } catch (e) {
   t.not(e, e, 'unexpected exception');
  } finally {
   return; // t.end();
  }
});
