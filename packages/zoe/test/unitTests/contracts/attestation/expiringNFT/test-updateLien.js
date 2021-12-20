// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { makeScalarMapStore } from '@agoric/store';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';

import { updateLien } from '../../../../../src/contracts/attestation/expiring/updateLien.js';
import { makeAttestationElem } from '../../../../../src/contracts/attestation/expiring/expiringHelpers.js';
import { makeHandle } from '../../../../../src/makeHandle.js';

test(`store doesn't have address`, async t => {
  /** @type {MapStore<Address,Array<ExpiringAttElem>>} */
  const store = makeScalarMapStore('address');

  // @ts-ignore AttestationElem mocked for test
  const newAttestationElem = makeAttestationElem('address');

  t.throws(() => updateLien(store, newAttestationElem), {
    message: 'No previous lien was found for address "address"',
  });
});

test(`no old records`, async t => {
  /** @type {MapStore<Address,Array<ExpiringAttElem>>} */
  const store = makeScalarMapStore('address');

  const address = 'address';

  store.init(address, []);

  const { brand: externalBrand } = makeIssuerKit('external');
  const amountLiened = AmountMath.make(externalBrand, 10n);

  const newAttestationElem = makeAttestationElem(
    address,
    amountLiened,
    1n,
    makeHandle('Attestation'),
  );

  t.throws(() => updateLien(store, newAttestationElem), {
    message: /No previous lien was found for address/,
  });
});

test(`old records don't match`, async t => {
  /** @type {MapStore<Address,Array<ExpiringAttElem>>} */
  const store = makeScalarMapStore('address');

  const address = 'address';
  const handle = makeHandle('Attestation');
  const { brand: externalBrand } = makeIssuerKit('external');
  const amountLiened = AmountMath.make(externalBrand, 10n);
  const oldAttestation = makeAttestationElem(address, amountLiened, 1n, handle);

  store.init(address, [oldAttestation]);

  const newAttestationElem = makeAttestationElem(
    address,
    amountLiened,
    5n,
    makeHandle('Attestation'),
  );

  t.throws(() => updateLien(store, newAttestationElem), {
    message: /No previous lien was found for address/,
  });
});

test(`happy path`, async t => {
  /** @type {MapStore<Address,Array<ExpiringAttElem>>} */
  const store = makeScalarMapStore('address');

  const address = 'address';
  const handle = makeHandle('Attestation');
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
    makeHandle('Attestation'),
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
