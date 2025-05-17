// @ts-nocheck
import test from 'ava';

import { Far } from '@endo/marshal';
import { M } from '@agoric/store';
import { makeCopyMap, makeCopySet } from '@endo/patterns';
import { makeFakeCollectionManager } from '../tools/fakeVirtualSupport.js';

const {
  makeScalarBigMapStore,
  makeScalarBigWeakMapStore,
  makeScalarBigSetStore,
  makeScalarBigWeakSetStore,
} = makeFakeCollectionManager();

function makeGenericRemotable(typeName) {
  return Far(typeName, {
    aMethod() {
      return 'whatever';
    },
  });
}

const something = makeGenericRemotable('something');
const somethingElse = makeGenericRemotable('something else');
const somethingMissing = makeGenericRemotable('something missing');

const symbolBozo = Symbol.for('bozo');
const symbolKrusty = Symbol.for('krusty');

// prettier-ignore
const primes = [
   2,  3,  5,  7, 11,
  13, 17, 19, 23, 29,
  31, 37, 41, 43, 47,
  53, 59, 61, 67, 71,
  73, 79, 83, 89, 97,
];

const stuff = [
  [47, 'number 47'],
  [-29, 'number -29'],
  [3, 'number 3'],
  [1000n, 'bigint 1000'],
  [-77n, 'bigint -77'],
  ['hello', 'string hello'],
  ['@#$@#$@#$@', 'string stuff'],
  [null, 'singleton null'],
  [undefined, 'singleton undefined'],
  [false, 'boolean false'],
  [true, 'boolean true'],
  [something, 'remotable object "something"'],
  [somethingElse, 'remotable object "something else"'],
  [symbolBozo, 'symbol bozo'],
  [symbolKrusty, 'symbol krusty'],
];

function m(s) {
  return { message: s };
}

function fillBasicMapStore(store) {
  for (const item of stuff) {
    store.init(item[0], item[1]);
  }
}

function fillBasicSetStore(store) {
  for (const item of stuff) {
    store.add(item[0]);
  }
}

function exerciseMapOperations(t, collectionName, testStore) {
  fillBasicMapStore(testStore);
  for (const item of stuff) {
    t.is(testStore.get(item[0]), item[1]);
  }
  for (const item of stuff) {
    testStore.set(item[0], `${String(item[1])} updated`);
  }
  for (const item of stuff) {
    t.is(testStore.get(item[0]), `${String(item[1])} updated`);
  }

  t.truthy(testStore.has(47));
  t.falsy(testStore.has(53));
  t.falsy(testStore.has(somethingMissing));

  t.throws(
    () => testStore.get(43),
    m(`key 43 not found in collection "${collectionName}"`),
  );
  t.throws(
    () => testStore.get(somethingMissing),
    m(
      `key "[Alleged: something missing]" not found in collection "${collectionName}"`,
    ),
  );
  t.throws(
    () => testStore.set(86, 'not work'),
    m(`key 86 not found in collection "${collectionName}"`),
  );
  t.throws(
    () => testStore.set(somethingMissing, 'not work'),
    m(
      `key "[Alleged: something missing]" not found in collection "${collectionName}"`,
    ),
  );
  t.throws(
    () => testStore.init(47, 'already there'),
    m(`key 47 already registered in collection "${collectionName}"`),
  );
  t.throws(
    () => testStore.init(something, 'already there'),
    m(
      `key "[Alleged: something]" already registered in collection "${collectionName}"`,
    ),
  );

  testStore.set(something, somethingElse);
  testStore.set(somethingElse, something);
  t.is(testStore.get(something), somethingElse);
  t.is(testStore.get(somethingElse), something);

  testStore.delete(47);
  testStore.delete(something);
  t.falsy(testStore.has(47));
  t.falsy(testStore.has(something));
  t.throws(
    () => testStore.get(47),
    m(`key 47 not found in collection "${collectionName}"`),
  );
  t.throws(
    () => testStore.get(something),
    m(`key "[Alleged: something]" not found in collection "${collectionName}"`),
  );
  t.throws(
    () => testStore.delete(22),
    m(`key 22 not found in collection "${collectionName}"`),
  );
  t.throws(
    () => testStore.delete(somethingMissing),
    m(
      `key "[Alleged: something missing]" not found in collection "${collectionName}"`,
    ),
  );
  if (collectionName === 'map') {
    // strong map, so we can .clear
    testStore.clear();
    for (const [key, _value] of stuff) {
      t.false(testStore.has(key));
    }
    fillBasicMapStore(testStore);
  }
}

