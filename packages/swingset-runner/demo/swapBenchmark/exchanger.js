// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';
import { showPurseBalance, setupPurses } from './helpers.js';
import { makePrintLog } from './printLog.js';

import '@agoric/zoe/exported.js';

const log = makePrintLog();

/**
 * @param {string} name
 * @param {ZoeService} zoe
 * @param {Issuer[]} issuers
 * @param {Payment[]} payments
 * @param {Record<string,Installation>} installations
 */
const build = async (name, zoe, issuers, payments, installations) => {
  const { moola, simoleans, purses } = await setupPurses(
    zoe,
    issuers,
    payments,
  );
  const [moolaPurseP, simoleanPurseP] = purses;
  const [moolaIssuer, simoleanIssuer] = issuers;
  const issuerKeywordRecord = harden({
    Price: simoleanIssuer,
    Asset: moolaIssuer,
  });
  const invitationIssuer = await E(zoe).getInvitationIssuer();
  const { atomicSwap } = installations;

  const preReport = async () => {
    await showPurseBalance(moolaPurseP, `${name} moola before`, log);
    await showPurseBalance(simoleanPurseP, `${name} simoleans before`, log);
  };

  const postReport = async () => {
    await showPurseBalance(moolaPurseP, `${name} moola after`, log);
    await showPurseBalance(simoleanPurseP, `${name} simoleans after`, log);
  };

  const receivePayouts = async payoutsP => {
    const payouts = await payoutsP;
    const moolaPayout = await payouts.Asset;
    const simoleanPayout = await payouts.Price;

    await E(moolaPurseP).deposit(moolaPayout);
    await E(simoleanPurseP).deposit(simoleanPayout);
  };

  const initiateSwap = async otherP => {
    await preReport();

    const { creatorInvitation: invitation } = await E(zoe).startInstance(
      atomicSwap,
      issuerKeywordRecord,
    );

    const sellProposal = harden({
      give: { Asset: moola(1) },
      want: { Price: simoleans(1) },
      exit: { onDemand: null },
    });
    const paymentKeywordRecord = {
      Asset: await E(moolaPurseP).withdraw(moola(1)),
    };

    const seatP = E(zoe).offer(invitation, sellProposal, paymentKeywordRecord);
    E(otherP).respondToSwap(E(seatP).getOfferResult());
    const payoutsP = E(seatP).getPayouts();

    await receivePayouts(payoutsP);
    await postReport();
  };

  const respondToSwap = async invitation => {
    await preReport();

    const exclInvitation = await E(invitationIssuer).claim(invitation);

    const buyProposal = harden({
      want: { Asset: moola(1) },
      give: { Price: simoleans(1) },
      exit: { onDemand: null },
    });
    const paymentKeywordRecord = {
      Price: await E(simoleanPurseP).withdraw(simoleans(1)),
    };

    const seatP = await E(zoe).offer(
      exclInvitation,
      buyProposal,
      paymentKeywordRecord,
    );
    await E(seatP).getOfferResult();
    const payoutsP = E(seatP).getPayouts();

    await receivePayouts(payoutsP);
    await postReport();
  };

  return Far('exchanger', {
    initiateSwap,
    respondToSwap,
  });
};

export const buildRootObject = (_vatPowers, vatParameters) =>
  Far('root', {
    build: (zoe, issuers, payments, installations) =>
      build(vatParameters.name, zoe, issuers, payments, installations),
  });
