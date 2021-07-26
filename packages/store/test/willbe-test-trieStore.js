// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
import makeTrieStore from '../src/trieStore';
import { testAStore } from './test-store';

test('trieStore', t => {
  try {
    testAStore(t, makeTrieStore, [NaN, -0, {}]);
  } catch (e) {
    console.log('unexpected exception', e);
    t.assert(false, e);
  } finally {
    t.end();
  }
});
