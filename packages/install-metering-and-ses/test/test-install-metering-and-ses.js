import '../install-metering-and-ses';
import test from 'ava';
import { makeMeter } from '@agoric/transform-metering';

// I don't know how to test that replaceGlobalMeter already exists, because
// the only way to get a reference is to re-run the taming function. But we
// can import it "again" here and grab the reference.
import { tameMetering } from '@agoric/tame-metering';

// If it wasn't installed before SES, this call will probably fail (SES
// freezes the primordials, so tame-metering won't be able to change them).
// If it *was* installed before SES, this should give us the
// previously-created replaceGlobalMeter handle

const replaceGlobalMeter = tameMetering();

test('SES globals are present', t => {
  t.is(typeof Compartment, 'function');
  t.is(typeof harden, 'function');
});

test('can replaceGlobalMeter', t => {
  const { meter } = makeMeter();
  const oldMeter = replaceGlobalMeter(meter);
  t.not(meter, oldMeter);
  // provoke some globals
  const a = [];
  a.length = 10;
  a.fill(0);
  const newMeter = replaceGlobalMeter(null);
  t.is(meter, newMeter);
  // TODO: once meters provide an API to read out their value, assert that
  // the value changed at all
});
