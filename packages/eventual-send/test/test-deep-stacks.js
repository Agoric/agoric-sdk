import '@agoric/install-ses';
import test from 'ava';
import { assert } from '@agoric/assert';
import { E } from './get-hp';

test('deep-stacks when', t => {
  let r;
  const p = new Promise(res => (r = res));
  const q = E.when(p, v1 => E.when(v1 + 1, v2 => assert.equal(v2, 22)));
  r(33);
  return q.catch(reason => {
    console.log('expected failure', reason);
  });
});
