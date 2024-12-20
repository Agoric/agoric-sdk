import test from '@endo/ses-ava/prepare-endo.js';
import { encodeAddressHook } from '@agoric/cosmic-proto/address-hooks.js';
import { makeTestAddress } from '../../tools/make-test-address.js';

test('makeTestAddress returns valid bech32', t => {
  t.is(makeTestAddress(), 'agoric1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqp7zqht');
  t.is(makeTestAddress(1), 'agoric1qyqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqc09z0g');
  t.is(
    makeTestAddress(0, 'agoric', 32),
    'agoric1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqkppep3',
  );
  t.is(
    makeTestAddress(0, 'cosmos'),
    'cosmos1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqnrql8a',
  );
});

test('makeTestAddress creates address accepted by encodeAddressHook', t => {
  const params = { EUD: makeTestAddress(0, 'osmosis') };
  t.throws(() => encodeAddressHook('agoric1FakeLCAAddress', params));
  t.notThrows(() => encodeAddressHook(makeTestAddress(), params));
});
