/* global __dirname */
// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';
import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';

import { setup } from '../setupBasicMints';
import buildManualTimer from '../../../tools/manualTimer';
import { assertPayoutAmount } from '../../zoeTestHelpers';

const root = `${__dirname}/../../../src/contracts/otcDesk`;

const installCode = async zoe => {
  const bundle = await bundleSource(root);
  const installation = await E(zoe).install(bundle);
  return installation;
};

const installCoveredCall = async zoe => {
  const bundle = await bundleSource(
    `${__dirname}/../../../src/contracts/coveredCall`,
  );
  const installation = await E(zoe).install(bundle);
  return installation;
};

const makeAlice = async (
  t,
  zoe,
  installation,
  issuers,
  origPayments,
  coveredCallInstallation,
) => {
  let creatorFacet;
  const {
    moolaIssuer,
    simoleanIssuer,
    bucksIssuer,
    moola,
    simoleans,
    bucks,
  } = issuers;
  const { moolaPayment, simoleanPayment, bucksPayment } = origPayments;

  const simoleanPurse = await E(simoleanIssuer).makeEmptyPurse();
  return {
    installCode: async () => {},
    startInstance: async () => {
      ({ creatorFacet } = await E(zoe).startInstance(
        installation,
        undefined,
        harden({ coveredCallInstallation }),
      ));
    },
    addInventory: async () => {
      const invitation = await E(creatorFacet).makeAddInventoryInvitation({
        Moola: moolaIssuer,
        Simolean: simoleanIssuer,
        Buck: bucksIssuer,
      });
      const proposal = harden({
        give: {
          Moola: moola(10000),
          Simolean: simoleans(10000),
          Buck: bucks(10000),
        },
      });
      const payments = {
        Moola: moolaPayment,
        Simolean: simoleanPayment,
        Buck: bucksPayment,
      };

      const seat = await E(zoe).offer(invitation, proposal, payments);
      const offerResult = await E(seat).getOfferResult();
      t.is(offerResult, 'Inventory added');
    },
    makeQuoteForBob: async (userGiveQuote, userWantQuote, timer, deadline) => {
      const bobInvitation = await E(creatorFacet).makeQuote(
        userGiveQuote,
        userWantQuote,
        timer,
        deadline,
      );
      return bobInvitation;
    },
    removeInventory: async simoleanAmount => {
      const invitation = await E(creatorFacet).makeRemoveInventoryInvitation();
      const proposal = harden({ want: { Simolean: simoleanAmount } });
      const seat = await E(zoe).offer(invitation, proposal);
      const offerResult = await E(seat).getOfferResult();
      t.is(offerResult, 'Inventory removed');
      const simoleanPayout = await E(seat).getPayout('Simolean');
      const amountDeposited = await simoleanPurse.deposit(simoleanPayout);
      t.deepEqual(amountDeposited, simoleanAmount);
    },
  };
};