function exerciseSetOperations(t, collectionName, testStore) {
  fillBasicSetStore(testStore);
  for (const item of stuff) {
    t.truthy(testStore.has(item[0]));
  }
  t.falsy(testStore.has(53));
  t.falsy(testStore.has(somethingMissing));

  t.truthy(testStore.has(47));
  t.notThrows(() => testStore.add(47));

  testStore.delete(47);
  testStore.delete(something);
  t.falsy(testStore.has(47));
  t.falsy(testStore.has(something));
  t.throws(
    () => testStore.delete(22),
    m(`key 22 not found in collection "${collectionName}"`),
  );
  t.throws(
    () => testStore.delete(somethingMissing),
    m(
      `key "[Alleged: something missing]" not found in collection "${collectionName}"`,
    ),
  );
  if (collectionName === 'set') {
    // strong set, so we can .clear
    testStore.clear();
    for (const [key, _value] of stuff) {
      t.false(testStore.has(key));
    }
    fillBasicSetStore(testStore);
  }
}

test('basic map operations', t => {
  exerciseMapOperations(
    t,
    'map',
    makeScalarBigMapStore('map', { keyShape: M.any() }),
  );
});

test('basic weak map operations', t => {
  exerciseMapOperations(
    t,
    'weak map',
    makeScalarBigWeakMapStore('weak map', { keyShape: M.any() }),
  );
});

test('basic set operations', t => {
  exerciseSetOperations(
    t,
    'set',
    makeScalarBigSetStore('set', { keyShape: M.any() }),
  );
});

test('basic weak set operations', t => {
  exerciseSetOperations(
    t,
    'weak set',
    makeScalarBigWeakSetStore('weak set', { keyShape: M.any() }),
  );
});

function exerciseSetAddAll(t, weak, testStore) {
  const allThatStuff = stuff.map(entry => entry[0]);

  testStore.addAll(allThatStuff);
  for (const elem of allThatStuff) {
    t.truthy(testStore.has(elem));
    testStore.delete(elem);
  }
  if (!weak) {
    t.is(testStore.getSize(), 0);
  }

  testStore.addAll(makeCopySet(allThatStuff));
  for (const elem of allThatStuff) {
    t.truthy(testStore.has(elem));
    testStore.delete(elem);
  }
  if (!weak) {
    t.is(testStore.getSize(), 0);
  }

  t.throws(
    () => testStore.addAll({ bogus: 47 }),
    m(/provided data source is not iterable/),
  );
}

test('set addAll', t => {
  exerciseSetAddAll(t, false, makeScalarBigSetStore('test set'));
});

test('weak set addAll', t => {
  exerciseSetAddAll(t, true, makeScalarBigWeakSetStore('test weak set'));
});

test('set snapshot', t => {
  const testStore = makeScalarBigSetStore('test set');
  const allThatStuff = stuff.map(entry => entry[0]);
  testStore.addAll(allThatStuff);
  t.deepEqual(testStore.snapshot(), makeCopySet(allThatStuff));
});

function exerciseMapAddAll(t, weak, testStore) {
  testStore.addAll(stuff);
  for (const [k, v] of stuff) {
    t.truthy(testStore.has(k));
    t.is(testStore.get(k), v);
    testStore.delete(k);
  }
  if (!weak) {
    t.is(testStore.getSize(), 0);
  }

  testStore.addAll(makeCopyMap(stuff));
  for (const [k, v] of stuff) {
    t.truthy(testStore.has(k));
    t.is(testStore.get(k), v);
    testStore.delete(k);
  }
  if (!weak) {
    t.is(testStore.getSize(), 0);
  }

  t.throws(
    () => testStore.addAll({ bogus: 47 }),
    m(/provided data source is not iterable/),
  );
}

test('map addAll', t => {
  exerciseMapAddAll(t, false, makeScalarBigMapStore('test map'));
});

test('weak map addAll', t => {
  exerciseMapAddAll(t, true, makeScalarBigWeakMapStore('test weak map'));
});

test('map snapshot', t => {
  const testStore = makeScalarBigMapStore('test map');
  testStore.addAll(stuff);
  t.deepEqual(testStore.snapshot(), makeCopyMap(stuff));
});

