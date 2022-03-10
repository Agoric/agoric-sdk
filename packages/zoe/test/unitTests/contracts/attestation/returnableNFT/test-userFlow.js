// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { E } from '@agoric/eventual-send';

import { setupZCFTest } from '../../../zcf/setupZcfTest.js';

import { setupAttestation } from '../../../../../src/contracts/attestation/returnable/returnableNFT.js';

const makeDoReturnAttestation =
  (zoe, issuer, makeReturnAttInvitation) => async attestation => {
    const invitation = makeReturnAttInvitation();
    const attestationAmount = await E(issuer).getAmountOf(attestation);
    const proposal = harden({ give: { Attestation: attestationAmount } });
    const payments = harden({ Attestation: attestation });
    const userSeat = E(zoe).offer(invitation, proposal, payments);
    const payout = await E(userSeat).getPayouts();
    const amounts = await Promise.all(
      Object.values(payout).map(paymentP => E(issuer).getAmountOf(paymentP)),
    );
    return harden({
      amounts,
      userSeat,
    });
  };

const makeTestAttestationAmount =
  (t, issuer, brand, address) => async (attestation, amountLiened) => {
    const attestationAmount = await E(issuer).getAmountOf(attestation);

    t.deepEqual(attestationAmount.value, [
      {
        address,
        amountLiened,
      },
    ]);
    t.is(attestationAmount.brand, brand);
  };

const makeTestLienAmount = (t, getLienAmount, address) => expectedLien => {
  t.deepEqual(getLienAmount(address), expectedLien);
};

test(`typical flow`, async t => {
  const attestationTokenName = 'Token';
  const { brand: externalBrand } = makeIssuerKit('external');
  const empty = AmountMath.makeEmpty(externalBrand);

  const { zoe, zcf } = await setupZCFTest();

  const address = 'myaddress';

  const {
    makeReturnAttInvitation,
    addReturnableLien,
    getLienAmount,
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

  const doReturnAttestation = makeDoReturnAttestation(
    zoe,
    attestationIssuer,
    makeReturnAttInvitation,
  );

  // LienAmount starts at 0n
  testLienAmount(AmountMath.makeEmpty(externalBrand));

  // Add a lien of 100n
  const amountToLien = AmountMath.make(externalBrand, 100n);
  const attestation = await addReturnableLien(address, amountToLien);

  // LienAmount is now 100n
  testLienAmount(amountToLien);

  // The attestation is for 100n
  await testAttestationAmount(attestation, amountToLien);

  // take out another expiration for 50n
  const amountToLien2 = AmountMath.make(externalBrand, 50n);
  const attestation2 = await addReturnableLien(address, amountToLien2);

  // LienAmount is now 150n
  testLienAmount(AmountMath.add(amountToLien, amountToLien2));

  // The attestation is for 50n
  await testAttestationAmount(attestation2, amountToLien2);

  // return the attestation for 50n

  const { amounts } = await doReturnAttestation(attestation2);
  t.true(amounts.every(amount => AmountMath.isEmpty(amount, attestationBrand)));

  // The attestation should have been deposited and used up
  await t.throwsAsync(() => E(attestationIssuer).getAmountOf(attestation2), {
    message: /was not a live payment/,
  });

  // The amountLiened has been reduced by 50n to 100n
  testLienAmount(amountToLien);

  // Return the original attestation
  await doReturnAttestation(attestation);

  testLienAmount(AmountMath.makeEmpty(externalBrand));
});
