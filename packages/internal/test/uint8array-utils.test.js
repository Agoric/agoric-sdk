import test from 'ava';
import {
  concatUint8Arrays,
  fromString,
  toString,
  fromHex,
  toHex,
  isUint8Array,
  fromData,
} from '../src/uint8array-utils.js';

test('concatUint8Arrays - empty', t => {
  const result = concatUint8Arrays([]);
  t.deepEqual(result, new Uint8Array(0));
});

test('concatUint8Arrays - single array', t => {
  const arr = new Uint8Array([1, 2, 3]);
  const result = concatUint8Arrays([arr]);
  t.is(result, arr); // Should return same reference
});

test('concatUint8Arrays - multiple arrays', t => {
  const arr1 = new Uint8Array([1, 2]);
  const arr2 = new Uint8Array([3, 4]);
  const arr3 = new Uint8Array([5]);
  const result = concatUint8Arrays([arr1, arr2, arr3]);
  t.deepEqual(result, new Uint8Array([1, 2, 3, 4, 5]));
});

test('concatUint8Arrays - with total length', t => {
  const arr1 = new Uint8Array([1, 2]);
  const arr2 = new Uint8Array([3, 4]);
  const result = concatUint8Arrays([arr1, arr2], 4);
  t.deepEqual(result, new Uint8Array([1, 2, 3, 4]));
});

test('string encoding/decoding', t => {
  const str = 'Hello, world!';
  const encoded = fromString(str);
  const decoded = toString(encoded);
  t.is(decoded, str);
  t.true(encoded instanceof Uint8Array);
});

test('string encoding - unicode', t => {
  const str = 'ümlaut 👨‍👨‍👧‍👧';
  const encoded = fromString(str);
  const decoded = toString(encoded);
  t.is(decoded, str);
});

test('hex encoding/decoding', t => {
  const hex = '48656c6c6f';
  const decoded = fromHex(hex);
  const encoded = toHex(decoded);
  t.is(encoded, hex);
  t.deepEqual(decoded, fromString('Hello'));
});

test('hex encoding - invalid', t => {
  t.throws(() => fromHex('invalid'), { message: /Invalid hex string/ });
  t.throws(() => fromHex('1'), { message: /Invalid hex string/ });
});

test('isUint8Array', t => {
  t.true(isUint8Array(new Uint8Array(5)));
  t.false(isUint8Array([]));
  t.false(isUint8Array(null));
  t.false(isUint8Array('string'));
  t.false(isUint8Array({}));
});

test('fromData - string', t => {
  const result = fromData('hello');
  t.deepEqual(result, fromString('hello'));
});

test('fromData - Uint8Array', t => {
  const arr = new Uint8Array([1, 2, 3]);
  const result = fromData(arr);
  t.is(result, arr); // Should return same reference
});

test('fromData - array-like', t => {
  const result = fromData([1, 2, 3]);
  t.deepEqual(result, new Uint8Array([1, 2, 3]));
});