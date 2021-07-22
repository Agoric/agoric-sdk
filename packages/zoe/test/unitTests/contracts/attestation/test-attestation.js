// @ts-check

/* global __dirname */

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import { makeIssuerKit, AssetKind, AmountMath } from '@agoric/ertp';
import { Far } from '@agoric/marshal';

import bundleSource from '@agoric/bundle-source';
import { E } from '@agoric/eventual-send';

import { makeZoe } from '../../../../src/zoeService/zoe';
import fakeVatAdmin from '../../../../tools/fakeVatAdmin';

const attestationRoot = `${__dirname}/../../../../src/contracts/attestation/attestation`;

test('attestation contract basic test', async t => {
  const bundle = await bundleSource(attestationRoot);

  const zoe = makeZoe(fakeVatAdmin);
  const installation = await E(zoe).install(bundle);

  const bldIssuerKit = makeIssuerKit('BLD', AssetKind.NAT, {
    decimalPlaces: 6,
  });
  const uBrand = bldIssuerKit.brand;
  const uIssuer = bldIssuerKit.issuer;

  const issuerKeywordRecord = harden({ Underlying: uIssuer });

  const mockCosmos = Far(
    'cosmos',
    /** @type {{getAccountState: (address: Address) => {total: Amount,
     * bonded: Amount, locked: Amount, currentTime: Timestamp}}} */ ({
      getAccountState: () => {
        return harden({
          total: AmountMath.make(uBrand, 500n),
          bonded: AmountMath.make(uBrand, 200n),
          locked: AmountMath.make(uBrand, 10n),
          currentTime: 10n,
        });
      },
    }),
  );

  const customTerms = harden({
    authority: mockCosmos,
    expiringAttName: 'BldAttGov',
    returnableAttName: 'BldAttLoc',
  });

  const { publicFacet, creatorFacet } = await E(zoe).startInstance(
    installation,
    issuerKeywordRecord,
    customTerms,
  );

  const brands = await E(publicFacet).getBrands();
  const issuers = await E(publicFacet).getIssuers();

  const address1 = 'address1';

  /** @type {AttMaker} */
  const attMaker = await E(creatorFacet).getAttMaker(address1);

  // Try to make a lien greater than the total
  const largeAmount = AmountMath.make(uBrand, 1000n);
  const longExpiration = 100n;
  const shortExpiration = 15n;
  await t.throwsAsync(
    () => E(attMaker).makeAttestations(largeAmount, shortExpiration),
    {
      message:
        'Only {"brand":"[Alleged: BLD brand]","value":"[500n]"} was unliened, but an attestation was attempted for {"brand":"[Alleged: BLD brand]","value":"[1000n]"}',
    },
  );

  // Try to make a lien with an already expired expiration
  const amount50 = AmountMath.make(uBrand, 50n);
  const expiredExpiration = 1n;
  await t.throwsAsync(
    () => E(attMaker).makeAttestations(amount50, expiredExpiration),
    { message: 'Expiration "[1n]" must be after the current time "[10n]"' },
  );

  // check that no lien was successful so far
  const liened = await E(creatorFacet).getLiened(harden([address1]), 10n);
  t.deepEqual(liened, [AmountMath.makeEmpty(uBrand)]);

  // Make a normal lien
  const { returnable: returnable1, expiring: expiring1 } = await E(
    attMaker,
  ).makeAttestations(amount50, shortExpiration);

  t.deepEqual(
    await E(issuers.returnable).getAmountOf(returnable1),
    AmountMath.make(brands.returnable, [
      {
        address: 'address1',
        amountLiened: amount50,
      },
    ]),
  );
  const expiring1Amount = await E(issuers.expiring).getAmountOf(expiring1);
  t.deepEqual(
    expiring1Amount,
    AmountMath.make(brands.expiring, [
      {
        address: 'address1',
        amountLiened: amount50,
        expiration: shortExpiration,
        handle: expiring1Amount.value[0].handle,
      },
    ]),
  );

  const liened2 = await E(creatorFacet).getLiened(harden([address1]), 10n);
  t.deepEqual(liened2, [amount50]);

  // Make another normal lien

  const amount25 = AmountMath.make(uBrand, 25n);
  const { returnable: returnable2, expiring: expiring2 } = await E(
    attMaker,
  ).makeAttestations(amount25, longExpiration);

  t.deepEqual(
    await E(issuers.returnable).getAmountOf(returnable2),
    AmountMath.make(brands.returnable, [
      {
        address: 'address1',
        amountLiened: amount25,
      },
    ]),
  );
  const expiring2Amount = await E(issuers.expiring).getAmountOf(expiring2);
  t.deepEqual(
    expiring2Amount,
    AmountMath.make(brands.expiring, [
      {
        address: 'address1',
        amountLiened: amount25,
        expiration: longExpiration,
        handle: expiring2Amount.value[0].handle,
      },
    ]),
  );
  t.not(expiring1Amount.value[0].handle, expiring2Amount.value[0].handle);

  const liened3 = await E(creatorFacet).getLiened(harden([address1]), 10n);
  t.deepEqual(liened3, [AmountMath.add(amount50, amount25)]);

  const returnAttestation = async att => {
    const invitation = E(publicFacet).makeReturnAttInvitation();
    const attestationAmount = await E(issuers.returnable).getAmountOf(att);
    const proposal = harden({ give: { Attestation: attestationAmount } });
    const payments = harden({ Attestation: att });
    const userSeat = E(zoe).offer(invitation, proposal, payments);
    const payout = await E(userSeat).getPayouts();
    const amounts = await Promise.all(
      Object.values(payout).map(paymentP =>
        E(issuers.returnable).getAmountOf(paymentP),
      ),
    );
    t.true(
      amounts.every(amount => AmountMath.isEmpty(amount, brands.returnable)),
    );
    return userSeat;
  };

  // Return returnable1 for 50 bld
  await returnAttestation(returnable1);

  // Total liened amount should not change because there are
  // outstanding expiring attestations
  const liened4 = await E(creatorFacet).getLiened(harden([address1]), 10n);
  t.deepEqual(liened4, [AmountMath.add(amount50, amount25)]);

  // Move the currentTime forward so the shortExpiration attestation
  // expires (50 bld)
  const liened5 = await E(creatorFacet).getLiened(harden([address1]), 16n);
  t.deepEqual(liened5, [amount25]); // the amount50 lien expired, leaving 25

  // Move the currentTime forward so the longExpiration attestation
  // expires. This should not change the total liened because there is
  // an outstanding returnable attestation
  const liened6 = await E(creatorFacet).getLiened(harden([address1]), 101n);
  t.deepEqual(liened6, [amount25]);

  // Return the last returnable attestation for 25
  await returnAttestation(returnable2);

  // Now the liened Amount should be empty
  const liened7 = await E(creatorFacet).getLiened(harden([address1]), 101n);
  t.deepEqual(liened7, [AmountMath.makeEmpty(uBrand)]);
});

// TODO: test with various unexpected or strange values from
// E(cosmos).getAccountState(). Possibly better suited as a unit test
// with `assertPrerequisites`

// TODO: test slashed from the creatorFacet
// TODO: test extending the invitations from the creatorFacet
