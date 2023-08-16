import test from 'ava';

import { AmountMath } from '@agoric/ertp';
import { Far } from '@endo/marshal';
import * as StoreUtils from '../../src/vaultFactory/storeUtils.js';

/** @type {Brand<'nat'>} */
export const mockBrand = Far('brand');
const keysMatch = test.macro({
  exec(t, [debt, collat, vaultId], [expectedKey, numberOut]) {
    const key = StoreUtils.toVaultKey(
      // @ts-expect-error cast to NormalizedDebt
      AmountMath.make(mockBrand, BigInt(debt)),
      AmountMath.make(mockBrand, BigInt(collat)),
      String(vaultId),
    );
    t.is(key, expectedKey);
    t.deepEqual(StoreUtils.fromVaultKey(key), [numberOut, vaultId]);
  },
  title(providedTitle = '', [debt, collat, vaultId], [expectedKey, numberOut]) {
    return `${providedTitle} (${debt}/${collat}, ${vaultId}) => ${expectedKey} ==> ${numberOut}, ${vaultId})`;
  },
});

test(
  'Infinity collateralized',
  keysMatch,
  [0, 100, 'vault-A'],
  // treat 0 as epsilon for safer serialization
  ['fc399000000000000:vault-A', 450359962737049600],
);
test(keysMatch, [1, 100, 'vault-B'], ['fc059000000000000:vault-B', 100.0]);
test(keysMatch, [1000, 100, 'vault-C'], ['fbfb999999999999a:vault-C', 0.1]);
test(keysMatch, [1000, 101, 'vault-D'], ['fbfb9db22d0e56042:vault-D', 0.101]);

test(
  keysMatch,
  [100, Number.MAX_SAFE_INTEGER, 'vault-MAX-COLLATERAL'],
  ['fc2d47ae147ae147a:vault-MAX-COLLATERAL', 90071992547409.9],
);
test(
  keysMatch,
  [Number.MAX_SAFE_INTEGER, 100, 'vault-MAX-DEBT'],
  ['fbd09000000000001:vault-MAX-DEBT', 1.1102230246251567e-14],
);
test(
  keysMatch,
  [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 'vault-MAX-EVEN'],
  ['fbff0000000000000:vault-MAX-EVEN', 1],
);
test(
  keysMatch,
  [1, 0, 'vault-NOCOLLATERAL'],
  ['f8000000000000000:vault-NOCOLLATERAL', 0],
);