test('constrain map key shape', t => {
  const stringsOnly = makeScalarBigMapStore('map key strings only', {
    keyShape: M.string(),
  });
  stringsOnly.init('skey', 'this should work');
  t.is(stringsOnly.get('skey'), 'this should work');
  t.throws(
    () => stringsOnly.init(29, 'this should not work'),
    m(
      'invalid key type for collection "map key strings only": number 29 - Must be a string',
    ),
  );

  const noStrings = makeScalarBigMapStore('map key no strings', {
    keyShape: M.not(M.string()),
  });
  noStrings.init(47, 'number ok');
  noStrings.init(true, 'boolean ok');
  t.throws(
    () => noStrings.init('foo', 'string not ok?'),
    m(
      'invalid key type for collection "map key no strings": "foo" - Must fail negated pattern: "[match:string]"',
    ),
  );
  t.is(noStrings.get(47), 'number ok');
  t.is(noStrings.get(true), 'boolean ok');
  t.falsy(noStrings.has('foo'));
  t.throws(
    () => noStrings.get('foo'),
    m(
      'invalid key type for collection "map key no strings": "foo" - Must fail negated pattern: "[match:string]"',
    ),
  );

  const only47 = makeScalarBigMapStore('map key only 47', { keyShape: 47 });
  only47.init(47, 'this number ok');
  t.throws(
    () => only47.init(29, 'this number not ok?'),
    m('invalid key type for collection "map key only 47": 29 - Must be: 47'),
  );
  t.is(only47.get(47), 'this number ok');
  t.falsy(only47.has(29));
  t.throws(
    () => only47.get(29),
    m('invalid key type for collection "map key only 47": 29 - Must be: 47'),
  );

  const lt47 = makeScalarBigMapStore('map key less than 47', {
    keyShape: M.lt(47),
  });
  lt47.init(29, 'this number ok');
  t.throws(
    () => lt47.init(53, 'this number not ok?'),
    m(
      'invalid key type for collection "map key less than 47": 53 - Must be < 47',
    ),
  );
  t.is(lt47.get(29), 'this number ok');
  t.falsy(lt47.has(53));
  t.throws(
    () => lt47.get(53),
    m(
      'invalid key type for collection "map key less than 47": 53 - Must be < 47',
    ),
  );
  lt47.init(11, 'lower value');
  lt47.init(46, 'higher value');
  t.deepEqual(Array.from(lt47.keys()), [11, 29, 46]);
  t.deepEqual(Array.from(lt47.keys(M.gt(20))), [29, 46]);
});

test('constrain map value shape', t => {
  const stringsOnly = makeScalarBigMapStore('map value strings only', {
    valueShape: M.string(),
  });
  stringsOnly.init('sval', 'string value');
  t.is(stringsOnly.get('sval'), 'string value');
  t.throws(
    () => stringsOnly.init('nval', 29),
    m(
      'invalid value type for collection "map value strings only": number 29 - Must be a string',
    ),
  );

  const noStrings = makeScalarBigMapStore('map value no strings', {
    valueShape: M.not(M.string()),
  });
  noStrings.init('nkey', 47);
  noStrings.init('bkey', true);
  t.throws(
    () => noStrings.init('skey', 'string not ok?'),
    m(
      'invalid value type for collection "map value no strings": "string not ok?" - Must fail negated pattern: "[match:string]"',
    ),
  );
  t.is(noStrings.get('nkey'), 47);
  t.is(noStrings.get('bkey'), true);
  t.falsy(noStrings.has('skey'));

  const only47 = makeScalarBigMapStore('map value only 47', {
    valueShape: 47,
  });
  only47.init('47key', 47);
  t.throws(
    () => only47.init('29key', 29),
    m(
      'invalid value type for collection "map value only 47": 29 - Must be: 47',
    ),
  );
  t.is(only47.get('47key'), 47);
  t.falsy(only47.has('29key'));

  const lt47 = makeScalarBigMapStore('map value less than 47', {
    valueShape: M.lt(47),
  });
  lt47.init('29key', 29);
  t.throws(
    () => lt47.init('53key', 53),
    m(
      'invalid value type for collection "map value less than 47": 53 - Must be < 47',
    ),
  );
  t.is(lt47.get('29key'), 29);
  t.falsy(lt47.has('53key'));
  lt47.init('11key', 11);
  lt47.init('46key', 46);
  t.deepEqual(Array.from(lt47.values()), [11, 29, 46]);
  t.deepEqual(Array.from(lt47.values(M.scalar(), M.gt(20))), [29, 46]);
  t.is(lt47.getSize(M.any(), M.gt(20)), 2);
});

test('constrain set key shape', t => {
  const stringsOnly = makeScalarBigSetStore('strings only set', {
    keyShape: M.string(),
  });
  t.falsy(stringsOnly.has('skey'));
  stringsOnly.add('skey');
  t.truthy(stringsOnly.has('skey'));
  t.throws(
    () => stringsOnly.add(29),
    m(
      'invalid key type for collection "strings only set": number 29 - Must be a string',
    ),
  );

  const noStrings = makeScalarBigSetStore('no strings set', {
    keyShape: M.not(M.string()),
  });
  noStrings.add(47);
  noStrings.add(true);
  t.throws(
    () => noStrings.add('foo?'),
    m(
      'invalid key type for collection "no strings set": "foo?" - Must fail negated pattern: "[match:string]"',
    ),
  );
  t.truthy(noStrings.has(47));
  t.truthy(noStrings.has(true));
  t.falsy(noStrings.has('foo'));

  const only47 = makeScalarBigSetStore('only 47 set', { keyShape: 47 });
  t.falsy(only47.has(47));
  only47.add(47);
  t.truthy(only47.has(47));
  t.falsy(only47.has(29));
  t.throws(
    () => only47.add(29),
    m('invalid key type for collection "only 47 set": 29 - Must be: 47'),
  );

  const lt47 = makeScalarBigSetStore('less than 47 set', {
    keyShape: M.lt(47),
  });
  lt47.add(29);
  t.throws(
    () => lt47.add(53),
    m('invalid key type for collection "less than 47 set": 53 - Must be < 47'),
  );
  t.truthy(lt47.has(29));
  t.falsy(lt47.has(53));
  lt47.add(11);
  lt47.add(46);
  t.deepEqual(Array.from(lt47.values()), [11, 29, 46]);
  t.deepEqual(Array.from(lt47.values(M.gt(20))), [29, 46]);
});

