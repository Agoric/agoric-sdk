// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import { makeStore } from '@agoric/store';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';

import { unlienExpiredAmounts } from '../../../../../src/contracts/attestation/expiring/unlienExpiredAmounts.js';
import { makeAttestationElem } from '../../../../../src/contracts/attestation/expiring/expiringHelpers.js';
import { makeHandle } from '../../../../../src/makeHandle.js';

test(`store doesn't have address`, async t => {
  /** @type {Store<Address,Array<ExpiringAttElem>>} */
  const store = makeStore('address');
  const address = 'address';
  const currentTime = 5n;
  const { brand: externalBrand } = makeIssuerKit('external');
  const empty = AmountMath.makeEmpty(externalBrand);

  const result = unlienExpiredAmounts(store, empty, address, currentTime);
  t.true(AmountMath.isEmpty(result));
  t.false(store.has(address));
});

test(`store has address with empty array value`, async t => {
  /** @type {Store<Address,Array<ExpiringAttElem>>} */
  const store = makeStore('address');
  const address = 'address';
  const currentTime = 5n;
  const { brand: externalBrand } = makeIssuerKit('external');
  const empty = AmountMath.makeEmpty(externalBrand);

  store.init(address, []);

  const result = unlienExpiredAmounts(store, empty, address, currentTime);
  t.true(AmountMath.isEmpty(result));
  t.deepEqual(store.get(address), []);
});

test(`store has address with all non-expired values`, async t => {
  /** @type {Store<Address,Array<ExpiringAttElem>>} */
  const store = makeStore('address');
  const address = 'address';
  const currentTime = 5n;
  const { brand: externalBrand } = makeIssuerKit('external');
  const empty = AmountMath.makeEmpty(externalBrand);

  const bld10 = AmountMath.make(externalBrand, 10n);
  const bld20 = AmountMath.make(externalBrand, 20n);
  const bld40 = AmountMath.make(externalBrand, 40n);

  const elem1 = makeAttestationElem(
    address,
    bld10,
    10n,
    makeHandle('attestation'),
  );

  const elem2 = makeAttestationElem(
    address,
    bld20,
    10n,
    makeHandle('attestation'),
  );

  const elem3 = makeAttestationElem(
    address,
    bld40,
    10n,
    makeHandle('attestation'),
  );

  store.init(address, [elem1, elem2, elem3]);

  const result = unlienExpiredAmounts(store, empty, address, currentTime);
  t.true(
    AmountMath.isEqual(
      result,
      AmountMath.add(AmountMath.add(bld10, bld20), bld40),
    ),
  );
  t.deepEqual(store.get(address), [elem1, elem2, elem3]);
});

test(`store has address with one expired`, async t => {
  /** @type {Store<Address,Array<ExpiringAttElem>>} */
  const store = makeStore('address');
  const address = 'address';
  const currentTime = 5n;
  const { brand: externalBrand } = makeIssuerKit('external');
  const empty = AmountMath.makeEmpty(externalBrand);

  const bld10 = AmountMath.make(externalBrand, 10n);
  const bld20 = AmountMath.make(externalBrand, 20n);
  const bld40 = AmountMath.make(externalBrand, 40n);

  const elem1 = makeAttestationElem(
    address,
    bld10,
    1n,
    makeHandle('attestation'),
  );

  const elem2 = makeAttestationElem(
    address,
    bld20,
    10n,
    makeHandle('attestation'),
  );

  const elem3 = makeAttestationElem(
    address,
    bld40,
    10n,
    makeHandle('attestation'),
  );

  store.init(address, [elem1, elem2, elem3]);

  const result = unlienExpiredAmounts(store, empty, address, currentTime);
  t.true(AmountMath.isEqual(result, AmountMath.add(bld20, bld40)));
  t.deepEqual(store.get(address), [elem2, elem3]);
});
