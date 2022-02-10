// Must be first to set up globals
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath, AssetKind } from '@agoric/ertp';
import { Far } from '@endo/marshal';
import * as StoreUtils from '../../src/vaultFactory/storeUtils.js';

// XXX shouldn't we have a shared test utils for this kind of thing?
export const mockBrand = Far('brand', {
  isMyIssuer: async _allegedIssuer => false,
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

for (const [debt, collat, vaultId, expectedKey, numberOut] of [
  [0, 100, 'vault-A', 'fc399000000000000:vault-A', 450359962737049600], // Infinity collateralized but we treat 0 as epsilon for safer serialization
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
  [1, 0, 'vault-NOCOLLATERAL', 'f8000000000000000:vault-NOCOLLATERAL', 0],
]) {
  test(`vault keys: (${debt}/${collat}, ${vaultId}) => ${expectedKey} ==> ${numberOut}, ${vaultId}`, t => {
    const key = StoreUtils.toVaultKey(
      AmountMath.make(mockBrand, BigInt(debt)),
      AmountMath.make(mockBrand, BigInt(collat)),
      vaultId,
    );
    t.is(key, expectedKey);
    t.deepEqual(StoreUtils.fromVaultKey(key), [numberOut, vaultId]);
  });
}