test('map clear', t => {
  const testStore = makeScalarBigMapStore('cmap', { keyShape: M.any() });
  testStore.init('a', 'ax');
  testStore.init('b', 'bx');
  testStore.init('c', 'cx');
  t.deepEqual(Array.from(testStore.keys()), ['a', 'b', 'c']);
  t.is(testStore.getSize(), 3);
  testStore.clear();
  t.deepEqual(Array.from(testStore.keys()), []);
  t.is(testStore.getSize(), 0);
});

test('map clear with pattern', t => {
  const testStore = makeScalarBigMapStore('cmap', { keyShape: M.any() });
  testStore.init('a', 'ax');
  testStore.init('b', 'bx');
  testStore.init('c', 'cx');
  console.log(`M is`, M);
  testStore.clear(M.eq('c'));
  t.true(testStore.has('a'));
  t.true(testStore.has('b'));
  t.false(testStore.has('c'));
  t.is(testStore.getSize(), 2);
});

test('set clear', t => {
  const testStore = makeScalarBigSetStore('cset', { keyShape: M.any() });
  testStore.add('a');
  testStore.add('b');
  testStore.add('c');
  t.deepEqual(Array.from(testStore.values()), ['a', 'b', 'c']);
  t.is(testStore.getSize(), 3);
  testStore.clear();
  t.deepEqual(Array.from(testStore.values()), []);
  t.is(testStore.getSize(), 0);
});

test('set clear with pattern', t => {
  const testStore = makeScalarBigSetStore('cset', { keyShape: M.any() });
  testStore.add('a');
  testStore.add('b');
  testStore.add('c');
  testStore.clear(M.eq('c'));
  t.true(testStore.has('a'));
  t.true(testStore.has('b'));
  t.false(testStore.has('c'));
  t.is(testStore.getSize(), 2);
});

test('map fail on concurrent modification', t => {
  const primeMap = makeScalarBigMapStore('fmap', {
    keyShape: M.number(),
  });
  for (const [i, v] of primes.entries()) {
    primeMap.init(v, `${v} is prime #${i + 1}`);
  }

  let iter = primeMap.keys()[Symbol.iterator]();
  t.deepEqual(iter.next(), { done: false, value: 2 });
  // insert behind iterator, still kills iterator
  primeMap.init(1, 'pretty clever, wiseguy');
  t.throws(
    () => iter.next(),
    m(`keys in store cannot be added to during iteration`),
  );

  iter = primeMap.keys()[Symbol.iterator]();
  t.deepEqual(iter.next(), { done: false, value: 1 });
  t.deepEqual(iter.next(), { done: false, value: 2 });
  t.deepEqual(iter.next(), { done: false, value: 3 });
  t.deepEqual(iter.next(), { done: false, value: 5 });
  // insert ahead of iterator, kills iterator
  primeMap.init(6, 'awfully smooth for a prime, buddy');
  t.throws(
    () => iter.next(),
    m(`keys in store cannot be added to during iteration`),
  );
});

test('set fail on concurrent modification', t => {
  const primeSet = makeScalarBigSetStore('fset', {
    keyShape: M.number(),
  });
  for (const v of primes) {
    primeSet.add(v);
  }

  let iter = primeSet.keys()[Symbol.iterator]();
  t.deepEqual(iter.next(), { done: false, value: 2 });
  // insert behind iterator, still kills iterator
  primeSet.add(1);
  t.throws(
    () => iter.next(),
    m(`keys in store cannot be added to during iteration`),
  );

  iter = primeSet.keys()[Symbol.iterator]();
  t.deepEqual(iter.next(), { done: false, value: 1 });
  t.deepEqual(iter.next(), { done: false, value: 2 });
  t.deepEqual(iter.next(), { done: false, value: 3 });
  t.deepEqual(iter.next(), { done: false, value: 5 });
  // insert ahead of iterator, kills iterator
  primeSet.add(6);
  t.throws(
    () => iter.next(),
    m(`keys in store cannot be added to during iteration`),
  );
});

