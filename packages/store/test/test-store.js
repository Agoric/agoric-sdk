// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
import makeStore from '../src/store';
import { throwsAndLogs } from '../../assert/test/throwsAndLogs';

export const testAStore = (t, makeAStore, key) => {
  const store = makeAStore('fookey');
  t.equal(store.has(key), false);
  throwsAndLogs(t, () => store.get(key), /fookey not found: \(a.*\)/, [
    ['log', 'FAILED ASSERTION false'],
    ['error', '', 'fookey', ' not found: ', key, ''],
  ]);
  store.init(key, 8);
  t.equal(store.has(key), true);
  t.equal(store.get(key), 8);
  store.set(key, 9);
  t.equal(store.get(key), 9);
  throwsAndLogs(
    t,
    () => store.init(key, 7),
    /fookey already registered: \(a.*\)/,
    [
      ['log', 'FAILED ASSERTION false'],
      ['error', '', 'fookey', ' already registered: ', key, ''],
    ],
  );
  store.delete(key);
  t.equal(store.has(key), false);
  store.init(key, 5);
  t.equal(store.has(key), true);
  t.equal(store.get(key), 5);
};

test('store', t => {
  try {
    testAStore(t, makeStore, 'x');
  } catch (e) {
    console.log('unexpected exception', e);
    t.assert(false, e);
  } finally {
    t.end();
  }
});
