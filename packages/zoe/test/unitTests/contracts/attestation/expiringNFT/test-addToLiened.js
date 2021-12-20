// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { makeLegacyMapStore, makeScalarMapStore } from '@agoric/store';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';

import { addToLiened } from '../../../../../src/contracts/attestation/expiring/expiringHelpers.js';
import { makeHandle } from '../../../../../src/makeHandle.js';

test('add for same address', async t => {
  /** @type {MapStore<Address,Array<ExpiringAttElem>>} */
  // Legacy because stored array is pushed onto
  const store = makeLegacyMapStore('address');

  const address = 'address1';
  const handle1 = makeHandle('Attestation');
  const handle2 = makeHandle('Attestation');

  const { brand } = makeIssuerKit('external');
  const amountLiened = AmountMath.make(brand, 0n);
  const expiration = 0n;
  const elem1 = {
    address,
    handle: handle1,
    amountLiened,
    expiration,
  };
  const elem2 = { address, handle: handle2, amountLiened, expiration };
  addToLiened(store, elem1);
  addToLiened(store, elem2);

  // reuse the same handle. This should not happen, but note that the
  // store does not do any checking of the handle's uniqueness
  addToLiened(store, elem1);

  t.deepEqual(store.get(address), [elem1, elem2, elem1]);
});

test('add for multiple addresses', async t => {
  /** @type {MapStore<Address,Array<ExpiringAttElem>>} */
  const store = makeScalarMapStore('address');
  const { brand } = makeIssuerKit('external');
  const amountLiened = AmountMath.make(brand, 0n);
  const expiration = 0n;
  const address1 = 'address1';
  const address2 = 'address2';
  const handle1 = makeHandle('Attestation');
  const handle2 = makeHandle('Attestation');
  const elem1 = {
    address: address1,
    handle: handle1,
    amountLiened,
    expiration,
  };
  const elem2 = {
    address: address2,
    handle: handle2,
    amountLiened,
    expiration,
  };
  addToLiened(store, elem1);
  addToLiened(store, elem2);

  t.deepEqual(store.get(address1), [elem1]);
  t.deepEqual(store.get(address2), [elem2]);
});