test('map ok with concurrent deletion', t => {
  const primeMap = makeScalarBigMapStore('fmap', {
    keyShape: M.number(),
  });
  for (const [i, v] of primes.entries()) {
    primeMap.init(v, `${v} is prime #${i + 1}`);
  }
  const iter = primeMap.keys()[Symbol.iterator]();
  t.deepEqual(iter.next(), { done: false, value: 2 });
  primeMap.delete(3);
  // so we skip 3:
  // t.deepEqual(iter.next(), { done: false, value: 3 });
  t.deepEqual(iter.next(), { done: false, value: 5 });
  primeMap.delete(5);
  t.deepEqual(iter.next(), { done: false, value: 7 });
});

test('set ok with concurrent deletion', t => {
  const primeSet = makeScalarBigSetStore('fset', {
    keyShape: M.number(),
  });
  for (const v of primes) {
    primeSet.add(v);
  }

  const iter = primeSet.keys()[Symbol.iterator]();
  t.deepEqual(iter.next(), { done: false, value: 2 });
  primeSet.delete(3);
  // so we skip 3:
  // t.deepEqual(iter.next(), { done: false, value: 3 });
  t.deepEqual(iter.next(), { done: false, value: 5 });
  primeSet.delete(5);
  t.deepEqual(iter.next(), { done: false, value: 7 });
});

test('fail on oversized keys', t => {
  const bigString = `Elaine${'!'.repeat(220)}`;
  const ex = m('key too large');

  const map = makeScalarBigMapStore('meh', { keyShape: M.any() });
  t.throws(() => map.has(bigString), ex);
  t.throws(() => map.get(bigString), ex);
  t.throws(() => map.init(bigString, 'Ben!'), ex);
  t.throws(() => map.set(bigString, 'Ben!'), ex);
  t.throws(() => map.delete(bigString), ex);

  const set = makeScalarBigSetStore('sigh', { keyShape: M.any() });
  t.throws(() => set.has(bigString), ex);
  t.throws(() => set.add(bigString), ex);
  t.throws(() => set.delete(bigString), ex);

  const wmap = makeScalarBigWeakMapStore('wump', { keyShape: M.any() });
  t.throws(() => wmap.has(bigString), ex);
  t.throws(() => wmap.get(bigString), ex);
  t.throws(() => wmap.init(bigString, 'Ben!'), ex);
  t.throws(() => wmap.set(bigString, 'Ben!'), ex);
  t.throws(() => wmap.delete(bigString), ex);

  const wset = makeScalarBigWeakSetStore('whisk', { keyShape: M.any() });
  t.throws(() => wset.has(bigString), ex);
  t.throws(() => wset.add(bigString), ex);
  t.throws(() => wset.delete(bigString), ex);

  // check edge of size range
  const maxKey = 'x'.repeat(218);
  t.is(map.has(maxKey), false);
  t.throws(() => map.has(`${maxKey}x`), ex);
});

