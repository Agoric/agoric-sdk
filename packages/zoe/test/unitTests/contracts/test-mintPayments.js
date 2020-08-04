import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';

import { E } from '@agoric/eventual-send';
import makeIssuerKit from '@agoric/ertp';
import fakeVatAdmin from './fakeVatAdmin';

// noinspection ES6PreferShortImport
import { makeZoe } from '../../../src/zoeService/zoe';

const mintPaymentsRoot = `${__dirname}/../../../src/contracts/mintPayments`;

test('zoe - mint payments', async t => {
  t.plan(2);
  try {
    const zoe = makeZoe(fakeVatAdmin);

    const makeAlice = () => {
      return {
        installCode: async () => {
          // pack the contract
          const bundle = await bundleSource(mintPaymentsRoot);
          // install the contract
          const installationP = E(zoe).install(bundle);
          return installationP;
        },
        makeInstance: async installation => {
          const adminP = zoe.makeInstance(installation);
          return adminP;
        },
      };
    };

    const makeBob = installation => {
      return {
        offer: async untrustedInvitation => {
          const invitationIssuer = E(zoe).getInvitationIssuer();
          const invitation = E(invitationIssuer).claim(untrustedInvitation);

          const {
            value: [invitationValue],
          } = await E(invitationIssuer).getAmountOf(invitation);

          t.equals(
            invitationValue.installation,
            installation,
            'installation is mintPayment',
          );

          const { instance } = invitationValue;

          const seat = await E(zoe).offer(invitation);

          const paymentP = E(seat).getPayout('Token');

          // Let's get the tokenIssuer from the contract so we can evaluate
          // what we get as our payout
          const publicFacet = await E(zoe).getPublicFacet(instance);
          const tokenIssuer = await E(publicFacet).getTokenIssuer();
          const amountMath = await E(tokenIssuer).getAmountMath();

          const tokens1000 = await E(amountMath).make(1000);
          const tokenPayoutAmount = await E(tokenIssuer).getAmountOf(paymentP);

          // Bob got 1000 tokens
          t.deepEquals(tokenPayoutAmount, tokens1000);
        },
      };
    };

    // Setup Alice
    const alice = await makeAlice();
    const installation = await alice.installCode();
    const { creatorFacet } = await E(zoe).makeInstance(installation);
    const invitation = E(creatorFacet).makeInvitation(1000);

    // Setup Bob
    const bob = makeBob(installation);
    await bob.offer(invitation);
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  }
});

test('zoe - mint payments with unrelated give and want', async t => {
  t.plan(3);
  try {
    const zoe = makeZoe(fakeVatAdmin);
    // Pack the contract.
    const bundle = await bundleSource(mintPaymentsRoot);
    const installationHandle = await E(zoe).install(bundle);
    const inviteIssuer = await E(zoe).getInviteIssuer();

    const moolaBundle = makeIssuerKit('moola');
    const simoleanBundle = makeIssuerKit('simolean');

    // Alice creates a contract instance
    const issuerKeywordRecord = harden({
      Asset: moolaBundle.issuer,
      Price: simoleanBundle.issuer,
    });
    const {
      instanceRecord: { publicAPI },
    } = await E(zoe).makeInstance(installationHandle, issuerKeywordRecord);

    // Bob wants to get 1000 tokens so he gets an invite and makes an
    // offer
    const invite = await E(publicAPI).makeInvite();
    t.ok(await E(inviteIssuer).isLive(invite), `valid invite`);
    const proposal = harden({
      give: { Asset: moolaBundle.amountMath.make(10) },
      want: { Price: simoleanBundle.amountMath.make(100) },
    });
    const paymentKeywordRecord = harden({
      Asset: moolaBundle.mint.mintPayment(moolaBundle.amountMath.make(10)),
    });
    const { payout: payoutP } = await E(zoe).offer(
      invite,
      proposal,
      paymentKeywordRecord,
    );

    // Bob's payout promise resolves
    const bobPayout = await payoutP;
    const bobTokenPayout = await bobPayout.Token;
    const bobMoolaPayout = await bobPayout.Asset;

    // Let's get the tokenIssuer from the contract so we can evaluate
    // what we get as our payout
    const tokenIssuer = await E(publicAPI).getTokenIssuer();
    const tokenAmountMath = await E(tokenIssuer).getAmountMath();

    const tokens1000 = await E(tokenAmountMath).make(1000);
    const tokenPayoutAmount = await E(tokenIssuer).getAmountOf(bobTokenPayout);

    const moola10 = moolaBundle.amountMath.make(10);
    const moolaPayoutAmount = await moolaBundle.issuer.getAmountOf(
      bobMoolaPayout,
    );

    // Bob got 1000 tokens
    t.deepEquals(tokenPayoutAmount, tokens1000, `bobTokenPayout`);
    t.deepEquals(moolaPayoutAmount, moola10, `bobMoolaPayout`);
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  }
});
