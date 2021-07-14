// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import { makeIssuerKit, AssetKind, AmountMath } from '@agoric/ertp';

import { makeTryToBurn } from '../../../../src/contracts/attestation/freeIfUnclaimed';

test('tryToBurn', async t => {
  const { issuer, mint, brand } = makeIssuerKit('token', AssetKind.SET);
  const tryToBurn = makeTryToBurn(issuer);

  t.is(await tryToBurn({}), undefined);
  const amount = AmountMath.make(brand, [1]);
  t.truthy(
    AmountMath.isEqual(await tryToBurn(mint.mintPayment(amount)), amount),
  );
});
