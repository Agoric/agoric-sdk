// Must be first to set up globals
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath, AssetKind } from '@agoric/ertp';
import { makeRatioFromAmounts } from '@agoric/zoe/src/contractSupport/ratio.js';
import { Far } from '@endo/marshal';
import * as StoreUtils from '../../src/vaultFactory/storeUtils.js';

// XXX shouldn't we have a shared test utils for this kind of thing?
export const mockBrand = Far('brand', {
  // eslint-disable-next-line no-unused-vars
  isMyIssuer: async allegedIssuer => false,
  getAllegedName: () => 'mock',
  getDisplayInfo: () => ({
    assetKind: AssetKind.NAT,
  }),
});

for (const [before, after] of [
  // matches
  [1, 1],
  [-1, -1],
  [123 / 456, 123 / 456],
  [Infinity, Infinity],
  [-Infinity, -Infinity],
  [NaN, NaN],
  [Number.MAX_VALUE, Number.MAX_VALUE],
  // changes
  [-0, NaN],
]) {
  test(`cycle number from DB entry key function: ${before} => ${after}`, t => {
    t.is(
      StoreUtils.dbEntryKeyToNumber(
        StoreUtils.numberToDBEntryKey(before),
        after,
      ),
      after,
    );
  });
}

for (const [numerator, denominator, vaultId, expectedKey, numberOut] of [
  [0, 100, 'vault-A', 'ffff0000000000000:vault-A', Infinity],
  [1, 100, 'vault-B', 'fc059000000000000:vault-B', 100.0],
  [1000, 100, 'vault-C', 'fbfb999999999999a:vault-C', 0.1],
  [1000, 101, 'vault-D', 'fbfb9db22d0e56042:vault-D', 0.101],
  [
    100,
    Number.MAX_SAFE_INTEGER,
    'vault-MAX-COLLATERAL',
    'fc2d47ae147ae147a:vault-MAX-COLLATERAL',
    90071992547409.9,
  ],
  [
    Number.MAX_SAFE_INTEGER,
    100,
    'vault-MAX-DEBT',
    'fbd09000000000001:vault-MAX-DEBT',
    1.1102230246251567e-14,
  ],
  [
    Number.MAX_SAFE_INTEGER,
    Number.MAX_SAFE_INTEGER,
    'vault-MAX-EVEN',
    'fbff0000000000000:vault-MAX-EVEN',
    1,
  ],
]) {
  test(`vault keys: (${numerator}/${denominator}, ${vaultId}) => ${expectedKey} ==> ${numberOut}, ${vaultId}`, t => {
    const ratio = makeRatioFromAmounts(
      AmountMath.make(mockBrand, BigInt(numerator)),
      AmountMath.make(mockBrand, BigInt(denominator)),
    );
    const key = StoreUtils.toVaultKey(ratio, vaultId);
    t.is(key, expectedKey);
    t.deepEqual(StoreUtils.fromVaultKey(key), [numberOut, vaultId]);
  });
}
