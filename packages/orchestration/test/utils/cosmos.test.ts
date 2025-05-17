import test from '@endo/ses-ava/prepare-endo.js';
import {
  toDenomAmount,
  toTruncatedDenomAmount,
} from '../../src/utils/cosmos.js';

const denom = 'uosmo';

test('convert Coin amount', t => {
  const amount = '100';
  const value = 100n;
  t.deepEqual(toDenomAmount({ denom, amount }), {
    denom,
    value,
  });
  t.deepEqual(toTruncatedDenomAmount({ denom, amount }), {
    denom,
    value,
  });
});

test('convert DecCoin amount', t => {
  const amount = '100.01';
  const value = 100n;
  t.throws(() => toDenomAmount({ denom, amount }), {
    message: 'Cannot convert 100.01 to a BigInt',
  });
  t.deepEqual(toTruncatedDenomAmount({ denom, amount }), {
    denom,
    value,
  });
});
