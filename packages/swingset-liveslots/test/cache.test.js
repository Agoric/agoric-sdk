import test from 'ava';

import { makeCache } from '../src/cache.js';

test('cache', t => {
  const backing = new Map();
  backing.set('key0', 'value0');

  const log = [];
  const readBacking = key => {
    log.push(['read', key]);
    return backing.get(key);
  };
  const writeBacking = (key, value) => {
    log.push(['write', key, value]);
    backing.set(key, value);
  };
  const deleteBacking = key => {
    log.push(['delete', key]);
    backing.delete(key);
  };

  const c = makeCache(readBacking, writeBacking, deleteBacking);
  c.insistClear();

  // new reads pass through immediately to backing store
  t.is(c.get('key0'), 'value0');
  t.deepEqual(log.splice(0), [['read', 'key0']]);
  t.is(c.get('key2'), undefined);
  t.deepEqual(log.splice(0), [['read', 'key2']]);

  // more reads within the same crank do not
  t.is(c.get('key0'), 'value0');
  t.deepEqual(log, []);

  // writes update the cache but do not write through to backing store
  c.set('key1', 'value1');
  t.deepEqual(log, []);

  // reads are served from the cache
  t.is(c.get('key1'), 'value1');
  t.deepEqual(log, []);

  // new writes update the cache
  c.set('key1', 'value2');
  t.deepEqual(log, []);
  t.is(c.get('key1'), 'value2');
  t.deepEqual(log, []);

  c.set('key3', 'value3');
  c.set('key2', 'value2');
  t.deepEqual(log, []);

  c.delete('key2');
  t.is(c.get('key2'), undefined);

  c.delete('key4'); // no read from backing store, but schedules a write
  t.is(c.get('key4'), undefined); // remembers that it is missing
  t.deepEqual(log, []);

  // flush writes/deletes everything dirty, in sorted order
  c.flush();
  t.deepEqual(log.splice(0), [
    // key0 is not dirty
    ['write', 'key1', 'value2'],
    ['delete', 'key2'],
    ['write', 'key3', 'value3'],
    ['delete', 'key4'],
  ]);
  c.insistClear();

  // and now the cache is empty, so reads pass through
  t.is(c.get('key3'), 'value3');
  t.deepEqual(log.splice(0), [['read', 'key3']]);
  t.is(c.get('key2'), undefined);
  t.deepEqual(log.splice(0), [['read', 'key2']]);
  t.is(c.get('key0'), 'value0');
  t.deepEqual(log.splice(0), [['read', 'key0']]);
  t.is(c.get('key1'), 'value2');
  t.deepEqual(log.splice(0), [['read', 'key1']]);

  // flush sees nothing dirty
  c.flush();
  t.deepEqual(log, []);
  c.insistClear();

  t.is(c.get('key0'), 'value0');
  t.deepEqual(log.splice(0), [['read', 'key0']]);
  t.throws(() => c.insistClear(), { message: /^cache still has stash/ });
  c.flush();
  t.deepEqual(log, []);
  c.insistClear();

  c.set('key1', 'value3');
  t.deepEqual(log, []);
  t.throws(() => c.insistClear(), { message: /^cache still has dirtyKeys/ });
  c.flush();
  t.deepEqual(log.splice(0), [['write', 'key1', 'value3']]);
  c.insistClear();

  // we can delete values that haven't been read in yet
  c.delete('key1');
  t.deepEqual(log, []);
  c.flush();
  t.deepEqual(log.splice(0), [['delete', 'key1']]);

  // we can delete and overwrite values
  c.delete('key3');
  c.set('key3', 'value4');
  c.delete('key3');
  c.set('key3', 'value5');
  t.deepEqual(log, []);
  c.flush();
  t.deepEqual(log.splice(0), [['write', 'key3', 'value5']]);
});
