import { test } from 'tape-promise/tape';
import makeKVStore from '../src/kernel/kvstore';

// kvstore has set, get, has, delete methods
// set (key []byte, value []byte)
// get (key []byte)  => value []byte
// has (key []byte) => exists bool
// delete (key []byte)
// iterator, reverseIterator

test('kvstore set, get, has, delete, keys, values, entries', t => {
  const kvstore = makeKVStore({});
  const val1 = {
    one: 'one',
  };
  const val2 = {
    two: 'two',
  };
  const val3 = {
    three: 'three',
  };
  kvstore.set('key1', val1);
  kvstore.set('key2', val2);
  kvstore.set('key3', val3);

  const actualVal2 = kvstore.get('key2');
  t.deepEqual(actualVal2, val2);

  kvstore.delete('key2');
  const actualDeletedVal2 = kvstore.get('key2');
  t.equal(actualDeletedVal2, undefined);

  const values = kvstore.values();
  t.deepEqual(values[0], val1);
  t.deepEqual(values[1], val3);

  const keys = kvstore.keys();
  t.equal(keys[0], 'key1');
  t.equal(keys[1], 'key3');

  const entries = kvstore.entries();
  t.deepEqual(entries[0], { key: 'key1', value: val1 });
  t.deepEqual(entries[1], { key: 'key3', value: val3 });

  // test order
  const kvstore2 = makeKVStore({});
  kvstore2.set('key3', val3);
  kvstore2.set('key2', val2);
  kvstore2.set('key1', val1);

  const entries2 = kvstore2.entries();
  t.deepEqual(entries2[0], { key: 'key1', value: val1 });
  t.deepEqual(entries2[1], { key: 'key2', value: val2 });
  t.deepEqual(entries2[2], { key: 'key3', value: val3 });

  t.end();
});
