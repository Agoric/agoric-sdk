import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { makeScalarMapStore } from '@agoric/store';
import { asMultiset, insertIntoSortedArray } from '../../src/utils/store.ts';

test('add and get', t => {
  const mapStore = makeScalarMapStore();
  const multiset = asMultiset(mapStore);

  // Add items
  multiset.add('apple');
  multiset.add('banana', 3);

  // Check counts
  t.is(mapStore.get('apple'), 1);
  t.is(mapStore.get('banana'), 3);
});

test('has', t => {
  const mapStore = makeScalarMapStore();
  const multiset = asMultiset(mapStore);

  multiset.add('apple');

  t.true(multiset.has('apple'));
  t.false(multiset.has('banana'));
});

test('keys and entries', t => {
  const mapStore = makeScalarMapStore();
  const multiset = asMultiset(mapStore);

  multiset.add('apple', 2);
  multiset.add('banana', 3);

  // Test keys
  const keys = [...multiset.keys()];
  t.deepEqual(keys.sort(), ['apple', 'banana']);

  // Test entries
  const entries = [...multiset.entries()];
  t.deepEqual(
    entries.sort((a, b) => a[0].localeCompare(b[0])),
    [
      ['apple', 2],
      ['banana', 3],
    ],
  );
});

test('clear', t => {
  const mapStore = makeScalarMapStore();
  const multiset = asMultiset(mapStore);

  multiset.add('apple');
  multiset.add('banana');

  multiset.clear();

  t.false(multiset.has('apple'));
  t.false(multiset.has('banana'));
  t.is([...mapStore.keys()].length, 0);
});

test('add with invalid count', t => {
  const mapStore = makeScalarMapStore();
  const multiset = asMultiset(mapStore);

  // Should throw when adding with count <= 0
  t.throws(() => multiset.add('apple', 0), {
    message: /Cannot add a non-positive integer count/,
  });
  t.throws(() => multiset.add('apple', -1), {
    message: /Cannot add a non-positive integer count/,
  });
  t.throws(() => multiset.add('apple', 1.1), {
    message: /Cannot add a non-positive integer count/,
  });
  t.throws(() => multiset.add('apple', NaN), {
    message: /Cannot add a non-positive integer count/,
  });
});

test('add to existing item', t => {
  const mapStore = makeScalarMapStore();
  const multiset = asMultiset(mapStore);

  multiset.add('apple', 2);
  multiset.add('apple', 3);

  // Should accumulate counts
  t.is(mapStore.get('apple'), 5);
});

test('remove', t => {
  const mapStore = makeScalarMapStore();
  const multiset = asMultiset(mapStore);

  multiset.add('apple', 2);
  multiset.add('apple', 3);

  multiset.remove('apple', 4);
  t.is(multiset.count('apple'), 1);
  t.is(multiset.remove('apple'), true);
  t.is(multiset.count('apple'), 0);

  // not successful
  t.is(multiset.remove('apple'), false);
});

test('remove with invalid count', t => {
  const mapStore = makeScalarMapStore();
  const multiset = asMultiset(mapStore);

  multiset.add('apple');

  // Should throw when adding with count <= 0
  t.throws(() => multiset.remove('apple', 0), {
    message: /Cannot remove a non-positive integer count/,
  });
  t.throws(() => multiset.remove('apple', -1), {
    message: /Cannot remove a non-positive integer count/,
  });
  t.throws(() => multiset.remove('apple', 0.5), {
    message: /Cannot remove a non-positive integer count/,
  });
  t.throws(() => multiset.remove('apple', NaN), {
    message: /Cannot remove a non-positive integer count/,
  });
});

test('remove with excessive count should return false', t => {
  const mapStore = makeScalarMapStore();
  const multiset = asMultiset(mapStore);

  multiset.add('apple', 3);
  t.is(multiset.count('apple'), 3);

  t.false(multiset.remove('apple', 5));

  t.is(multiset.count('apple'), 3, 'original count remains unchanged');

  // removing exactly as many as exist (should not throw)
  t.notThrows(() => multiset.remove('apple', 3));
  t.is(multiset.count('apple'), 0);
  t.false(multiset.has('apple'));
});

test('insertIntoSortedArray creates sorted array (default desc)', t => {
  const numbers = [3];
  const sortDesc = (a, b) => b - a;

  // Insert out of order; should remain descending
  insertIntoSortedArray(numbers, 5, sortDesc); // [5, 3]
  insertIntoSortedArray(numbers, 2, sortDesc); // [5, 3, 2]
  insertIntoSortedArray(numbers, 3, sortDesc); // [5, 3, 3, 2]

  t.deepEqual(numbers, [5, 3, 3, 2]);
});

test('insertIntoSortedArray with custom ascending comparator', t => {
  const letters = [];
  const asc = (a, b) => a.localeCompare(b);

  // Insert letters deliberately out of order
  insertIntoSortedArray(letters, 'c', asc);
  insertIntoSortedArray(letters, 'a', asc);
  insertIntoSortedArray(letters, 'b', asc);

  t.deepEqual(letters, ['a', 'b', 'c']);
});

test('insertIntoSortedArray keeps duplicates stable-after equals', t => {
  const txs = [];
  const byValueDesc = (a, b) => b.val - a.val;

  // Distinct objects that compare equal when val is the same
  const tx1 = { val: 5, id: '0x10005' };
  const tx2 = { val: 4, id: '0x20004' };
  const tx3 = { val: 2, id: '0x30002' };
  const tx4 = { val: 4, id: '0x40004' };

  // insert first 3
  for (const obj of [tx1, tx2, tx3]) {
    insertIntoSortedArray(txs, obj, byValueDesc);
  }

  // Insert another 4 → should appear *after* existing equal object
  insertIntoSortedArray(txs, tx4, byValueDesc);

  t.deepEqual(txs, [tx1, tx2, tx4, tx3]);
});