const makeBob = (
  t,
  zoe,
  installation,
  issuers,
  origPayments,
  coveredCallInstallation,
) => {
  const {
    moolaIssuer,
    simoleanIssuer,
    bucksIssuer,
    moola,
    simoleans,
    bucks,
  } = issuers;
  const { moolaPayment, simoleanPayment, bucksPayment } = origPayments;
  const moolaPurse = moolaIssuer.makeEmptyPurse();
  const simoleanPurse = simoleanIssuer.makeEmptyPurse();
  const bucksPurse = bucksIssuer.makeEmptyPurse();

  moolaPurse.deposit(moolaPayment);
  simoleanPurse.deposit(simoleanPayment);
  bucksPurse.deposit(bucksPayment);
  return Far('Bob', {
    offerOk: async untrustedInvitation => {
      const invitationIssuer = await E(zoe).getInvitationIssuer();
      const invitation = await invitationIssuer.claim(untrustedInvitation);
      const invitationValue = await E(zoe).getInvitationDetails(invitation);
      t.is(
        invitationValue.installation,
        coveredCallInstallation,
        'installation is coveredCall',
      );
      t.deepEqual(
        invitationValue.underlyingAssets,
        { Moola: moola(3) },
        `bob will get 3 moola`,
      );
      t.deepEqual(
        invitationValue.strikePrice,
        { Simolean: simoleans(4) },
        `bob must give 4 simoleans`,
      );

      // Bob can use whatever keywords he wants
      const proposal = harden({
        give: { Whatever1: simoleans(4) },
        want: { Whatever2: moola(3) },
        exit: { onDemand: null },
      });
      const simoleanPayment1 = simoleanPurse.withdraw(simoleans(4));
      const payments = { Whatever1: simoleanPayment1 };

      const seat = await zoe.offer(invitation, proposal, payments);

      t.is(
        await E(seat).getOfferResult(),
        'The option was exercised. Please collect the assets in your payout.',
      );

      await assertPayoutAmount(
        t,
        moolaIssuer,
        E(seat).getPayout('Whatever2'),
        moola(3),
        'bob moola',
      );
      await assertPayoutAmount(
        t,
        simoleanIssuer,
        E(seat).getPayout('Whatever1'),
        simoleans(0),
        'bob simolean',
      );
    },
    offerExpired: async untrustedInvitation => {
      const invitationIssuer = await E(zoe).getInvitationIssuer();
      const invitation = await invitationIssuer.claim(untrustedInvitation);
      const invitationValue = await E(zoe).getInvitationDetails(invitation);
      t.is(
        invitationValue.installation,
        coveredCallInstallation,
        'installation is coveredCall',
      );
      t.deepEqual(
        invitationValue.underlyingAssets,
        { Moola: moola(3) },
        `bob will get 3 moola`,
      );
      t.deepEqual(
        invitationValue.strikePrice,
        { Simolean: simoleans(4) },
        `bob must give 4 simoleans`,
      );

      // Bob can use whatever keywords he wants
      const proposal = harden({
        give: { Whatever1: simoleans(4) },
        want: { Whatever2: moola(3) },
        exit: { onDemand: null },
      });
      const simoleanPayment1 = simoleanPurse.withdraw(simoleans(4));
      const payments = { Whatever1: simoleanPayment1 };

      const offerExpiredSeat = await zoe.offer(invitation, proposal, payments);

      await t.throwsAsync(() => E(offerExpiredSeat).getOfferResult(), {
        message: 'The covered call option is expired.',
      });

      await assertPayoutAmount(
        t,
        moolaIssuer,
        E(offerExpiredSeat).getPayout('Whatever2'),
        moola(0n),
        'bob moola',
      );
      await assertPayoutAmount(
        t,
        simoleanIssuer,
        E(offerExpiredSeat).getPayout('Whatever1'),
        simoleans(4),
        'bob simolean',
      );
    },
    offerWantTooMuch: async untrustedInvitation => {
      const invitationIssuer = await E(zoe).getInvitationIssuer();
      const invitation = await invitationIssuer.claim(untrustedInvitation);
      const invitationValue = await E(zoe).getInvitationDetails(invitation);
      t.is(
        invitationValue.installation,
        coveredCallInstallation,
        'installation is coveredCall',
      );
      t.deepEqual(
        invitationValue.underlyingAssets,
        { Simolean: simoleans(15) },
        `bob will get 15 simoleans`,
      );
      t.deepEqual(
        invitationValue.strikePrice,
        { Buck: bucks(500), Moola: moola(35) },
        `bob must give 500 bucks and 35 moola`,
      );

      // Bob can use whatever keywords he wants
      const proposal = harden({
        give: { Whatever1: bucks(500), Whatever2: moola(35) },
        want: { Whatever3: simoleans(16) },
        exit: { onDemand: null },
      });
      const bucks500Payment = bucksPurse.withdraw(bucks(500));
      const moola35Payment = moolaPurse.withdraw(moola(35));
      const payments = {
        Whatever1: bucks500Payment,
        Whatever2: moola35Payment,
      };

      const seat = await zoe.offer(invitation, proposal, payments);

      await t.throwsAsync(() => E(seat).getOfferResult(), {
        message: 'The reallocation failed to conserve rights.',
      });

      await assertPayoutAmount(
        t,
        bucksIssuer,
        E(seat).getPayout('Whatever1'),
        bucks(500),
        'bob bucks',
      );
      await assertPayoutAmount(
        t,
        moolaIssuer,
        E(seat).getPayout('Whatever2'),
        moola(35),
        'bob moola',
      );
      await assertPayoutAmount(
        t,
        simoleanIssuer,
        E(seat).getPayout('Whatever3'),
        simoleans(0),
        'bob simolean',
      );
    },
    offerNotCovered: async untrustedInvitation => {
      const invitationIssuer = await E(zoe).getInvitationIssuer();
      const invitation = await invitationIssuer.claim(untrustedInvitation);
      const invitationValue = await E(zoe).getInvitationDetails(invitation);
      t.is(
        invitationValue.installation,
        coveredCallInstallation,
        'installation is coveredCall',
      );
      t.deepEqual(
        invitationValue.underlyingAssets,
        { Simolean: simoleans(15) },
        `bob will get 15 simoleans`,
      );
      t.deepEqual(
        invitationValue.strikePrice,
        { Buck: bucks(500), Moola: moola(35) },
        `bob must give 500 bucks and 35 moola`,
      );

      const publicFacet = await E(zoe).getPublicFacet(invitationValue.instance);

      t.is(await E(publicFacet).getRating(), '100%');

      // Bob can use whatever keywords he wants
      const proposal = harden({
        give: { Whatever1: bucks(500), Whatever2: moola(35) },
        want: { Whatever3: simoleans(15) },
        exit: { onDemand: null },
      });
      const bucks500Payment = bucksPurse.withdraw(bucks(500));
      const moola35Payment = moolaPurse.withdraw(moola(35));
      const payments = {
        Whatever1: bucks500Payment,
        Whatever2: moola35Payment,
      };

      const seat = await zoe.offer(invitation, proposal, payments);

      await t.throwsAsync(() => E(seat).getOfferResult(), {
        message:
          'The market maker did not have the inventory they promised. Their rating has been adjusted accordingly',
      });

      t.is(await E(publicFacet).getRating(), '66%');

      await assertPayoutAmount(
        t,
        bucksIssuer,
        E(seat).getPayout('Whatever1'),
        bucks(500),
        'bob bucks',
      );
      await assertPayoutAmount(
        t,
        moolaIssuer,
        E(seat).getPayout('Whatever2'),
        moola(35),
        'bob moola',
      );
      await assertPayoutAmount(
        t,
        simoleanIssuer,
        E(seat).getPayout('Whatever3'),
        simoleans(0),
        'bob simolean',
      );
    },
  });
};