test('map queries', t => {
  const testStore = makeScalarBigMapStore('qmap', { keyShape: M.any() });
  fillBasicMapStore(testStore);

  t.deepEqual(Array.from(testStore.keys(M.number())), [-29, 3, 47]);
  t.is(testStore.getSize(M.number()), 3);
  t.deepEqual(Array.from(testStore.keys(47)), [47]);
  t.deepEqual(Array.from(testStore.keys(M.bigint())), [-77n, 1000n]);
  t.deepEqual(Array.from(testStore.keys(M.string())), ['@#$@#$@#$@', 'hello']);
  t.deepEqual(Array.from(testStore.keys(M.null())), [null]);
  t.deepEqual(Array.from(testStore.keys(M.boolean())), [false, true]);
  t.deepEqual(Array.from(testStore.keys(M.undefined())), [undefined]);
  t.deepEqual(Array.from(testStore.keys(M.remotable())), [
    something,
    somethingElse,
  ]);
  t.deepEqual(Array.from(testStore.keys(M.symbol())), [
    symbolBozo,
    symbolKrusty,
  ]);
  t.deepEqual(Array.from(testStore.keys(M.any())), [
    false,
    true,
    -29,
    3,
    47,
    -77n,
    1000n,
    something,
    somethingElse,
    '@#$@#$@#$@',
    'hello',
    null,
    symbolBozo,
    symbolKrusty,
    undefined,
  ]);
  t.deepEqual(Array.from(testStore.keys(M.scalar())), [
    false,
    true,
    -29,
    3,
    47,
    -77n,
    1000n,
    something,
    somethingElse,
    '@#$@#$@#$@',
    'hello',
    null,
    symbolBozo,
    symbolKrusty,
    undefined,
  ]);

  t.deepEqual(Array.from(testStore.values(M.number())), [
    'number -29',
    'number 3',
    'number 47',
  ]);
  t.deepEqual(Array.from(testStore.values(47)), ['number 47']);
  t.deepEqual(Array.from(testStore.values(M.bigint())), [
    'bigint -77',
    'bigint 1000',
  ]);
  t.deepEqual(Array.from(testStore.values(M.string())), [
    'string stuff',
    'string hello',
  ]);
  t.deepEqual(Array.from(testStore.values(M.null())), ['singleton null']);
  t.deepEqual(Array.from(testStore.values(M.boolean())), [
    'boolean false',
    'boolean true',
  ]);
  t.deepEqual(Array.from(testStore.values(M.undefined())), [
    'singleton undefined',
  ]);
  t.deepEqual(Array.from(testStore.values(M.remotable())), [
    'remotable object "something"',
    'remotable object "something else"',
  ]);
  t.deepEqual(Array.from(testStore.values(M.symbol())), [
    'symbol bozo',
    'symbol krusty',
  ]);
  t.deepEqual(Array.from(testStore.values(M.any())), [
    'boolean false',
    'boolean true',
    'number -29',
    'number 3',
    'number 47',
    'bigint -77',
    'bigint 1000',
    'remotable object "something"',
    'remotable object "something else"',
    'string stuff',
    'string hello',
    'singleton null',
    'symbol bozo',
    'symbol krusty',
    'singleton undefined',
  ]);
  t.deepEqual(Array.from(testStore.values(M.scalar())), [
    'boolean false',
    'boolean true',
    'number -29',
    'number 3',
    'number 47',
    'bigint -77',
    'bigint 1000',
    'remotable object "something"',
    'remotable object "something else"',
    'string stuff',
    'string hello',
    'singleton null',
    'symbol bozo',
    'symbol krusty',
    'singleton undefined',
  ]);

  t.deepEqual(Array.from(testStore.entries(M.number())), [
    [-29, 'number -29'],
    [3, 'number 3'],
    [47, 'number 47'],
  ]);
  t.deepEqual(Array.from(testStore.entries(47)), [[47, 'number 47']]);
  t.deepEqual(Array.from(testStore.entries(M.bigint())), [
    [-77n, 'bigint -77'],
    [1000n, 'bigint 1000'],
  ]);
  t.deepEqual(Array.from(testStore.entries(M.string())), [
    ['@#$@#$@#$@', 'string stuff'],
    ['hello', 'string hello'],
  ]);
  t.deepEqual(Array.from(testStore.entries(M.null())), [
    [null, 'singleton null'],
  ]);
  t.deepEqual(Array.from(testStore.entries(M.boolean())), [
    [false, 'boolean false'],
    [true, 'boolean true'],
  ]);
  t.deepEqual(Array.from(testStore.entries(M.undefined())), [
    [undefined, 'singleton undefined'],
  ]);
  t.deepEqual(Array.from(testStore.entries(M.remotable())), [
    [something, 'remotable object "something"'],
    [somethingElse, 'remotable object "something else"'],
  ]);
  t.deepEqual(Array.from(testStore.entries(M.symbol())), [
    [symbolBozo, 'symbol bozo'],
    [symbolKrusty, 'symbol krusty'],
  ]);
  t.deepEqual(Array.from(testStore.entries(M.any())), [
    [false, 'boolean false'],
    [true, 'boolean true'],
    [-29, 'number -29'],
    [3, 'number 3'],
    [47, 'number 47'],
    [-77n, 'bigint -77'],
    [1000n, 'bigint 1000'],
    [something, 'remotable object "something"'],
    [somethingElse, 'remotable object "something else"'],
    ['@#$@#$@#$@', 'string stuff'],
    ['hello', 'string hello'],
    [null, 'singleton null'],
    [symbolBozo, 'symbol bozo'],
    [symbolKrusty, 'symbol krusty'],
    [undefined, 'singleton undefined'],
  ]);
  t.deepEqual(Array.from(testStore.entries(M.scalar())), [
    [false, 'boolean false'],
    [true, 'boolean true'],
    [-29, 'number -29'],
    [3, 'number 3'],
    [47, 'number 47'],
    [-77n, 'bigint -77'],
    [1000n, 'bigint 1000'],
    [something, 'remotable object "something"'],
    [somethingElse, 'remotable object "something else"'],
    ['@#$@#$@#$@', 'string stuff'],
    ['hello', 'string hello'],
    [null, 'singleton null'],
    [symbolBozo, 'symbol bozo'],
    [symbolKrusty, 'symbol krusty'],
    [undefined, 'singleton undefined'],
  ]);
});

