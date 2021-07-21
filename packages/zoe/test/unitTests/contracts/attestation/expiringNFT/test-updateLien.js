// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import { makeScalarMap } from '@agoric/store';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';

import { updateLien } from '../../../../../src/contracts/attestation/expiring/updateLien';
import { makeAttestationElem } from '../../../../../src/contracts/attestation/expiring/expiringHelpers';
import { makeHandle } from '../../../../../src/makeHandle';

test(`store doesn't have address`, async t => {
  /** @type {StoreMap<Address,Array<ExpiringAttElem>>} */
  const store = makeScalarMap('address');

  // @ts-ignore AttestationElem mocked for test
  const newAttestationElem = makeAttestationElem('address');

  t.throws(() => updateLien(store, newAttestationElem), {
    message: 'No previous lien was found for address "address"',
  });
});

test(`no old records`, async t => {
  /** @type {StoreMap<Address,Array<ExpiringAttElem>>} */
  const store = makeScalarMap('address');

  const address = 'address';

  store.init(address, []);

  const { brand: externalBrand } = makeIssuerKit('external');
  const amountLiened = AmountMath.make(externalBrand, 10n);

  const newAttestationElem = makeAttestationElem(
    address,
    amountLiened,
    1n,
    makeHandle('attestation'),
  );

  t.throws(() => updateLien(store, newAttestationElem), {
    message: /No previous lien was found for address/,
  });
});

test(`old records don't match`, async t => {
  /** @type {StoreMap<Address,Array<ExpiringAttElem>>} */
  const store = makeScalarMap('address');

  const address = 'address';
  const handle = makeHandle('attestation');
  const { brand: externalBrand } = makeIssuerKit('external');
  const amountLiened = AmountMath.make(externalBrand, 10n);
  const oldAttestation = makeAttestationElem(address, amountLiened, 1n, handle);

  store.init(address, [oldAttestation]);

  const newAttestationElem = makeAttestationElem(
    address,
    amountLiened,
    5n,
    makeHandle('attestation'),
  );

  t.throws(() => updateLien(store, newAttestationElem), {
    message: /No previous lien was found for address/,
  });
});

test(`happy path`, async t => {
  /** @type {StoreMap<Address,Array<ExpiringAttElem>>} */
  const store = makeScalarMap('address');

  const address = 'address';
  const handle = makeHandle('attestation');
  const { brand: externalBrand } = makeIssuerKit('external');
  const amountLiened = AmountMath.make(externalBrand, 10n);

  const oldAttestation1 = makeAttestationElem(
    address,
    amountLiened,
    1n,
    handle,
  );
  const oldAttestation2 = makeAttestationElem(
    address,
    amountLiened,
    1n,
    makeHandle('attestation'),
  );

  store.init(address, [oldAttestation1, oldAttestation2]);

  const newAttestationElem = makeAttestationElem(
    address,
    amountLiened,
    5n,
    handle,
  );

  updateLien(store, newAttestationElem);

  // old record is subtracted
  // new attestation is added
  t.deepEqual(store.get(address), [oldAttestation2, newAttestationElem]);
});
