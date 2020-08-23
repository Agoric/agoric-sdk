import test from 'ava';
import { isTamed, tameMetering } from '../src/index';

test('isTamed', t => {
  t.is(isTamed(), false, 'isTamed() is false in a new untamed realm');
  tameMetering();
  t.is(isTamed(), true, 'isTamed() becomes true after tameMetering()');
  tameMetering(); // idempotent
  t.is(isTamed(), true, 'isTamed() remains true after duplicate call');
});
