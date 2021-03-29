/* global require */
// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import { makeZoe } from '@agoric/zoe';
import fakeVatAdmin from '@agoric/zoe/src/contractFacet/fakeVatAdmin';
import bundleSource from '@agoric/bundle-source';
import { makeIssuerKit, makeLocalAmountMath } from '@agoric/ertp';

import '../../exported';

import { E } from '@agoric/eventual-send';
import { makeOfferAndFindInvitationAmount } from '../../src/offer';

test('offer', async t => {
  const MOOLA_BRAND_PETNAME = 'moola';
  const USD_BRAND_PETNAME = 'usd';
  const MOOLA_PURSE_PETNAME = 'moola purse';
  const USD_PURSE_PETNAME = 'usd purse';

  const moolaKit = makeIssuerKit('moola');
  const usdKit = makeIssuerKit('usd');
  const moolaPurse = moolaKit.issuer.makeEmptyPurse();
  const usdPurse = usdKit.issuer.makeEmptyPurse();

  moolaPurse.deposit(moolaKit.mint.mintPayment(moolaKit.amountMath.make(5)));

  const walletAdmin = {
    getPurse: petname => {
      if (petname === MOOLA_PURSE_PETNAME) {
        return moolaPurse;
      }
      if (petname === USD_PURSE_PETNAME) {
        return usdPurse;
      }
      throw Error('not found');
    },
    saveOfferResult: () => {},
  };
  const zoe = makeZoe(fakeVatAdmin);

  const bundle = await bundleSource(
    require.resolve('@agoric/zoe/src/contracts/automaticRefund'),
  );
  const installation = E(zoe).install(bundle);

  const issuerKeywordRecord = harden({
    Collateral: moolaKit.issuer,
    Loan: usdKit.issuer,
  });
  const { creatorInvitation } = await E(zoe).startInstance(
    installation,
    issuerKeywordRecord,
  );

  const zoeInvitationIssuer = E(zoe).getInvitationIssuer();
  const zoeInvitationPurse = E(zoeInvitationIssuer).makeEmptyPurse();

  await E(zoeInvitationPurse).deposit(creatorInvitation);

  const invitationMath = await makeLocalAmountMath(zoeInvitationIssuer);

  const getLocalAmountMath = petname => {
    if (petname === MOOLA_BRAND_PETNAME) {
      return moolaKit.amountMath;
    }
    if (petname === USD_BRAND_PETNAME) {
      return usdKit.amountMath;
    }
    throw Error('not found');
  };

  const { offer } = makeOfferAndFindInvitationAmount(
    walletAdmin,
    zoe,
    zoeInvitationPurse,
    getLocalAmountMath,
    invitationMath,
  );

  const offerConfig = {
    partialInvitationDetails: { description: 'getRefund' },
    proposalWithBrandPetnames: {
      give: {
        Collateral: { brand: MOOLA_BRAND_PETNAME, value: 1 },
      },
      want: { Loan: { brand: USD_BRAND_PETNAME, value: 1 } },
    },
    paymentsWithPursePetnames: {
      Collateral: MOOLA_PURSE_PETNAME,
    },
    payoutPursePetnames: {
      Collateral: MOOLA_PURSE_PETNAME,
      Loan: USD_PURSE_PETNAME,
    },
  };

  const { seat, deposited, invitationDetails } = await offer(offerConfig);

  const offerResult = await E(seat).getOfferResult();
  t.is(offerResult, 'The offer was accepted');

  await deposited;

  t.deepEqual(
    await E(moolaPurse).getCurrentAmount(),
    moolaKit.amountMath.make(5),
  );

  t.is(invitationDetails.description, 'getRefund');
});