test('set queries', t => {
  const testStore = makeScalarBigSetStore('qset', { keyShape: M.any() });
  fillBasicSetStore(testStore);

  t.deepEqual(Array.from(testStore.values(M.number())), [-29, 3, 47]);
  t.deepEqual(Array.from(testStore.values(47)), [47]);
  t.deepEqual(Array.from(testStore.values(M.bigint())), [-77n, 1000n]);
  t.deepEqual(Array.from(testStore.values(M.string())), [
    '@#$@#$@#$@',
    'hello',
  ]);
  t.deepEqual(Array.from(testStore.values(M.null())), [null]);
  t.deepEqual(Array.from(testStore.values(M.boolean())), [false, true]);
  t.deepEqual(Array.from(testStore.values(M.undefined())), [undefined]);
  t.deepEqual(Array.from(testStore.values(M.remotable())), [
    something,
    somethingElse,
  ]);
  t.deepEqual(Array.from(testStore.values(M.symbol())), [
    symbolBozo,
    symbolKrusty,
  ]);
  t.deepEqual(Array.from(testStore.values(M.any())), [
    false,
    true,
    -29,
    3,
    47,
    -77n,
    1000n,
    something,
    somethingElse,
    '@#$@#$@#$@',
    'hello',
    null,
    symbolBozo,
    symbolKrusty,
    undefined,
  ]);
  t.deepEqual(Array.from(testStore.values(M.scalar())), [
    false,
    true,
    -29,
    3,
    47,
    -77n,
    1000n,
    something,
    somethingElse,
    '@#$@#$@#$@',
    'hello',
    null,
    symbolBozo,
    symbolKrusty,
    undefined,
  ]);
});

test('remotable sort order', t => {
  const testStore = makeScalarBigMapStore('rmap', { keyShape: M.remotable() });
  const a = makeGenericRemotable('a');
  const b = makeGenericRemotable('b');
  const c = makeGenericRemotable('c');
  testStore.init(a, 'a');
  testStore.init(b, 'b');
  testStore.init(c, 'c');
  t.deepEqual(Array.from(testStore.values()), ['a', 'b', 'c']);
  testStore.delete(b);
  t.deepEqual(Array.from(testStore.values()), ['a', 'c']);
  testStore.init(b, 'b');
  t.deepEqual(Array.from(testStore.values()), ['a', 'c', 'b']);
  testStore.set(a, 'a2');
  testStore.set(b, 'b2');
  testStore.set(c, 'c2');
  t.deepEqual(Array.from(testStore.values()), ['a2', 'c2', 'b2']);
});

