import { test } from 'tape';
import evaluate from '@agoric/evaluate';

test('basic', t => {
  t.deepEqual(evaluate('1+2'), 3);
  t.deepEqual(evaluate('(a,b) => a+b')(1, 2), 3);
  t.deepEqual(evaluate('(function(a,b) { return a+b; })')(1, 2), 3);
  t.end();
});

test('endowments', t => {
  t.deepEqual(evaluate('1+a', { a: 2 }), 3);
  t.deepEqual(evaluate('(a,b) => a+b+c', { c: 3 })(1, 2), 6);
  t.deepEqual(evaluate('(function(a,b) { return a+b+c; })', { c: 3 })(1, 2), 6);
  t.deepEqual(evaluate('1+a+b', { a: 2, b: 3 }), 6);
  t.end();
});
