import { test } from '../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { Far } from '@agoric/marshal';
import { makeFakeCollectionManager } from '../tools/fakeVirtualSupport.js';

const {
  makeScalarMapStore,
  makeScalarWeakMapStore,
  makeScalarSetStore,
  makeScalarWeakSetStore,
  M,
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
    testStore.set(item[0], `${item[1]} updated`);
  }
  for (const item of stuff) {
    t.is(testStore.get(item[0]), `${item[1]} updated`);
  }

  t.truthy(testStore.has(47));
  t.falsy(testStore.has(53));

  t.throws(
    () => testStore.get(43),
    m(`key 43 not found in collection "${collectionName}"`),
  );
  t.throws(
    () => testStore.set(86, 'not work'),
    m(`key 86 not found in collection "${collectionName}"`),
  );
  t.throws(
    () => testStore.init(47, 'already there'),
    m(`key 47 already registered in collection "${collectionName}"`),
  );

  testStore.set(something, somethingElse);
  testStore.set(somethingElse, something);
  t.is(testStore.get(something), somethingElse);
  t.is(testStore.get(somethingElse), something);

  testStore.delete(47);
  t.falsy(testStore.has(47));
  t.throws(
    () => testStore.get(47),
    m(`key 47 not found in collection "${collectionName}"`),
  );
  t.throws(
    () => testStore.delete(22),
    m(`key 22 not found in collection "${collectionName}"`),
  );
}

function exerciseSetOperations(t, collectionName, testStore) {
  fillBasicSetStore(testStore);
  for (const item of stuff) {
    t.truthy(testStore.has(item[0]));
  }
  t.falsy(testStore.has(53));

  t.throws(
    () => testStore.add(47),
    m(`key 47 already registered in collection "${collectionName}"`),
  );

  testStore.delete(47);
  t.falsy(testStore.has(47));
  t.throws(
    () => testStore.delete(22),
    m(`key 22 not found in collection "${collectionName}"`),
  );
}

test('basic map operations', t => {
  exerciseMapOperations(t, 'map', makeScalarMapStore('map', M.any()));
});

test('basic weak map operations', t => {
  exerciseMapOperations(
    t,
    'weak map',
    makeScalarWeakMapStore('weak map', M.any()),
  );
});

test('basic set operations', t => {
  exerciseSetOperations(t, 'set', makeScalarSetStore('set', M.any()));
});

test('basic weak set operations', t => {
  exerciseSetOperations(
    t,
    'weak set',
    makeScalarWeakSetStore('weak set', M.any()),
  );
});

test('constrain map key schema', t => {
  const stringsOnly = makeScalarMapStore('strings only map', M.string());
  stringsOnly.init('skey', 'this should work');
  t.is(stringsOnly.get('skey'), 'this should work');
  t.throws(
    () => stringsOnly.init(29, 'this should not work'),
    m('invalid key type for collection "strings only map"'),
  );

  const noStrings = makeScalarMapStore('no strings map', M.not(M.string()));
  noStrings.init(47, 'number ok');
  noStrings.init(true, 'boolean ok');
  t.throws(
    () => noStrings.init('foo', 'string not ok?'),
    m('invalid key type for collection "no strings map"'),
  );
  t.is(noStrings.get(47), 'number ok');
  t.is(noStrings.get(true), 'boolean ok');
  t.falsy(noStrings.has('foo'));
  t.throws(
    () => noStrings.get('foo'),
    m('invalid key type for collection "no strings map"'),
  );

  const only47 = makeScalarMapStore('only 47 map', 47);
  only47.init(47, 'this number ok');
  t.throws(
    () => only47.init(29, 'this number not ok?'),
    m('invalid key type for collection "only 47 map"'),
  );
  t.is(only47.get(47), 'this number ok');
  t.falsy(only47.has(29));
  t.throws(
    () => only47.get(29),
    m('invalid key type for collection "only 47 map"'),
  );

  const lt47 = makeScalarMapStore('less than 47 map', M.lt(47));
  lt47.init(29, 'this number ok');
  t.throws(
    () => lt47.init(53, 'this number not ok?'),
    m('invalid key type for collection "less than 47 map"'),
  );
  t.is(lt47.get(29), 'this number ok');
  t.falsy(lt47.has(53));
  t.throws(
    () => lt47.get(53),
    m('invalid key type for collection "less than 47 map"'),
  );
  lt47.init(11, 'lower value');
  lt47.init(46, 'higher value');
  t.deepEqual(Array.from(lt47.keys()), [11, 29, 46]);
  t.deepEqual(Array.from(lt47.keys(M.gt(20))), [29, 46]);
});

