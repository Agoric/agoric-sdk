import { E } from '@agoric/eventual-send';
import { assert } from '@agoric/assert';
import { showPurseBalance, setupIssuers } from '../helpers';

async function logCounter(log, publicAPI) {
  log(`counter: ${await E(publicAPI).getOffersCount()}`);
}

const build = async (log, zoe, issuers, payments, installations) => {
  const [moolaPayment, simoleansPayment] = payments;
  const [moolaIssuer, simoleanIssuer] = issuers;
  const { moola, simoleans, purses } = await setupIssuers(zoe, issuers);
  const [moolaPurseP, simoleanPurseP] = purses;

  // A metering exception is thrown while processing the offer
  const doMeterExceptionInHook = async () => {
    log(`=> alice.doMeterExceptionInHook called`);
    const installId = installations.crashAutoRefund;

    const issuerKeywordRecord = harden({
      Asset: moolaIssuer,
      Price: simoleanIssuer,
    });
    // This invite throws a metering exception
    const {
      instanceRecord: { publicAPI },
    } = await E(zoe).makeInstance(installId, issuerKeywordRecord);
    const proposal = harden({
      give: { Asset: moola(3) },
      want: { Price: simoleans(7) },
      exit: { onDemand: null },
    });
    const alicePayments = { Asset: moolaPayment };

    const invite = await E(publicAPI).makeExcessiveInvite();
    const { payout: payoutP, outcome } = await E(zoe).offer(
      invite,
      proposal,
      alicePayments,
    );

    outcome.then(
      () => assert(false, ' expected outcome to fail'),
      e => log(`outcome correctly resolves to broken: ${e}`),
    );

    const payout = await payoutP;
    const moolaPayout = await payout.Asset;
    const simoleanPayout = await payout.Price;

    await E(moolaPurseP).deposit(moolaPayout);
    await E(simoleanPurseP).deposit(simoleanPayout);

    await showPurseBalance(moolaPurseP, 'aliceMoolaPurse', log);
    await showPurseBalance(simoleanPurseP, 'aliceSimoleanPurse', log);

    E(publicAPI)
      .getOffersCount()
      .then(
        () => assert(false, 'contract should be non-responsive '),
        e => log(`contract no longer responds: ${e}`),
      );

    // zoe should still be able to make new vats.
    const { instanceRecord } = await E(zoe).makeInstance(
      installId,
      issuerKeywordRecord,
    );
    logCounter(log, instanceRecord.publicAPI);
  };

  // A swap offer is accepted, then an exception is thrown on a second offer
  const doMeterExceptionInSecondInvite = async () => {
    log(`=> alice.doMeterExceptionInHook called`);
    const installId = installations.crashAutoRefund;
    const [refundPayment, swapPayment] = await E(moolaIssuer).split(
      moolaPayment,
      moola(3),
    );

    const issuerKeywordRecord = harden({
      Asset: moolaIssuer,
      Price: simoleanIssuer,
    });

    const {
      instanceRecord: { publicAPI },
    } = await E(zoe).makeInstance(installId, issuerKeywordRecord);

    const swapProposal = harden({
      give: { Asset: moola(5) },
      want: { Price: simoleans(12) },
      exit: { onDemand: null },
    });
    const aliceSwapPayments = { Asset: swapPayment };
    const swapInvite = await E(publicAPI).makeSwapInvite();
    const { payout: swapPayoutP, outcome: swapOutcome } = await E(zoe).offer(
      swapInvite,
      swapProposal,
      aliceSwapPayments,
    );
    swapOutcome.then(
      o => log(`Swap outcome resolves to an invite: ${o}`),
      e => assert(false, `Expected swap outcome to succeed ${e}`),
    );
    // the refunds for swap won't happen till later
    swapPayoutP.then(async swapPayout => {
      const { Asset: swapMoolaPayout, Price: swapSimoleanPayout } = E.G(
        swapPayout,
      );
      E(moolaPurseP).deposit(await swapMoolaPayout);
      E(simoleanPurseP).deposit(await swapSimoleanPayout);

      showPurseBalance(moolaPurseP, 'aliceMoolaPurse', log);
      showPurseBalance(simoleanPurseP, 'aliceSimoleanPurse', log);
      E(moolaPurseP)
        .getCurrentAmount()
        .then(amount => log(`swap value, ${amount.value}`));
    });

    // This invite throws a metering exception
    const refundInvite = await E(publicAPI).makeExcessiveInvite();
    const refundProposal = harden({
      give: { Asset: moola(3) },
      want: { Price: simoleans(7) },
      exit: { onDemand: null },
    });
    const refundPayments = { Asset: refundPayment };

    const { payout: payoutP, outcome: refundOutcome } = await E(zoe).offer(
      refundInvite,
      refundProposal,
      refundPayments,
    );

    // The swap deposit should be refunded
    await showPurseBalance(moolaPurseP, 'aliceMoolaPurse', log);
    await showPurseBalance(simoleanPurseP, 'aliceSimoleanPurse', log);

    refundOutcome.then(
      () => assert(false, ' expected outcome to fail'),
      e => log(`outcome correctly resolves to broken: ${e}`),
    );

    payoutP.then(async refundPayout => {
      const { Asset: swapMoolaPayout, Price: swapSimoleanPayout } = E.G(
        refundPayout,
      );
      E(moolaPurseP).deposit(await swapMoolaPayout);
      E(simoleanPurseP).deposit(await swapSimoleanPayout);

      showPurseBalance(moolaPurseP, 'aliceMoolaPurse', log);
      showPurseBalance(simoleanPurseP, 'aliceSimoleanPurse', log);
      E(moolaPurseP)
        .getCurrentAmount()
        .then(amount => log(`refund value, ${amount.value}`));
    });

    E(publicAPI)
      .getOffersCount()
      .then(
        () => assert(false, 'contract should be non-responsive '),
        e => log(`contract no longer responds: ${e}`),
      );

    // zoe should still be able to make new vats.
    const { instanceRecord: newInstanceRecord } = await E(zoe).makeInstance(
      installId,
      issuerKeywordRecord,
    );
    logCounter(log, newInstanceRecord.publicAPI);
  };

  const doThrowInHook = async () => {
    log(`=> alice.doThrowInHook called`);
    const installId = installations.crashAutoRefund;

    const issuerKeywordRecord = harden({
      Asset: moolaIssuer,
      Price: simoleanIssuer,
    });
    const { instanceRecord } = await E(zoe).makeInstance(
      installId,
      issuerKeywordRecord,
    );
    const proposal = harden({
      give: { Asset: moola(3) },
      want: { Price: simoleans(7) },
      exit: { onDemand: null },
    });
    const alicePayments = { Asset: moolaPayment };

    logCounter(log, instanceRecord.publicAPI);
    const invite = await E(instanceRecord.publicAPI).makeThrowingInvite();
    const { payout: payoutP, outcome } = await E(zoe).offer(
      invite,
      proposal,
      alicePayments,
    );

    outcome.then(
      () => assert(false, ' expected outcome to fail'),
      e => log(`outcome correctly resolves to broken: ${e}`),
    );
    logCounter(log, instanceRecord.publicAPI);
    const payout = await payoutP;
    const moolaPayout = await payout.Asset;
    const simoleanPayout = await payout.Price;

    await E(moolaPurseP).deposit(moolaPayout);
    await E(simoleanPurseP).deposit(simoleanPayout);
    await showPurseBalance(moolaPurseP, 'aliceMoolaPurse', log);
    await showPurseBalance(simoleanPurseP, 'aliceSimoleanPurse', log);
    logCounter(log, instanceRecord.publicAPI);

    // zoe should still be able to make new vats.
    const { instanceRecord: newInstanceRecord } = await E(zoe).makeInstance(
      installId,
      issuerKeywordRecord,
    );
    log(`newCounter: ${await E(newInstanceRecord.publicAPI).getOffersCount()}`);

    const newInvite = await E(instanceRecord.publicAPI).makeSafeInvite();
    const newMoolaPayment = await E(moolaPurseP).withdraw(moola(3));
    const newPayments = { Asset: newMoolaPayment };

    const { payout: secondPayoutP, outcome: secondOutcome } = await E(
      zoe,
    ).offer(newInvite, proposal, newPayments);

    secondOutcome.then(
      o => log(`Successful refund: ${o}`),
      e => assert(false, `Expected swap outcome to succeed ${e}`),
    );
    const newPurse = await E(moolaIssuer).makeEmptyPurse();
    const {
      Asset: swapMoolaPayoutP,
      Price: swapSimoleanPayoutP,
    } = await secondPayoutP;
    E(newPurse).deposit(await swapMoolaPayoutP);
    E(simoleanPurseP).deposit(await swapSimoleanPayoutP);

    showPurseBalance(newPurse, 'new Purse', log);
    showPurseBalance(simoleanPurseP, 'aliceSimoleanPurse', log);
    logCounter(log, instanceRecord.publicAPI);
  };

  const doThrowInApiCall = async () => {
    log(`=> alice.doThrowInApiCall called`);
    const installId = installations.crashAutoRefund;

    const issuerKeywordRecord = harden({
      Asset: moolaIssuer,
      Price: simoleanIssuer,
    });
    const { instanceRecord } = await E(zoe).makeInstance(
      installId,
      issuerKeywordRecord,
    );

    const swapProposal = harden({
      give: { Asset: moola(5) },
      want: { Price: simoleans(8) },
      exit: { onDemand: null },
    });
    const aliceSwapPayments = { Asset: moolaPayment };
    const swapInvite = await E(instanceRecord.publicAPI).makeSwapInvite();
    const { payout: swapPayoutP, outcome: swapOutcome } = await E(zoe).offer(
      swapInvite,
      swapProposal,
      aliceSwapPayments,
    );

    const inviteIssuer = await E(zoe).getInviteIssuer();
    let swapInviteTwo;
    swapOutcome.then(
      o => {
        E(inviteIssuer)
          .isLive(o)
          .then(val => {
            swapInviteTwo = o;
            return log(`Swap outcome is an invite (${val}).`);
          });
      },
      e => assert(false, `expected outcome not to resolve yet ${e}`),
    );
    logCounter(log, instanceRecord.publicAPI);

    E(instanceRecord.publicAPI)
      .throwSomething()
      .then(
        () => assert(false, 'expecting this to throw'),
        e => log(`throwingAPI should throw ${e}`),
      );
    logCounter(log, instanceRecord.publicAPI);

    // These should not resolve at this point, the funds are still escrowed
    swapPayoutP.then(async swapPayout => {
      const moolaSwapPayout = await swapPayout.Asset;
      const simoleanSwapPayout = await swapPayout.Price;

      await E(moolaPurseP).deposit(moolaSwapPayout);
      await E(simoleanPurseP).deposit(simoleanSwapPayout);
      await showPurseBalance(moolaPurseP, 'aliceMoolaPurse', log);
      await showPurseBalance(simoleanPurseP, 'aliceSimoleanPurse', log);
    });

    // show that the contract is still responsive.
    logCounter(log, instanceRecord.publicAPI);

    // zoe should still be able to make new vats.
    const { instanceRecord: newInstanceRecord } = await E(zoe).makeInstance(
      installId,
      issuerKeywordRecord,
    );
    log(`newCounter: ${await E(newInstanceRecord.publicAPI).getOffersCount()}`);

    const swapTwoProposal = harden({
      give: { Price: simoleans(12) },
      want: { Asset: moola(2) },
      exit: { onDemand: null },
    });
    const aliceSwapTwoPayments = { Price: simoleansPayment };
    const { payout: swapTwoPayoutP, outcome: swapTwoOutcome } = await E(
      zoe,
    ).offer(swapInviteTwo, swapTwoProposal, aliceSwapTwoPayments);
    logCounter(log, instanceRecord.publicAPI);

    swapTwoOutcome.then(
      o => log(`outcome correctly resolves: "${o}"`),
      e => assert(false, `expected outcome to succeed ${e}`),
    );
    const swapTwoPayout = await swapTwoPayoutP;
    const moolaSwapTwoPayout = await swapTwoPayout.Asset;
    const simoleanSwapTwoPayout = await swapTwoPayout.Price;

    const moolaPurse2P = E(moolaIssuer).makeEmptyPurse();
    const simoleanPurse2P = E(simoleanIssuer).makeEmptyPurse();
    await E(moolaPurse2P).deposit(moolaSwapTwoPayout);
    await E(simoleanPurse2P).deposit(simoleanSwapTwoPayout);
    await showPurseBalance(moolaPurse2P, 'second moolaPurse', log);
    await showPurseBalance(simoleanPurse2P, 'second simoleanPurse', log);
  };

  const doMeterExceptionInApiCall = async () => {
    log(`=> alice.doMeterInApiCall called`);
    const installId = installations.crashAutoRefund;

    const issuerKeywordRecord = harden({
      Asset: moolaIssuer,
      Price: simoleanIssuer,
    });
    const { instanceRecord } = await E(zoe).makeInstance(
      installId,
      issuerKeywordRecord,
    );
    logCounter(log, instanceRecord.publicAPI);
    const proposal = harden({
      give: { Asset: moola(3) },
      want: { Price: simoleans(7) },
      exit: { onDemand: null },
    });
    const alicePayments = { Asset: moolaPayment };
    const invite = await E(instanceRecord.publicAPI).makeSafeInvite();
    logCounter(log, instanceRecord.publicAPI);

    const { payout: payoutP, outcome } = await E(zoe).offer(
      invite,
      proposal,
      alicePayments,
    );

    logCounter(log, instanceRecord.publicAPI);
    E(instanceRecord.publicAPI)
      .meterException()
      .then(
        () => assert(false, `meterException in an API call should kill vat`),
        e => log(`Vat correctly died for ${e}`),
      );
    outcome.then(
      o => log(`outcome correctly resolves to "${o}"`),
      e => assert(false, `expected outcome to succeed: ${e}`),
    );

    const payout = await payoutP;
    const moolaPayout = await payout.Asset;
    const simoleanPayout = await payout.Price;

    await E(moolaPurseP).deposit(moolaPayout);
    await E(simoleanPurseP).deposit(simoleanPayout);
    await showPurseBalance(moolaPurseP, 'aliceMoolaPurse', log);
    await showPurseBalance(simoleanPurseP, 'aliceSimoleanPurse', log);

    E(instanceRecord.publicAPI)
      .getOffersCount()
      .then(
        () => assert(false, 'contract should be non-responsive '),
        e => log(`contract no longer responds: ${e}`),
      );

    // We should still be able to create new vats.
    const { instanceRecord: newInstanceRecord } = await E(zoe).makeInstance(
      installId,
      issuerKeywordRecord,
    );
    log(`newCounter: ${await E(newInstanceRecord.publicAPI).getOffersCount()}`);
  };

  const doMeterExceptionInMakeContract = async () => {
    log(`=> alice.doMeterExceptionInMakeContract called`);
    const installId = installations.crashAutoRefund;

    const issuerKeywordRecord = harden({
      Asset: moolaIssuer,
      Price: simoleanIssuer,
    });
    E(zoe)
      .makeInstance(installId, issuerKeywordRecord, { meter: true })
      .then(
        () => assert(false, 'contract should not finish creation'),
        e => log(`contract creation failed: ${e}`),
      );

    // We should still be able to create new vats.
    const { instanceRecord: newInstanceRecord } = await E(zoe).makeInstance(
      installId,
      issuerKeywordRecord,
    );
    log(`newCounter: ${await E(newInstanceRecord.publicAPI).getOffersCount()}`);
  };

  const doThrowInMakeContract = async () => {
    log(`=> alice.doThrowInMakeContract called`);
    const installId = installations.crashAutoRefund;

    const issuerKeywordRecord = harden({
      Asset: moolaIssuer,
      Price: simoleanIssuer,
    });
    E(zoe)
      .makeInstance(installId, issuerKeywordRecord, { throw: true })
      .then(
        () => assert(false, 'contract should not finish creation'),
        e => log(`contract creation failed: ${e}`),
      );

    // We should still be able to create new vats.
    const { instanceRecord: newInstanceRecord } = await E(zoe).makeInstance(
      installId,
      issuerKeywordRecord,
    );
    log(`newCounter: ${await E(newInstanceRecord.publicAPI).getOffersCount()}`);
  };

  return harden({
    startTest: async testName => {
      switch (testName) {
        case 'meterInOfferHook': {
          return doMeterExceptionInHook();
        }
        case 'meterInSecondInvite': {
          return doMeterExceptionInSecondInvite();
        }
        case 'throwInOfferHook': {
          return doThrowInHook();
        }
        case 'throwInApiCall': {
          return doThrowInApiCall();
        }
        case 'meterInApiCall': {
          return doMeterExceptionInApiCall();
        }
        case 'throwInMakeContract': {
          return doThrowInMakeContract();
        }
        case 'meterInMakeContract': {
          return doMeterExceptionInMakeContract();
        }
        default: {
          throw new Error(`testName ${testName} not recognized`);
        }
      }
    },
  });
};

export function buildRootObject(vatPowers) {
  return harden({
    build: (...args) => build(vatPowers.testLog, ...args),
  });
}
