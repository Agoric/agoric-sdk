import { test } from '../../tools/prepare-test-env-ava.js';

import { makeCache } from '../../src/kernel/virtualObjectManager.js';

function makeFakeStore() {
  const backing = new Map();
  let log = [];
  return {
    fetch(key) {
      const result = backing.get(key);
      log.push(['fetch', key, result]);
      return result;
    },
    store(key, value) {
      log.push(['store', key, value]);
      backing.set(key, value);
    },
    getLog() {
      const result = log;
      log = [];
      return result;
    },
    dump() {
      const result = [];
      for (const entry of backing.entries()) {
        result.push(entry);
      }
      result.sort((e1, e2) => e1[0].localeCompare(e2[0]));
      return result;
    },
  };
}

function makeThing(n) {
  // for testing purposes, all we create is the inner self; there's no actual
  // object above it
  return {
    vobjID: `t${n}`,
    rawData: `thing #${n}`,
    dirty: false,
  };
}

test('cache overflow and refresh', t => {
  const store = makeFakeStore();
  const cache = makeCache(3, store.fetch, store.store);
  const things = [];

  for (let i = 0; i < 6; i += 1) {
    const thing = makeThing(i);
    things.push(thing);
    cache.remember(thing);
    cache.markDirty(thing);
  }
  // cache: t5, t4, t3, t2

  // after initialization
  t.is(things[0].rawData, null);
  t.is(things[1].rawData, null);
  t.is(things[2].rawData, 'thing #2');
  t.is(things[3].rawData, 'thing #3');
  t.is(things[4].rawData, 'thing #4');
  t.is(things[5].rawData, 'thing #5');
  t.deepEqual(store.getLog(), [
    ['store', 't0', 'thing #0'],
    ['store', 't1', 'thing #1'],
  ]);

  // lookup that refreshes
  cache.lookup('t2'); // cache: t2, t5, t4, t3
  t.is(things[5].rawData, 'thing #5');
  t.deepEqual(store.getLog(), []);

  // lookup that has no effect
  things[0] = cache.lookup('t0'); // cache: t0, t2, t5, t4
  things[0].rawData = 'changed thing #0';
  cache.markDirty(things[0]); // pretend we changed it
  t.is(things[0].rawData, 'changed thing #0');
  t.is(things[3].rawData, null);
  t.deepEqual(store.getLog(), [['store', 't3', 'thing #3']]);

  // verify refresh
  cache.refresh(things[4]); // cache: t4, t0, t2, t5
  things[1] = cache.lookup('t1'); // cache: t1, t4, t0, t2
  t.is(things[1].rawData, null);
  t.is(things[5].rawData, null);
  t.deepEqual(store.getLog(), [['store', 't5', 'thing #5']]);

  // verify that everything is there
  t.truthy(things[0].dirty);
  t.falsy(things[1].dirty);
  t.truthy(things[2].dirty);
  t.falsy(things[3].dirty);
  t.truthy(things[4].dirty);
  t.falsy(things[5].dirty);
  cache.flush(); // cache: empty
  t.falsy(things[0].dirty);
  t.falsy(things[1].dirty);
  t.falsy(things[2].dirty);
  t.falsy(things[3].dirty);
  t.falsy(things[4].dirty);
  t.falsy(things[5].dirty);
  t.is(things[0].rawData, 'changed thing #0');
  t.is(things[1].rawData, null);
  t.is(things[2].rawData, 'thing #2');
  t.is(things[3].rawData, null);
  t.is(things[4].rawData, 'thing #4');
  t.is(things[5].rawData, null);
  t.deepEqual(store.getLog(), [
    ['store', 't2', 'thing #2'],
    ['store', 't0', 'changed thing #0'],
    ['store', 't4', 'thing #4'],
  ]);
  t.deepEqual(store.dump(), [
    ['t0', 'changed thing #0'],
    ['t1', 'thing #1'],
    ['t2', 'thing #2'],
    ['t3', 'thing #3'],
    ['t4', 'thing #4'],
    ['t5', 'thing #5'],
  ]);

  // verify that changes get written
  things[0] = cache.lookup('t0'); // cache: t0
  things[0].rawData = 'new thing #0';
  things[0].dirty = true;
  things[1] = cache.lookup('t1'); // cache: t1, t0
  things[1].rawData = 'new thing #1';
  things[1].dirty = true;
  things[2] = cache.lookup('t2'); // cache: t2, t1, t0
  things[2].rawData = 'new thing #2';
  things[2].dirty = true;
  things[3] = cache.lookup('t3'); // cache: t3, t2, t1, t0
  things[3].rawData = 'new thing #3';
  things[3].dirty = true;
  things[4] = cache.lookup('t4'); // cache: t4, t3, t2, t1
  things[4].rawData = 'new thing #4';
  things[4].dirty = true;
  things[5] = cache.lookup('t5'); // cache: t5, t4, t3, t2
  things[5].rawData = 'new thing #5';
  things[5].dirty = true;
  t.is(things[0].rawData, null);
  t.is(things[5].rawData, 'new thing #5');
  t.deepEqual(store.getLog(), [
    ['store', 't0', 'new thing #0'],
    ['store', 't1', 'new thing #1'],
  ]);
  t.deepEqual(store.dump(), [
    ['t0', 'new thing #0'],
    ['t1', 'new thing #1'],
    ['t2', 'thing #2'],
    ['t3', 'thing #3'],
    ['t4', 'thing #4'],
    ['t5', 'thing #5'],
  ]);
});
