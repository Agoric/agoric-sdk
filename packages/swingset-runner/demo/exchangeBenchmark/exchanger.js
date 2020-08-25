// @ts-check

import { E } from '@agoric/eventual-send';
import { showPurseBalance, setupPurses } from './helpers';
import { makePrintLog } from './printLog';

import '@agoric/zoe/exported';

const log = makePrintLog();

/**
 * @param {string} name
 * @param {ZoeService} zoe
 * @param {Issuer[]} issuers
 * @param {Payment[]} payments
 * @param {Record<string,Installation>} installations
 */
async function build(name, zoe, issuers, payments, installations) {
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
  const inviteIssuer = await E(zoe).getInvitationIssuer();
  const { simpleExchange } = installations;

  async function preReport() {
    await showPurseBalance(moolaPurseP, `${name} moola before`, log);
    await showPurseBalance(simoleanPurseP, `${name} simoleans before`, log);
  }

  async function postReport() {
    await showPurseBalance(moolaPurseP, `${name} moola after`, log);
    await showPurseBalance(simoleanPurseP, `${name} simoleans after`, log);
  }

  async function receivePayout(payoutP) {
    const payout = await payoutP;
    const moolaPayout = await payout.Asset;
    const simoleanPayout = await payout.Price;

    await E(moolaPurseP).deposit(moolaPayout);
    await E(simoleanPurseP).deposit(simoleanPayout);
  }

  async function initiateSimpleExchange(otherP) {
    await preReport();

    const { publicFacet } = await E(zoe).startInstance(
      simpleExchange,
      issuerKeywordRecord,
    );
    const publicAPI = /** @type {{ makeInvitation: () => Invitation }} */ (publicFacet);

    const addOrderInvite = await E(publicAPI).makeInvitation();

    const mySellOrderProposal = harden({
      give: { Asset: moola(1) },
      want: { Price: simoleans(1) },
      exit: { onDemand: null },
    });
    const paymentKeywordRecord = {
      Asset: await E(moolaPurseP).withdraw(moola(1)),
    };
    const seat = await E(zoe).offer(
      addOrderInvite,
      mySellOrderProposal,
      paymentKeywordRecord,
    );
    const payoutP = E(seat).getPayouts();

    const inviteP = E(publicAPI).makeInvitation();
    await E(otherP).respondToSimpleExchange(inviteP);

    await receivePayout(payoutP);
    await postReport();
  }

  async function respondToSimpleExchange(inviteP) {
    await preReport();

    const invite = await inviteP;
    const exclInvite = await E(inviteIssuer).claim(invite);

    const myBuyOrderProposal = harden({
      want: { Asset: moola(1) },
      give: { Price: simoleans(1) },
      exit: { onDemand: null },
    });
    const paymentKeywordRecord = {
      Price: await E(simoleanPurseP).withdraw(simoleans(1)),
    };

    const seatP = await E(zoe).offer(
      exclInvite,
      myBuyOrderProposal,
      paymentKeywordRecord,
    );
    const payoutP = E(seatP).getPayouts();

    await receivePayout(payoutP);
    await postReport();
  }

  return harden({
    initiateSimpleExchange,
    respondToSimpleExchange,
  });
}

export function buildRootObjectCommon(name, _vatPowers) {
  return harden({
    build: (zoe, issuers, payments, installations) =>
      build(name, zoe, issuers, payments, installations),
  });
}
