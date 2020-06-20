import test from 'tape-promise/tape';
import { isTamed, tameMetering } from '../src/index';

test('isTamed', t => {
  t.equal(isTamed(), false, 'isTamed() is false in a new untamed realm');
  tameMetering();
  t.equal(isTamed(), true, 'isTamed() becomes true after tameMetering()');
  tameMetering(); // idempotent
  t.equal(isTamed(), true, 'isTamed() remains true after duplicate call');
  t.end();
});
