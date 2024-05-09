import test from 'ava';
import {
  assessFacetiousness,
  checkAndUpdateFacetiousness,
} from '../src/facetiousness.js';

const empty = harden({});

const single = harden({
  add: (a, b) => a + b,
});

const emptyMulti = harden({
  foo: {},
  bar: {},
});

const multi = harden({
  incrementer: {
    increment: ({ state }) => (state.count += 1),
  },
  resetter: {
    reset: ({ state }) => (state.count = 0),
  },
});

const brokenNested = harden({
  multi, // the "facet" named multi is nested, so broken
});

const brokenMixed1 = harden({
  add: (a, b) => a + b,
  incrementer: {
    increment: ({ state }) => (state.count += 1),
  },
});

const brokenMixed2 = harden({
  incrementer: {
    increment: ({ state }) => (state.count += 1),
  },
  add: (a, b) => a + b,
});

const brokenSymbolNamedFacet1 = harden({
  [Symbol.for('resetter')]: {
    reset: ({ state }) => (state.count = 0),
  },
});

const brokenSymbolNamedFacet2 = harden({
  incrementer: {
    increment: ({ state }) => (state.count += 1),
  },
  [Symbol.for('resetter')]: {
    reset: ({ state }) => (state.count = 0),
  },
});

const brokenSymbolNamedFacet3 = harden({
  [Symbol.for('resetter')]: {
    reset: ({ state }) => (state.count = 0),
  },
  incrementer: {
    increment: ({ state }) => (state.count += 1),
  },
});

const brokenMultiNonFacet = harden({
  incrementer: {
    increment: ({ state }) => (state.count += 1),
  },
  data: 4,
});

const brokenMixedData1 = harden({
  add: (a, b) => a + b,
  data: 4,
});

const brokenMixedData2 = harden({
  data: 4,
  add: (a, b) => a + b,
});

test('facetiousness', t => {
  t.is(assessFacetiousness(4), 'not');
  t.is(assessFacetiousness('not'), 'not');
  t.is(assessFacetiousness([]), 'not');

  t.is(assessFacetiousness(empty), 'one');
  t.is(assessFacetiousness(single), 'one');

  t.is(assessFacetiousness(multi), 'many');
  t.is(assessFacetiousness(emptyMulti), 'many');

  t.is(assessFacetiousness(brokenNested), 'not');
  t.is(assessFacetiousness(brokenMixed1), 'not');
  t.is(assessFacetiousness(brokenMixed2), 'not');
  t.is(assessFacetiousness(brokenSymbolNamedFacet1), 'not');
  t.is(assessFacetiousness(brokenSymbolNamedFacet2), 'not');
  t.is(assessFacetiousness(brokenSymbolNamedFacet3), 'not');
  t.is(assessFacetiousness(brokenMixedData1), 'not');
  t.is(assessFacetiousness(brokenMixedData2), 'not');
  t.is(assessFacetiousness(brokenMultiNonFacet), 'not');
});

test('checkAndUpdateFacetiousness', t => {
  const cauf = (...args) => checkAndUpdateFacetiousness('tag', ...args);
  const desc = facets =>
    facets ? { facets: facets.sort() } : { unfaceted: true };
  const foo = ['foo'];
  const foobar = ['foo', 'bar'];
  const barfoo = ['bar', 'foo'];
  const foobarbaz = ['foo', 'bar', 'baz'];
  const foobazbar = ['foo', 'baz', 'bar'];
  const barfoobaz = ['bar', 'foo', 'baz'];
  const zotfoobazbar = ['zot', 'foo', 'baz', 'bar'];
  const barfoobazzot = ['bar', 'foo', 'baz', 'zot'];

  // new definitions use the facet names of the proposal (sorted)
  t.is(cauf({}, undefined), undefined); // single
  t.deepEqual(cauf({}, foo), foo);
  t.deepEqual(cauf({}, foobar), barfoo);
  t.deepEqual(cauf({}, barfoo), barfoo);

  // a single Kind can only be redefined as another single
  t.is(cauf(desc(), undefined), undefined);
  t.throws(() => cauf(desc(), foo), {
    message: 'defineDurableKindMulti called for unfaceted KindHandle "tag"',
  });

  // multi Kinds cannot be redefined as single
  t.throws(() => cauf(desc(foo), undefined), {
    message: 'defineDurableKind called for faceted KindHandle "tag"',
  });

  // a multi Kind can be redefined with all the original facets,
  // possibly plus more, which are added in sorted order
  t.deepEqual(cauf(desc(foo), foo), foo);
  t.deepEqual(cauf(desc(foo), foobar), foobar);
  t.deepEqual(cauf(desc(foo), barfoo), foobar);
  t.deepEqual(cauf(desc(foo), foobarbaz), foobarbaz); // bar/baz sorted
  t.deepEqual(cauf(desc(foo), foobazbar), foobarbaz);

  t.deepEqual(cauf(desc(foobar), foobar), barfoo);
  t.deepEqual(cauf(desc(foobar), barfoo), barfoo);
  t.deepEqual(cauf(desc(foobar), foobarbaz), barfoobaz);
  t.deepEqual(cauf(desc(foobar), foobarbaz), barfoobaz);
  t.deepEqual(cauf(desc(foobar), zotfoobazbar), barfoobazzot);

  // missing facets cause an error
  t.throws(() => cauf(desc(foobar), foo), {
    message:
      'durable kind ""tag"" facets ("foo") is missing "bar" from original definition ("bar,foo")',
  });
  t.throws(() => cauf(desc(foobarbaz), foobar), {
    message:
      'durable kind ""tag"" facets ("bar,foo") is missing "baz" from original definition ("bar,baz,foo")',
  });
});
