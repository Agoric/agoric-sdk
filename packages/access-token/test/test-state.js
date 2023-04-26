import tmp from 'tmp';

import test from 'ava';
import {
  initJSONStore,
  openJSONStore,
  getAllState,
  isJSONStore,
} from '../src/json-store.js';

/**
 * @param {string} [prefix]
 * @returns {Promise<[string, () => void]>}
 */
const tmpDir = prefix =>
  new Promise((resolve, reject) => {
    tmp.dir({ unsafeCleanup: true, prefix }, (err, name, removeCallback) => {
      if (err) {
        reject(err);
      } else {
        resolve([name, removeCallback]);
      }
    });
  });

function testStorage(t, storage) {
  t.falsy(storage.has('missing'));
  t.is(storage.get('missing'), undefined);

  storage.set('foo', 'f');
  t.truthy(storage.has('foo'));
  t.is(storage.get('foo'), 'f');

  storage.set('foo2', 'f2');
  storage.set('foo1', 'f1');
  storage.set('foo3', 'f3');
  t.deepEqual(Array.from(storage.getKeys('foo1', 'foo3')), ['foo1', 'foo2']);
  t.deepEqual(Array.from(storage.getKeys('foo1', 'foo4')), [
    'foo1',
    'foo2',
    'foo3',
  ]);

  storage.delete('foo2');
  t.falsy(storage.has('foo2'));
  t.is(storage.get('foo2'), undefined);
  t.deepEqual(Array.from(storage.getKeys('foo1', 'foo4')), ['foo1', 'foo3']);

  const reference = {
    foo: 'f',
    foo1: 'f1',
    foo3: 'f3',
  };
  t.deepEqual(getAllState(storage), reference, 'check state after changes');
}

test('storageInFile', async t => {
  const [dbDir, cleanup] = await tmpDir('testdb');
  t.teardown(cleanup);
  t.is(isJSONStore(dbDir), false);
  const { storage, commit, close } = initJSONStore(dbDir);
  testStorage(t, storage);
  await commit();
  const before = getAllState(storage);
  await close();
  t.is(isJSONStore(dbDir), true);

  const { storage: after } = openJSONStore(dbDir);
  t.deepEqual(getAllState(after), before, 'check state after reread');
  t.is(isJSONStore(dbDir), true);
});
