/* global harden */
// @ts-check

import { E } from '@agoric/eventual-send';
import { showPurseBalance, setupPurses } from './helpers';
import { makePrintLog } from './printLog';

const log = makePrintLog();

async function build(name, zoe, issuers, payments, installations) {
  const { moola, simoleans, purses } = await setupPurses(
    zoe,
    issuers,
    payments,
  );
  const [moolaPurseE, simoleanPurseE] = purses;
  const [moolaIssuer, simoleanIssuer] = issuers;
  const issuerKeywordRecord = harden({
    Price: simoleanIssuer,
    Asset: moolaIssuer,
  });
  const inviteIssuer = await E(zoe).getInviteIssuer();
  const { simpleExchange } = installations;

  async function preReport() {
    await showPurseBalance(moolaPurseE, `${name} moola before`, log);
    await showPurseBalance(simoleanPurseE, `${name} simoleans before`, log);
  }

  async function postReport() {
    await showPurseBalance(moolaPurseE, `${name} moola after`, log);
    await showPurseBalance(simoleanPurseE, `${name} simoleans after`, log);
  }

  async function receivePayout(payoutE) {
    const payout = await payoutE;
    const moolaPayout = await payout.Asset;
    const simoleanPayout = await payout.Price;

    await E(moolaPurseE).deposit(moolaPayout);
    await E(simoleanPurseE).deposit(simoleanPayout);
  }

  async function initiateSimpleExchange(otherE) {
    await preReport();

    const {
      invite: addOrderInvite,
      instanceRecord: { publicAPI },
    } = await E(zoe).makeInstance(simpleExchange, issuerKeywordRecord);

    const mySellOrderProposal = harden({
      give: { Asset: moola(1) },
      want: { Price: simoleans(1) },
      exit: { onDemand: null },
    });
    const paymentKeywordRecord = {
      Asset: await E(moolaPurseE).withdraw(moola(1)),
    };
    const { payout: payoutE } = await E(zoe).offer(
      addOrderInvite,
      mySellOrderProposal,
      paymentKeywordRecord,
    );

    const inviteE = E(publicAPI).makeInvite();
    await E(otherE).respondToSimpleExchange(inviteE);

    await receivePayout(payoutE);
    await postReport();
  }

  async function respondToSimpleExchange(inviteE) {
    await preReport();

    const invite = await inviteE;
    const exclInvite = await E(inviteIssuer).claim(invite);

    const myBuyOrderProposal = harden({
      want: { Asset: moola(1) },
      give: { Price: simoleans(1) },
      exit: { onDemand: null },
    });
    const paymentKeywordRecord = {
      Price: await E(simoleanPurseE).withdraw(simoleans(1)),
    };

    const { payout: payoutE } = await E(zoe).offer(
      exclInvite,
      myBuyOrderProposal,
      paymentKeywordRecord,
    );

    await receivePayout(payoutE);
    await postReport();
  }

  return harden({
    initiateSimpleExchange,
    respondToSimpleExchange,
  });
}

export function buildRootObjectCommon(name, _vatPowers) {
  return harden({
    build: (...args) => build(name, ...args),
  });
}