test('constrain set key schema', t => {
  const stringsOnly = makeScalarSetStore('strings only set', M.string());
  t.falsy(stringsOnly.has('skey'));
  stringsOnly.add('skey');
  t.truthy(stringsOnly.has('skey'));
  t.throws(
    () => stringsOnly.add(29),
    m('invalid key type for collection "strings only set"'),
  );

  const noStrings = makeScalarSetStore('no strings set', M.not(M.string()));
  noStrings.add(47);
  noStrings.add(true);
  t.throws(
    () => noStrings.add('foo?'),
    m('invalid key type for collection "no strings set"'),
  );
  t.truthy(noStrings.has(47));
  t.truthy(noStrings.has(true));
  t.falsy(noStrings.has('foo'));

  const only47 = makeScalarSetStore('only 47 set', 47);
  t.falsy(only47.has(47));
  only47.add(47);
  t.truthy(only47.has(47));
  t.falsy(only47.has(29));
  t.throws(
    () => only47.add(29),
    m('invalid key type for collection "only 47 set"'),
  );

  const lt47 = makeScalarSetStore('less than 47 set', M.lt(47));
  lt47.add(29);
  t.throws(
    () => lt47.add(53),
    m('invalid key type for collection "less than 47 set"'),
  );
  t.truthy(lt47.has(29));
  t.falsy(lt47.has(53));
  lt47.add(11);
  lt47.add(46);
  t.deepEqual(Array.from(lt47.values()), [11, 29, 46]);
  t.deepEqual(Array.from(lt47.values(M.gt(20))), [29, 46]);
});

test('bogus key schema', t => {
  t.throws(
    () => makeScalarMapStore('bogus1', M.promise()),
    m('"promise" keys are not supported'),
  );
  t.throws(
    () => makeScalarMapStore('bogus2', M.error()),
    m('"error" keys are not supported'),
  );
  t.throws(
    () => makeScalarMapStore('bogus3', M.or(M.string(), M.promise())),
    m('"promise" keys are not supported'),
  );
});

test('map clear', t => {
  const testStore = makeScalarMapStore('cmap', M.any());
  testStore.init('a', 'ax');
  testStore.init('b', 'bx');
  testStore.init('c', 'cx');
  t.deepEqual(Array.from(testStore.keys()), ['a', 'b', 'c']);
  t.is(testStore.size, 3);
  testStore.clear();
  t.deepEqual(Array.from(testStore.keys()), []);
  t.is(testStore.size, 0);
});

test('set clear', t => {
  const testStore = makeScalarSetStore('cset', M.any());
  testStore.add('a');
  testStore.add('b');
  testStore.add('c');
  t.deepEqual(Array.from(testStore.values()), ['a', 'b', 'c']);
  t.is(testStore.size, 3);
  testStore.clear();
  t.deepEqual(Array.from(testStore.values()), []);
  t.is(testStore.size, 0);
});

