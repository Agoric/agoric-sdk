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
  kvstore.set('kernel.key1', val1);
  kvstore.set('kernel.key2', val2);
  kvstore.set('kernel.key3', val3);

  const actualVal2 = kvstore.get('kernel.key2');
  t.deepEqual(actualVal2, val2);

  kvstore.delete('kernel.key2');
  const actualDeletedVal2 = kvstore.get('kernel.key2');
  t.equal(actualDeletedVal2, undefined);

  const values = kvstore.values('kernel');
  t.deepEqual(values[0], val1);
  t.deepEqual(values[1], val3);

  const keys = kvstore.keys('kernel');
  t.equal(keys[0], 'key1');
  t.equal(keys[1], 'key3');

  const entries = kvstore.entries('kernel');
  t.deepEqual(entries[0], { key: 'key1', value: val1 });
  t.deepEqual(entries[1], { key: 'key3', value: val3 });

  // test order
  const kvstore2 = makeKVStore({});
  kvstore2.set('kernel.key3', val3);
  kvstore2.set('kernel.key2', val2);
  kvstore2.set('kernel.key1', val1);

  const entries2 = kvstore2.entries('kernel');
  t.deepEqual(entries2[0], { key: 'key1', value: val1 });
  t.deepEqual(entries2[1], { key: 'key2', value: val2 });
  t.deepEqual(entries2[2], { key: 'key3', value: val3 });

  t.end();
});
