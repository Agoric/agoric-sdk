// @ts-check
import test from 'ava';

import { keyMirror } from '../src/keyMirror.js';

// Test successful mirroring with null values
test('keyMirror with null values', t => {
  const result = keyMirror({ foo: null, bar: null, baz: null });
  t.deepEqual(result, { foo: 'foo', bar: 'bar', baz: 'baz' });
  t.true(Object.isFrozen(result));
});

// Test successful mirroring with matching key strings
test('keyMirror with matching key strings', t => {
  const result = keyMirror({ foo: 'foo', bar: 'bar', baz: 'baz' });
  t.deepEqual(result, { foo: 'foo', bar: 'bar', baz: 'baz' });
  t.true(Object.isFrozen(result));
});

// Test successful mirroring with mixed null and matching key strings
test('keyMirror with mixed null and matching strings', t => {
  const result = keyMirror({ foo: null, bar: 'bar', baz: null });
  t.deepEqual(result, { foo: 'foo', bar: 'bar', baz: 'baz' });
  t.true(Object.isFrozen(result));
});

// Test with empty object
test('keyMirror with empty object', t => {
  const result = keyMirror({});
  t.deepEqual(result, {});
  t.true(Object.isFrozen(result));
});

// Test with single key
test('keyMirror with single key', t => {
  const result = keyMirror({ single: null });
  t.deepEqual(result, { single: 'single' });
  t.true(Object.isFrozen(result));
});

// Test error handling for null input
test('keyMirror throws on null input', t => {
  const error = t.throws(
    () => {
      // @ts-expect-error testing invalid input
      keyMirror(null);
    },
    { instanceOf: TypeError },
  );
  // @ts-expect-error error is guaranteed to be defined
  t.is(error.message, 'keyMirror expects a record of string keys.');
});

// Test error handling for undefined input
test('keyMirror throws on undefined input', t => {
  const error = t.throws(
    () => {
      // @ts-expect-error testing invalid input
      keyMirror(undefined);
    },
    { instanceOf: TypeError },
  );
  // @ts-expect-error error is guaranteed to be defined
  t.is(error.message, 'keyMirror expects a record of string keys.');
});

// Test error handling for non-object primitives
test('keyMirror throws on string input', t => {
  const error = t.throws(
    () => {
      // @ts-expect-error testing invalid input
      keyMirror('not an object');
    },
    { instanceOf: TypeError },
  );
  // @ts-expect-error error is guaranteed to be defined
  t.is(error.message, 'keyMirror expects a record of string keys.');
});

test('keyMirror throws on number input', t => {
  const error = t.throws(
    () => {
      // @ts-expect-error testing invalid input
      keyMirror(42);
    },
    { instanceOf: TypeError },
  );
  // @ts-expect-error error is guaranteed to be defined
  t.is(error.message, 'keyMirror expects a record of string keys.');
});

test('keyMirror throws on boolean input', t => {
  const error = t.throws(
    () => {
      // @ts-expect-error testing invalid input
      keyMirror(true);
    },
    { instanceOf: TypeError },
  );
  // @ts-expect-error error is guaranteed to be defined
  t.is(error.message, 'keyMirror expects a record of string keys.');
});

// Test error handling for mismatched key-value pairs
test('keyMirror throws on mismatched string value', t => {
  const error = t.throws(
    () => {
      // @ts-expect-error testing invalid input
      keyMirror({ foo: 'bar' });
    },
    { instanceOf: TypeError },
  );
  // @ts-expect-error error is guaranteed to be defined
  t.is(error.message, 'Value for key "foo" must be null or the key string; got bar.');
});

test('keyMirror throws on wrong string in mixed object', t => {
  const error = t.throws(
    () => {
      // @ts-expect-error testing invalid input
      keyMirror({ foo: 'foo', bar: 'wrong', baz: null });
    },
    { instanceOf: TypeError },
  );
  // @ts-expect-error error is guaranteed to be defined
  t.is(error.message, 'Value for key "bar" must be null or the key string; got wrong.');
});

test('keyMirror throws on numeric value', t => {
  const error = t.throws(
    () => {
      // @ts-expect-error testing invalid input
      keyMirror({ foo: 123 });
    },
    { instanceOf: TypeError },
  );
  // @ts-expect-error error is guaranteed to be defined
  t.regex(error.message, /Value for key "foo" must be null or the key string/);
});

test('keyMirror throws on object value', t => {
  const error = t.throws(
    () => {
      // @ts-expect-error testing invalid input
      keyMirror({ foo: {} });
    },
    { instanceOf: TypeError },
  );
  // @ts-expect-error error is guaranteed to be defined
  t.regex(error.message, /Value for key "foo" must be null or the key string/);
});

test('keyMirror throws on array value', t => {
  const error = t.throws(
    () => {
      // @ts-expect-error testing invalid input
      keyMirror({ foo: [] });
    },
    { instanceOf: TypeError },
  );
  // @ts-expect-error error is guaranteed to be defined
  t.regex(error.message, /Value for key "foo" must be null or the key string/);
});

test('keyMirror throws on boolean value', t => {
  const error = t.throws(
    () => {
      // @ts-expect-error testing invalid input
      keyMirror({ foo: false });
    },
    { instanceOf: TypeError },
  );
  // @ts-expect-error error is guaranteed to be defined
  t.regex(error.message, /Value for key "foo" must be null or the key string/);
});

test('keyMirror throws on undefined value', t => {
  const error = t.throws(
    () => {
      // @ts-expect-error testing invalid input
      keyMirror({ foo: undefined });
    },
    { instanceOf: TypeError },
  );
  // @ts-expect-error error is guaranteed to be defined
  t.regex(error.message, /Value for key "foo" must be null or the key string/);
});

// Test that the function itself is frozen
test('keyMirror function is frozen', t => {
  t.true(Object.isFrozen(keyMirror));
});

// Test with various key names
test('keyMirror with special characters in keys', t => {
  const result = keyMirror({ 'foo-bar': null, 'baz_qux': null, 'hello.world': null });
  t.deepEqual(result, { 'foo-bar': 'foo-bar', 'baz_qux': 'baz_qux', 'hello.world': 'hello.world' });
  t.true(Object.isFrozen(result));
});

// Test with numeric string keys
test('keyMirror with numeric string keys', t => {
  const result = keyMirror({ '123': null, '456': null });
  t.deepEqual(result, { '123': '123', '456': '456' });
  t.true(Object.isFrozen(result));
});
