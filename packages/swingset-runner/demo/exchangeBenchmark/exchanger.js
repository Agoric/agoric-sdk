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
 * @param {{ makeInvitation: () => Invitation }} publicFacet
 */
const build = async (name, zoe, issuers, payments, publicFacet) => {
  const { moola, simoleans, purses } = await setupPurses(
    zoe,
    issuers,
    payments,
  );
  const [moolaPurseP, simoleanPurseP] = purses;

  const invitationIssuer = await E(zoe).getInvitationIssuer();

  const preReport = async quiet => {
    const useLog = quiet ? () => {} : log;
    await showPurseBalance(moolaPurseP, `${name} moola before`, useLog);
    await showPurseBalance(simoleanPurseP, `${name} simoleans before`, useLog);
  };

  const postReport = async quiet => {
    const useLog = quiet ? () => {} : log;
    await showPurseBalance(moolaPurseP, `${name} moola after`, useLog);
    await showPurseBalance(simoleanPurseP, `${name} simoleans after`, useLog);
  };

  const receivePayout = async payoutP => {
    const payout = await payoutP;
    const moolaPayout = await payout.Asset;
    const simoleanPayout = await payout.Price;

    await E(moolaPurseP).deposit(moolaPayout);
    await E(simoleanPurseP).deposit(simoleanPayout);
  };

  const initiateTrade = async (otherP, quiet) => {
    await preReport(quiet);

    const buyOrderInvitation = await E(publicFacet).makeInvitation();

    const mySellOrderProposal = harden({
      give: { Asset: moola(1) },
      want: { Price: simoleans(1) },
      exit: { onDemand: null },
    });
    const paymentKeywordRecord = {
      Asset: await E(moolaPurseP).withdraw(moola(1)),
    };
    const seat = await E(zoe).offer(
      buyOrderInvitation,
      mySellOrderProposal,
      paymentKeywordRecord,
    );
    const payoutP = E(seat).getPayouts();

    const invitationP = E(publicFacet).makeInvitation();
    await E(otherP).respondToTrade(invitationP, quiet);

    await receivePayout(payoutP);
    await postReport(quiet);
  };

  const respondToTrade = async (invitationP, quiet) => {
    await preReport(quiet);

    const invitation = await invitationP;
    const exclInvitation = await E(invitationIssuer).claim(invitation);

    const myBuyOrderProposal = harden({
      want: { Asset: moola(1) },
      give: { Price: simoleans(1) },
      exit: { onDemand: null },
    });
    const paymentKeywordRecord = {
      Price: await E(simoleanPurseP).withdraw(simoleans(1)),
    };

    const seatP = await E(zoe).offer(
      exclInvitation,
      myBuyOrderProposal,
      paymentKeywordRecord,
    );
    const payoutP = E(seatP).getPayouts();

    await receivePayout(payoutP);
    await postReport(quiet);
  };

  return harden({
    initiateTrade,
    respondToTrade,
  });
};

export const buildRootObject = (_vatPowers, vatParameters) =>
  Far('root', {
    build: (zoe, issuers, payments, publicFacet) =>
      build(vatParameters.name, zoe, issuers, payments, publicFacet),
  });
