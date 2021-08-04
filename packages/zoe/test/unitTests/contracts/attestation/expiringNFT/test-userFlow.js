// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { E } from '@agoric/eventual-send';

import { setupZCFTest } from '../../../zcf/setupZcfTest.js';

import { setupAttestation } from '../../../../../src/contracts/attestation/expiring/expiringNFT.js';

const makeDoExtendExpiration = (zoe, issuer, makeExtendAttInvitation) => async (
  attestation,
  newExpiration,
) => {
  const invitation = makeExtendAttInvitation(newExpiration);
  const attestationAmount = await E(issuer).getAmountOf(attestation);
  const proposal = harden({ give: { Attestation: attestationAmount } });
  const payments = harden({ Attestation: attestation });
  const userSeat = E(zoe).offer(invitation, proposal, payments);
  const extendedAttestation = E(userSeat).getPayout('Attestation');
  return harden({
    attestation: extendedAttestation,
    userSeat,
  });
};

const makeTestAttestationAmount = (t, issuer, brand, address) => async (
  attestation,
  amountLiened,
  expiration,
  handle,
) => {
  const attestationAmount = await E(issuer).getAmountOf(attestation);
  const attestationHandle = attestationAmount.value[0].handle;
  const expectedHandle = handle !== undefined ? handle : attestationHandle;

  t.deepEqual(attestationAmount.value, [
    {
      address,
      amountLiened,
      expiration,
      handle: expectedHandle,
    },
  ]);
  t.is(attestationAmount.brand, brand);
  return attestationHandle;
};

const makeTestLienAmount = (t, getLienAmount, address) => (
  currentTime,
  expectedLien,
) => {
  t.deepEqual(getLienAmount(address, currentTime), expectedLien);
};

test(`typical flow`, async t => {
  const attestationTokenName = 'Token';
  const { brand: externalBrand } = makeIssuerKit('external');
  const empty = AmountMath.makeEmpty(externalBrand);

  const { zoe, zcf } = await setupZCFTest();

  const address = 'myaddress';

  const {
    disallowExtensions,
    addExpiringLien,
    getLienAmount,
    makeExtendAttInvitation,
    getIssuer,
    getBrand,
  } = await setupAttestation(attestationTokenName, empty, zcf);

  const attestationIssuer = getIssuer();
  const attestationBrand = getBrand();

  const testAttestationAmount = makeTestAttestationAmount(
    t,
    attestationIssuer,
    attestationBrand,
    address,
  );
  const testLienAmount = makeTestLienAmount(t, getLienAmount, address);

  const doExtendExpiration = makeDoExtendExpiration(
    zoe,
    attestationIssuer,
    makeExtendAttInvitation,
  );

  let currentTime = 0n;

  // At 0n, the lien amount.value is 0n
  testLienAmount(currentTime, AmountMath.makeEmpty(externalBrand));

  // Add a lien of 100n that expires at 1n
  const amountToLien = AmountMath.make(externalBrand, 100n);
  const expiration = 1n;
  const attestation = await addExpiringLien(address, amountToLien, expiration);

  // At 0n (still), the lien amount.value is 100n
  testLienAmount(currentTime, amountToLien);

  // The attestation is for 100n and expires at 1n
  const handle = await testAttestationAmount(
    attestation,
    amountToLien,
    expiration,
  );

  const newExpiration = 2n;

  // Extend the Expiration to 2n
  const { attestation: extendedAttestation } = await doExtendExpiration(
    attestation,
    newExpiration,
  );

  // The extendedAttestation should have the same amountLiened and the
  // same handle, but it should have the new expiration
  await testAttestationAmount(
    extendedAttestation,
    amountToLien,
    newExpiration,
    handle,
  );

  // At 0n (still), the amountLiened is still 100n
  testLienAmount(currentTime, amountToLien);

  // Now let's disallow extensions and then try extending
  disallowExtensions(address);

  const newExpiration2 = 4n;

  const { attestation: refundAttestation, userSeat } = await doExtendExpiration(
    extendedAttestation,
    newExpiration2,
  );

  await t.throwsAsync(() => E(userSeat).getOfferResult(), {
    message: `The address "myaddress" cannot extend the expiration for attestations`,
  });

  // refundAttestation has the same value as the extendedAttestation.
  // It does not have the expiration of "newExpiration2"
  testAttestationAmount(refundAttestation, amountToLien, newExpiration, handle);

  // At 0n (still), the amountLiened is still 100n
  testLienAmount(currentTime, amountToLien);

  // Finally, time passes and it is 5n.
  // The attestation has expired at this point (1n attestation compared to 5n currentTime)
  currentTime = 5n;

  testLienAmount(currentTime, AmountMath.makeEmpty(externalBrand));

  // Test that the address can extend attestation expirations
  // again, after the "disallowExtensions" has been lifted due to the
  // amountLiened reaching 0n.
  const amountToLien2 = AmountMath.make(externalBrand, 250n);

  const expiration10 = 10n;
  const attestationAfterDisallow = await addExpiringLien(
    address,
    amountToLien2,
    expiration10,
  );

  const afterDisallowHandle = await testAttestationAmount(
    attestationAfterDisallow,
    amountToLien2,
    expiration10,
  );

  // At 5n (still), the amountLiened is 250n
  testLienAmount(currentTime, amountToLien2);

  const newExpiration20 = 20n;
  const { attestation: extendedAfterDisallow } = await doExtendExpiration(
    attestationAfterDisallow,
    newExpiration20,
  );

  await testAttestationAmount(
    extendedAfterDisallow,
    amountToLien2,
    newExpiration20,
    afterDisallowHandle,
  );
});