test('complex map queries', t => {
  const primeStore = makeScalarBigMapStore('prime map', {
    keyShape: M.number(),
  });
  for (const [i, v] of primes.entries()) {
    primeStore.init(v, `${v} is prime #${i + 1}`);
  }

  t.deepEqual(Array.from(primeStore.values()), [
    '2 is prime #1',
    '3 is prime #2',
    '5 is prime #3',
    '7 is prime #4',
    '11 is prime #5',
    '13 is prime #6',
    '17 is prime #7',
    '19 is prime #8',
    '23 is prime #9',
    '29 is prime #10',
    '31 is prime #11',
    '37 is prime #12',
    '41 is prime #13',
    '43 is prime #14',
    '47 is prime #15',
    '53 is prime #16',
    '59 is prime #17',
    '61 is prime #18',
    '67 is prime #19',
    '71 is prime #20',
    '73 is prime #21',
    '79 is prime #22',
    '83 is prime #23',
    '89 is prime #24',
    '97 is prime #25',
  ]);
  t.deepEqual(Array.from(primeStore.values(M.gt(53))), [
    '59 is prime #17',
    '61 is prime #18',
    '67 is prime #19',
    '71 is prime #20',
    '73 is prime #21',
    '79 is prime #22',
    '83 is prime #23',
    '89 is prime #24',
    '97 is prime #25',
  ]);
  t.deepEqual(Array.from(primeStore.values(M.gte(53))), [
    '53 is prime #16',
    '59 is prime #17',
    '61 is prime #18',
    '67 is prime #19',
    '71 is prime #20',
    '73 is prime #21',
    '79 is prime #22',
    '83 is prime #23',
    '89 is prime #24',
    '97 is prime #25',
  ]);
  t.deepEqual(Array.from(primeStore.values(M.lt(53))), [
    '2 is prime #1',
    '3 is prime #2',
    '5 is prime #3',
    '7 is prime #4',
    '11 is prime #5',
    '13 is prime #6',
    '17 is prime #7',
    '19 is prime #8',
    '23 is prime #9',
    '29 is prime #10',
    '31 is prime #11',
    '37 is prime #12',
    '41 is prime #13',
    '43 is prime #14',
    '47 is prime #15',
  ]);
  t.deepEqual(Array.from(primeStore.values(M.lte(53))), [
    '2 is prime #1',
    '3 is prime #2',
    '5 is prime #3',
    '7 is prime #4',
    '11 is prime #5',
    '13 is prime #6',
    '17 is prime #7',
    '19 is prime #8',
    '23 is prime #9',
    '29 is prime #10',
    '31 is prime #11',
    '37 is prime #12',
    '41 is prime #13',
    '43 is prime #14',
    '47 is prime #15',
    '53 is prime #16',
  ]);
  t.deepEqual(Array.from(primeStore.values(M.and(M.gt(25), M.lt(75)))), [
    '29 is prime #10',
    '31 is prime #11',
    '37 is prime #12',
    '41 is prime #13',
    '43 is prime #14',
    '47 is prime #15',
    '53 is prime #16',
    '59 is prime #17',
    '61 is prime #18',
    '67 is prime #19',
    '71 is prime #20',
    '73 is prime #21',
  ]);
  t.deepEqual(Array.from(primeStore.values(M.or(M.lt(25), M.gt(75)))), [
    '2 is prime #1',
    '3 is prime #2',
    '5 is prime #3',
    '7 is prime #4',
    '11 is prime #5',
    '13 is prime #6',
    '17 is prime #7',
    '19 is prime #8',
    '23 is prime #9',
    '79 is prime #22',
    '83 is prime #23',
    '89 is prime #24',
    '97 is prime #25',
  ]);
  t.deepEqual(
    Array.from(
      primeStore.values(
        M.or(M.and(M.gt(10), M.lt(30)), M.and(M.gt(50), M.lt(75))),
      ),
    ),
    [
      '11 is prime #5',
      '13 is prime #6',
      '17 is prime #7',
      '19 is prime #8',
      '23 is prime #9',
      '29 is prime #10',
      '53 is prime #16',
      '59 is prime #17',
      '61 is prime #18',
      '67 is prime #19',
      '71 is prime #20',
      '73 is prime #21',
    ],
  );
  t.deepEqual(
    Array.from(primeStore.values(M.and(M.gt(25), M.lt(75), M.not(M.eq(53))))),
    [
      '29 is prime #10',
      '31 is prime #11',
      '37 is prime #12',
      '41 is prime #13',
      '43 is prime #14',
      '47 is prime #15',
      '59 is prime #17',
      '61 is prime #18',
      '67 is prime #19',
      '71 is prime #20',
      '73 is prime #21',
    ],
  );
  t.deepEqual(
    Array.from(primeStore.values(M.and(M.gt(25), M.lt(75), M.neq(53)))),
    [
      '29 is prime #10',
      '31 is prime #11',
      '37 is prime #12',
      '41 is prime #13',
      '43 is prime #14',
      '47 is prime #15',
      '59 is prime #17',
      '61 is prime #18',
      '67 is prime #19',
      '71 is prime #20',
      '73 is prime #21',
    ],
  );
});

test('complex set queries', t => {
  const primeStore = makeScalarBigSetStore('prime set', {
    keyShape: M.number(),
  });
  for (const v of primes) {
    primeStore.add(v);
  }

  t.deepEqual(
    Array.from(primeStore.values()),
    [
      2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67,
      71, 73, 79, 83, 89, 97,
    ],
  );
  t.deepEqual(
    Array.from(primeStore.values(M.gt(53))),
    [59, 61, 67, 71, 73, 79, 83, 89, 97],
  );
  t.deepEqual(
    Array.from(primeStore.values(M.gte(53))),
    [53, 59, 61, 67, 71, 73, 79, 83, 89, 97],
  );
  t.deepEqual(
    Array.from(primeStore.values(M.lt(53))),
    [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47],
  );
  t.deepEqual(
    Array.from(primeStore.values(M.lte(53))),
    [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53],
  );
  t.deepEqual(
    Array.from(primeStore.values(M.and(M.gt(25), M.lt(75)))),
    [29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73],
  );
  t.deepEqual(
    Array.from(primeStore.values(M.or(M.lt(25), M.gt(75)))),
    [2, 3, 5, 7, 11, 13, 17, 19, 23, 79, 83, 89, 97],
  );
  t.deepEqual(
    Array.from(
      primeStore.values(
        M.or(M.and(M.gt(10), M.lt(30)), M.and(M.gt(50), M.lt(75))),
      ),
    ),
    [11, 13, 17, 19, 23, 29, 53, 59, 61, 67, 71, 73],
  );
  t.deepEqual(
    Array.from(primeStore.values(M.and(M.gt(25), M.lt(75), M.not(M.eq(53))))),
    [29, 31, 37, 41, 43, 47, 59, 61, 67, 71, 73],
  );
  t.deepEqual(
    Array.from(primeStore.values(M.and(M.gt(25), M.lt(75), M.neq(53)))),
    [29, 31, 37, 41, 43, 47, 59, 61, 67, 71, 73],
  );
});
