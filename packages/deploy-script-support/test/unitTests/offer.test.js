// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import bundleSource from '@endo/bundle-source';
import { makeIssuerKit, AmountMath } from '@agoric/ertp';
import { resolve as importMetaResolve } from 'import-meta-resolve';
import { E } from '@endo/far';

import { makeOfferAndFindInvitationAmount } from '../../src/offer.js';

test('offer', async t => {
  const MOOLA_PURSE_PETNAME = 'moola purse';
  const USD_PURSE_PETNAME = 'usd purse';

  const moolaKit = makeIssuerKit('moola');
  const usdKit = makeIssuerKit('usd');
  const moolaPurse = moolaKit.issuer.makeEmptyPurse();
  const usdPurse = usdKit.issuer.makeEmptyPurse();

  moolaPurse.deposit(
    moolaKit.mint.mintPayment(AmountMath.make(moolaKit.brand, 5n)),
  );

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
  const zoe = makeZoeForTest();

  const bundleUrl = await importMetaResolve(
    '@agoric/zoe/src/contracts/automaticRefund.js',
    import.meta.url,
  );
  const bundlePath = new URL(bundleUrl).pathname;
  const bundle = await bundleSource(bundlePath);
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

  const { offer } = makeOfferAndFindInvitationAmount(
    walletAdmin,
    zoe,
    zoeInvitationPurse,
  );

  const offerConfig = harden({
    partialInvitationDetails: { description: 'getRefund' },
    proposal: {
      give: {
        Collateral: AmountMath.make(moolaKit.brand, 1n),
      },
      want: { Loan: AmountMath.make(usdKit.brand, 1n) },
    },
    paymentsWithPursePetnames: {
      Collateral: MOOLA_PURSE_PETNAME,
    },
    payoutPursePetnames: {
      Collateral: MOOLA_PURSE_PETNAME,
      Loan: USD_PURSE_PETNAME,
    },
  });

  const { seat, deposited, invitationDetails } = await offer(offerConfig);

  const offerResult = await E(seat).getOfferResult();
  t.is(offerResult, 'The offer was accepted');

  await deposited;

  t.deepEqual(
    await E(moolaPurse).getCurrentAmount(),
    AmountMath.make(moolaKit.brand, 5n),
  );

  t.is(invitationDetails.description, 'getRefund');
});
