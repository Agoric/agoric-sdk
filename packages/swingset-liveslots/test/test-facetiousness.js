import '@endo/init/debug.js';
import test from 'ava';
import { assessFacetiousness } from '../src/facetiousness.js';

const empty = harden({});

const single = harden({
  add: (a, b) => a + b,
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