const {
  moolaKit,
  simoleanKit,
  bucksKit,
  moola,
  simoleans,
  moolaIssuer,
  simoleanIssuer,
  bucksIssuer,
  bucks,
  zoe,
} = setup();

const issuers = {
  moolaIssuer,
  simoleanIssuer,
  bucksIssuer,
  moola,
  simoleans,
  bucks,
};

const makeInitialPayments = (moolaValue, simoleanValue, bucksValue) => ({
  moolaPayment: moolaKit.mint.mintPayment(moola(moolaValue)),
  simoleanPayment: simoleanKit.mint.mintPayment(simoleans(simoleanValue)),
  bucksPayment: bucksKit.mint.mintPayment(bucks(bucksValue)),
});

test('zoe - otcDesk - offerOk', async t => {
  const timer = buildManualTimer(console.log);
  const installation = await installCode(zoe);
  const coveredCallInstallation = await installCoveredCall(zoe);

  // Make Alice
  const alicePayments = makeInitialPayments(10000, 10000, 10000);
  const alice = await makeAlice(
    t,
    zoe,
    installation,
    issuers,
    alicePayments,
    coveredCallInstallation,
  );

  // Make Bob
  const bobPayments = makeInitialPayments(10000, 10000, 10000);
  const bob = await makeBob(
    t,
    zoe,
    installation,
    issuers,
    bobPayments,
    coveredCallInstallation,
  );

  await alice.startInstance();

  // Alice wants to make a custom quote for Bob. If Bob gives 4
  // simoleans, he can get 3 moola.

  // First, Alice must add enough inventory. If the contract hasn't
  // been told of an issuer yet, she must add the issuer to the
  // contract in the call to make the invitation
  await alice.addInventory();

  // Alice makes a custom quote for Bob
  const invitation1 = await alice.makeQuoteForBob(
    { Simolean: simoleans(4) },
    { Moola: moola(3) },
    timer,
    1n,
  );

  await bob.offerOk(invitation1);
  await alice.removeInventory(simoleans(2));
});

test('zoe - otcDesk - offerExpired', async t => {
  const timer = buildManualTimer(console.log);
  const installation = await installCode(zoe);
  const coveredCallInstallation = await installCoveredCall(zoe);

  // Make Alice
  const alicePayments = makeInitialPayments(10000, 10000, 10000);
  const alice = await makeAlice(
    t,
    zoe,
    installation,
    issuers,
    alicePayments,
    coveredCallInstallation,
  );

  // Make Bob
  const bobPayments = makeInitialPayments(10000, 10000, 10000);
  const bob = await makeBob(
    t,
    zoe,
    installation,
    issuers,
    bobPayments,
    coveredCallInstallation,
  );

  await alice.startInstance();

  // Alice wants to make a custom quote for Bob. If Bob gives 4
  // simoleans, he can get 3 moola.

  // First, Alice must add enough inventory. If the contract hasn't
  // been told of an issuer yet, she must add the issuer to the
  // contract in the call to make the invitation
  await alice.addInventory();

  // Alice makes a custom quote for Bob
  const invitation2 = await alice.makeQuoteForBob(
    { Simolean: simoleans(4) },
    { Moola: moola(3) },
    timer,
    1n,
  );
  timer.tick();

  // Bob tries to offer but the quote is expired.
  await bob.offerExpired(invitation2);
});

test('zoe - otcDesk - offerWantTooMuch', async t => {
  const timer = buildManualTimer(console.log);
  const installation = await installCode(zoe);
  const coveredCallInstallation = await installCoveredCall(zoe);

  // Make Alice
  const alicePayments = makeInitialPayments(10000, 10000, 10000);
  const alice = await makeAlice(
    t,
    zoe,
    installation,
    issuers,
    alicePayments,
    coveredCallInstallation,
  );

  // Make Bob
  const bobPayments = makeInitialPayments(10000, 10000, 10000);
  const bob = await makeBob(
    t,
    zoe,
    installation,
    issuers,
    bobPayments,
    coveredCallInstallation,
  );

  await alice.startInstance();

  // Alice wants to make a custom quote for Bob. If Bob gives 4
  // simoleans, he can get 3 moola.

  // First, Alice must add enough inventory. If the contract hasn't
  // been told of an issuer yet, she must add the issuer to the
  // contract in the call to make the invitation
  await alice.addInventory();

  const invitation3 = await alice.makeQuoteForBob(
    { Buck: bucks(500), Moola: moola(35) },
    { Simolean: simoleans(15) },
    timer,
    100n,
  );

  // Bob tries to offer but he wants more than what was quoted.
  await bob.offerWantTooMuch(invitation3);
});
