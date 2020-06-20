import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';

import { E } from '@agoric/eventual-send';
import harden from '@agoric/harden';
import produceIssuer from '@agoric/ertp';

import { makeGetInstanceHandle } from '../../../src/clientSupport';
import { makeZoe } from '../../../src/zoe';

const mintPaymentsRoot = `${__dirname}/../../../src/contracts/mintPayments`;

test('zoe - mint payments', async t => {
  t.plan(2);
  try {
    const zoe = makeZoe();
    // Pack the contract.
    const bundle = await bundleSource(mintPaymentsRoot);
    const installationHandle = await E(zoe).install(bundle);
    const inviteIssuer = await E(zoe).getInviteIssuer();
    const getInstanceHandle = makeGetInstanceHandle(inviteIssuer);

    // Alice creates a contract instance
    const adminInvite = await E(zoe).makeInstance(installationHandle);
    const instanceHandle = await getInstanceHandle(adminInvite);

    // Bob wants to get 1000 tokens so he gets an invite and makes an
    // offer
    const { publicAPI } = await E(zoe).getInstanceRecord(instanceHandle);
    const invite = await E(publicAPI).makeInvite();
    t.ok(await E(inviteIssuer).isLive(invite), `valid invite`);
    const { payout: payoutP } = await E(zoe).offer(invite);

    // Bob's payout promise resolves
    const bobPayout = await payoutP;
    const bobTokenPayout = await bobPayout.Token;

    // Let's get the tokenIssuer from the contract so we can evaluate
    // what we get as our payout
    const tokenIssuer = await E(publicAPI).getTokenIssuer();
    const amountMath = await E(tokenIssuer).getAmountMath();

    const tokens1000 = await E(amountMath).make(1000);
    const tokenPayoutAmount = await E(tokenIssuer).getAmountOf(bobTokenPayout);

    // Bob got 1000 tokens
    t.deepEquals(tokenPayoutAmount, tokens1000);
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  }
});

test('zoe - mint payments with unrelated give and want', async t => {
  t.plan(3);
  try {
    const zoe = makeZoe();
    // Pack the contract.
    const bundle = await bundleSource(mintPaymentsRoot);
    const installationHandle = await E(zoe).install(bundle);
    const inviteIssuer = await E(zoe).getInviteIssuer();
    const getInstanceHandle = makeGetInstanceHandle(inviteIssuer);

    const moolaBundle = produceIssuer('moola');
    const simoleanBundle = produceIssuer('simolean');

    // Alice creates a contract instance
    const issuerKeywordRecord = harden({
      Asset: moolaBundle.issuer,
      Price: simoleanBundle.issuer,
    });
    const adminInvite = await E(zoe).makeInstance(
      installationHandle,
      issuerKeywordRecord,
    );
    const instanceHandle = await getInstanceHandle(adminInvite);

    // Bob wants to get 1000 tokens so he gets an invite and makes an
    // offer
    const { publicAPI } = await E(zoe).getInstanceRecord(instanceHandle);
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
