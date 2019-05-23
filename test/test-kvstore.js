import { test } from 'tape-promise/tape';
import makeKVStore from '../src/kernel/kvstore';

// kvstore has set, get, has, delete methods
// set (key []byte, value []byte)
// get (key []byte)  => value []byte
// has (key []byte) => exists bool
// delete (key []byte)
// iterator, reverseIterator

test('kvstore set, get, has, delete, iterator', t => {
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

  const iterator = kvstore.iterator();
  const { value: first } = iterator.next();
  t.deepEqual(first, { key: 'key1', value: val1 });

  const { value: third } = iterator.next();
  t.deepEqual(third, { key: 'key3', value: val3 });

  // test order
  const kvstore2 = makeKVStore({});
  kvstore2.set('key3', val3);
  kvstore2.set('key2', val2);
  kvstore2.set('key1', val1);

  const iterator2 = kvstore2.iterator();
  const { value: first2 } = iterator2.next();
  t.deepEqual(first2, { key: 'key1', value: val1 });

  const { value: second2 } = iterator2.next();
  t.deepEqual(second2, { key: 'key2', value: val2 });

  const { value: third2 } = iterator2.next();
  t.deepEqual(third2, { key: 'key3', value: val3 });

  t.end();
});
