// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import { makeStore } from '@agoric/store';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';

import { addToLiened } from '../../../../../src/contracts/attestation/expiring/expiringHelpers.js';
import { makeHandle } from '../../../../../src/makeHandle.js';

test('add for same address', async t => {
  /** @type {Store<Address,Array<ExpiringAttElem>>} */
  const store = makeStore('address');
  const address = 'address1';
  const handle1 = makeHandle('attestation');
  const handle2 = makeHandle('attestation');

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
  /** @type {Store<Address,Array<ExpiringAttElem>>} */
  const store = makeStore('address');
  const { brand } = makeIssuerKit('external');
  const amountLiened = AmountMath.make(brand, 0n);
  const expiration = 0n;
  const address1 = 'address1';
  const address2 = 'address2';
  const handle1 = makeHandle('attestation');
  const handle2 = makeHandle('attestation');
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
