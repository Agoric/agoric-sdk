import { test } from '../tools/prepare-test-env-ava.js';
import { stripPrefix } from '../src/kernel/state/kernelKeeper.js';

test('stripPrefix', t => {
  t.is(stripPrefix('prefix', 'prefixed'), 'ed');
  t.is(stripPrefix('', 'prefixed'), 'prefixed');
  t.throws(() => stripPrefix('not', 'prefixed'), { message: /prefixed/ });
});
