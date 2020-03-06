// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
import makeWeakStore from '../src/weakStore';
import { testAStore } from '../../store/test/test-store';

test('weakStore', t => {
  try {
    testAStore(t, makeWeakStore, {});
  } catch (e) {
    console.log('unexpected exception', e);
    t.assert(false, e);
  } finally {
    t.end();
  }
});