test('map queries', t => {
  const testStore = makeScalarMapStore('qmap', M.any());
  fillBasicMapStore(testStore);

  t.deepEqual(Array.from(testStore.keys(M.number())), [3, 47]);
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
    3,
    47,
    -77n,
    1000n,
    something,
    somethingElse,
    '@#$@#$@#$@',
    'hello',
    undefined,
    symbolBozo,
    symbolKrusty,
    null,
  ]);
  t.deepEqual(Array.from(testStore.keys(M.scalar())), [
    false,
    true,
    3,
    47,
    -77n,
    1000n,
    something,
    somethingElse,
    '@#$@#$@#$@',
    'hello',
    undefined,
    symbolBozo,
    symbolKrusty,
    null,
  ]);

  t.deepEqual(Array.from(testStore.values(M.number())), [
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
    'number 3',
    'number 47',
    'bigint -77',
    'bigint 1000',
    'remotable object "something"',
    'remotable object "something else"',
    'string stuff',
    'string hello',
    'singleton undefined',
    'symbol bozo',
    'symbol krusty',
    'singleton null',
  ]);
  t.deepEqual(Array.from(testStore.values(M.scalar())), [
    'boolean false',
    'boolean true',
    'number 3',
    'number 47',
    'bigint -77',
    'bigint 1000',
    'remotable object "something"',
    'remotable object "something else"',
    'string stuff',
    'string hello',
    'singleton undefined',
    'symbol bozo',
    'symbol krusty',
    'singleton null',
  ]);

  t.deepEqual(Array.from(testStore.entries(M.number())), [
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
    [3, 'number 3'],
    [47, 'number 47'],
    [-77n, 'bigint -77'],
    [1000n, 'bigint 1000'],
    [something, 'remotable object "something"'],
    [somethingElse, 'remotable object "something else"'],
    ['@#$@#$@#$@', 'string stuff'],
    ['hello', 'string hello'],
    [undefined, 'singleton undefined'],
    [symbolBozo, 'symbol bozo'],
    [symbolKrusty, 'symbol krusty'],
    [null, 'singleton null'],
  ]);
  t.deepEqual(Array.from(testStore.entries(M.scalar())), [
    [false, 'boolean false'],
    [true, 'boolean true'],
    [3, 'number 3'],
    [47, 'number 47'],
    [-77n, 'bigint -77'],
    [1000n, 'bigint 1000'],
    [something, 'remotable object "something"'],
    [somethingElse, 'remotable object "something else"'],
    ['@#$@#$@#$@', 'string stuff'],
    ['hello', 'string hello'],
    [undefined, 'singleton undefined'],
    [symbolBozo, 'symbol bozo'],
    [symbolKrusty, 'symbol krusty'],
    [null, 'singleton null'],
  ]);
});

test('set queries', t => {
  const testStore = makeScalarSetStore('qset', M.any());
  fillBasicSetStore(testStore);

  t.deepEqual(Array.from(testStore.values(M.number())), [3, 47]);
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
    3,
    47,
    -77n,
    1000n,
    something,
    somethingElse,
    '@#$@#$@#$@',
    'hello',
    undefined,
    symbolBozo,
    symbolKrusty,
    null,
  ]);
  t.deepEqual(Array.from(testStore.values(M.scalar())), [
    false,
    true,
    3,
    47,
    -77n,
    1000n,
    something,
    somethingElse,
    '@#$@#$@#$@',
    'hello',
    undefined,
    symbolBozo,
    symbolKrusty,
    null,
  ]);

  t.deepEqual(Array.from(testStore.entries(M.number())), [
    [3, 3],
    [47, 47],
  ]);
});

test('remotable sort order', t => {
  const testStore = makeScalarMapStore('rmap', M.remotable());
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
  const primeStore = makeScalarMapStore('prime map', M.number());
  primes.forEach((v, i) => primeStore.init(v, `${v} is prime #${i + 1}`));

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
  const primeStore = makeScalarSetStore('prime set', M.number());
  primes.forEach(v => primeStore.add(v));

  t.deepEqual(Array.from(primeStore.values()), [
    2,
    3,
    5,
    7,
    11,
    13,
    17,
    19,
    23,
    29,
    31,
    37,
    41,
    43,
    47,
    53,
    59,
    61,
    67,
    71,
    73,
    79,
    83,
    89,
    97,
  ]);
  t.deepEqual(Array.from(primeStore.values(M.gt(53))), [
    59,
    61,
    67,
    71,
    73,
    79,
    83,
    89,
    97,
  ]);
  t.deepEqual(Array.from(primeStore.values(M.gte(53))), [
    53,
    59,
    61,
    67,
    71,
    73,
    79,
    83,
    89,
    97,
  ]);
  t.deepEqual(Array.from(primeStore.values(M.lt(53))), [
    2,
    3,
    5,
    7,
    11,
    13,
    17,
    19,
    23,
    29,
    31,
    37,
    41,
    43,
    47,
  ]);
  t.deepEqual(Array.from(primeStore.values(M.lte(53))), [
    2,
    3,
    5,
    7,
    11,
    13,
    17,
    19,
    23,
    29,
    31,
    37,
    41,
    43,
    47,
    53,
  ]);
  t.deepEqual(Array.from(primeStore.values(M.and(M.gt(25), M.lt(75)))), [
    29,
    31,
    37,
    41,
    43,
    47,
    53,
    59,
    61,
    67,
    71,
    73,
  ]);
  t.deepEqual(Array.from(primeStore.values(M.or(M.lt(25), M.gt(75)))), [
    2,
    3,
    5,
    7,
    11,
    13,
    17,
    19,
    23,
    79,
    83,
    89,
    97,
  ]);
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
