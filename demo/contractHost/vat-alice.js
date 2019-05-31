// Copyright (C) 2013 Google Inc, under Apache License 2.0
// Copyright (C) 2018 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

import { insist } from '../../collections/insist';
import { allComparable } from '../../collections/sameStructure';
import { makeCollect } from './contractHost';

function makeAlice(E, host, log) {
  const collect = makeCollect(E, log);

  function showPaymentBalance(name, paymentP) {
    return E(paymentP)
      .getXferBalance()
      .then(amount => log(name, ' xfer balance ', amount));
  }

  let initialized = false;

  let escrowExchangeInstallationP;
  let coveredCallInstallationP;
  let timerP;
  let inviteIssuerP;
  let inviteIssuerLabel;

  let myMoneyPurseP;
  let moneyIssuerP;

  let myStockPurseP;
  let stockIssuerP;

  let myOptFinPurseP;
  let optFinIssuerP;

  let optFredP;

  function init(
    escrowExchangeInst,
    coveredCallInst,
    timer,
    myMoneyPurse,
    myStockPurse,
    myOptFinPurse = undefined,
    optFred = undefined,
  ) {
    escrowExchangeInstallationP = escrowExchangeInst;
    coveredCallInstallationP = coveredCallInst;
    timerP = E.resolve(timer);
    inviteIssuerP = E(host).getInviteIssuer();
    inviteIssuerLabel = harden({
      issuer: inviteIssuerP,
      description: 'contract host',
    });

    myMoneyPurseP = E.resolve(myMoneyPurse);
    moneyIssuerP = E(myMoneyPurseP).getIssuer();

    myStockPurseP = E.resolve(myStockPurse);
    stockIssuerP = E(myStockPurseP).getIssuer();

    if (myOptFinPurse) {
      myOptFinPurseP = E.resolve(myOptFinPurse);
      optFinIssuerP = E(myOptFinPurseP).getIssuer();
    }
    optFredP = optFred;

    initialized = true;
    // eslint-disable-next-line no-use-before-define
    return alice; // alice and init use each other
  }

  const alice = harden({
    init,
    payBobWell(bob) {
      log('++ alice.payBobWell starting');
      insist(initialized)`\
ERR: alice.payBobWell called before init()`;

      const paymentP = E(myMoneyPurseP).withdraw(10);
      return E(bob).buy('shoe', paymentP);
    },

    acceptInvite(allegedInvitePaymentP) {
      log('++ alice.acceptInvite starting');
      insist(initialized)`\
ERR: alice.acceptInvite called before init()`;

      showPaymentBalance('alice invite', allegedInvitePaymentP);

      const allegedInviteAmountP = E(allegedInvitePaymentP).getXferBalance();

      const verifiedInviteP = E.resolve(allegedInviteAmountP).then(
        allegedInviteAmount => {
          const clams10 = harden({
            label: {
              issuer: moneyIssuerP,
              description: 'clams',
            },
            quantity: 10,
          });
          const fudco7 = harden({
            label: {
              issuer: stockIssuerP,
              description: 'fudco',
            },
            quantity: 7,
          });

          const inviteAmountP = allComparable(
            harden({
              label: inviteIssuerLabel,
              quantity: {
                installation: escrowExchangeInstallationP,
                terms: [clams10, fudco7],
                seatIdentity: allegedInviteAmount.quantity.seatIdentity,
                seatDesc: 'left',
              },
            }),
          );

          return E.resolve(inviteAmountP).then(inviteAmount => {
            return E(inviteIssuerP).getExclusive(
              inviteAmount,
              allegedInvitePaymentP,
              'verified invite',
            );
          });
        },
      );

      return E.resolve(
        showPaymentBalance('verified invite', verifiedInviteP),
      ).then(_ => {
        const seatP = E(host).redeem(verifiedInviteP);
        const moneyPaymentP = E(myMoneyPurseP).withdraw(10);
        E(seatP).offer(moneyPaymentP);
        return collect(seatP, myStockPurseP, myMoneyPurseP, 'alice escrow');
      });
    },

    acceptOption(allegedInvitePaymentP) {
      if (optFredP) {
        return alice.acceptOptionForFred(allegedInvitePaymentP);
      }
      return alice.acceptOptionDirectly(allegedInvitePaymentP);
    },

    acceptOptionDirectly(allegedInvitePaymentP) {
      log('++ alice.acceptOptionDirectly starting');
      insist(initialized)`\
ERR: alice.acceptOptionDirectly called before init()`;

      showPaymentBalance('alice invite', allegedInvitePaymentP);

      const allegedInviteAmountP = E(allegedInvitePaymentP).getXferBalance();

      const verifiedInvitePaymentP = E.resolve(allegedInviteAmountP).then(
        allegedInviteAmount => {
          const smackers10 = harden({
            label: {
              issuer: moneyIssuerP,
              description: 'smackers',
            },
            quantity: 10,
          });
          const yoyodyne7 = harden({
            label: {
              issuer: stockIssuerP,
              description: 'yoyodyne',
            },
            quantity: 7,
          });

          const inviteAmountP = allComparable(
            harden({
              label: inviteIssuerLabel,
              quantity: {
                installation: coveredCallInstallationP,
                terms: [smackers10, yoyodyne7, timerP, 'singularity'],
                seatIdentity: allegedInviteAmount.quantity.seatIdentity,
                seatDesc: 'holder',
              },
            }),
          );

          return E.resolve(inviteAmountP).then(inviteAmount => {
            return E(inviteIssuerP).getExclusive(
              inviteAmount,
              allegedInvitePaymentP,
              'verified invite',
            );
          });
        },
      );

      return E.resolve(
        showPaymentBalance('verified invite', verifiedInvitePaymentP),
      ).then(_ => {
        const seatP = E(host).redeem(verifiedInvitePaymentP);
        const moneyPaymentP = E(myMoneyPurseP).withdraw(10);
        E(seatP).offer(moneyPaymentP);
        return collect(seatP, myStockPurseP, myMoneyPurseP, 'alice option');
      });
    },

    acceptOptionForFred(allegedInvitePaymentP) {
      log('++ alice.acceptOptionForFred starting');
      insist(initialized)`\
ERR: alice.acceptOptionForFred called before init()`;

      const finNeededP = E(E(optFinIssuerP).getAssay()).make(55);
      const inviteNeededP = E(allegedInvitePaymentP).getXferBalance();

      const termsP = harden([finNeededP, inviteNeededP]);
      // const invitesP = E(E(host).install(escrowExchangeSrc)).spawn(termsP);
      const invitesP = E(escrowExchangeInstallationP).spawn(termsP);
      const fredInviteP = invitesP.then(invites => invites[0]);
      const aliceForFredInviteP = invitesP.then(invites => invites[1]);
      const doneP = Promise.all([
        E(optFredP).acceptOptionOffer(fredInviteP),
        E(alice).completeOptionsSale(
          aliceForFredInviteP,
          allegedInvitePaymentP,
        ),
      ]);
      doneP.then(
        _res => log('++ alice.acceptOptionForFred done'),
        rej => log('++ alice.acceptOptionForFred reject: ', rej),
      );
      return doneP;
    },

    completeOptionsSale(aliceForFredInviteP, allegedInvitePaymentP) {
      log('++ alice.completeOptionsSale starting');
      insist(initialized)`\
ERR: alice.completeOptionsSale called before init()`;

      const aliceForFredSeatP = E(host).redeem(aliceForFredInviteP);
      E(aliceForFredSeatP).offer(allegedInvitePaymentP);
      const myInvitePurseP = E(inviteIssuerP).makeEmptyPurse();
      return collect(
        aliceForFredSeatP,
        myOptFinPurseP,
        myInvitePurseP,
        'alice options sale',
      );
    },
  });
  return alice;
}

function setup(syscall, state, helpers) {
  function log(...args) {
    helpers.log(...args);
    console.log(...args);
  }
  return helpers.makeLiveSlots(syscall, state, E =>
    harden({
      makeAlice(host) {
        return harden(makeAlice(E, host, log));
      },
    }),
  );
}
export default harden(setup);
