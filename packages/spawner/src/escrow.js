/* global E makePromise */
// Copyright (C) 2019 Agoric, under Apache License 2.0

import harden from '@agoric/harden';
import { mustBeSameStructure } from '@agoric/same-structure';

// For clarity, the code below internally speaks of a scenario is which Alice is
// trading some of her money for some of Bob's stock. However, for generality,
// the API does not expose names like "alice", "bob", "money", or "stock".
// Rather, Alice and Bob are left and right respectively. Money represents the
// rights transferred from left to right, and Stock represents the rights
// transferred from right to left.
const escrowExchange = harden({
  start: (terms, inviteMaker) => {
    const { left: moneyNeeded, right: stockNeeded, leftIssuer, rightIssuer } = terms;

    // TODO: How to get issuer? => terms, i guess
    function makeTransfer(issuer, amount, srcPaymentP) {
      console.log('escrow makeTransfer, claim before')
      const escrowP = srcPaymentP.then(srcPayment => E(issuer).claim(srcPayment, amount));
      
      escrowP.catch(err => console.log('escrow makeTransfer claim after error', err))
      escrowP.then(val => console.log('escrow makeTransfer claim after payment', val))


      const winnings = makePromise();
      const refund = makePromise();
      return harden({
        phase1() {
          return escrowP;
        },
        phase2() {
          winnings.res(escrowP);
          refund.res(null);
        },
        abort(reason) {
          winnings.reject(reason);
          refund.res(escrowP);
        },
        getWinnings() {
          return winnings.p;
        },
        getRefund() {
          return refund.p;
        },
      });
    }

    // Promise wiring

    const moneyPayment = makePromise();
    const moneyTransfer = makeTransfer(leftIssuer, moneyNeeded, moneyPayment.p);

    const stockPayment = makePromise();
    const stockTransfer = makeTransfer(rightIssuer, stockNeeded, stockPayment.p);

    // TODO Use cancellation tokens instead.
    const aliceCancel = makePromise();
    const bobCancel = makePromise();

    // Set it all in motion optimistically.

    const decisionP = Promise.race([
      Promise.all([moneyTransfer.phase1(), stockTransfer.phase1()]),
      aliceCancel.p,
      bobCancel.p,
    ]);
    decisionP.then(
      _ => {
        moneyTransfer.phase2();
        stockTransfer.phase2();
      },
      reason => {
        moneyTransfer.abort(reason);
        stockTransfer.abort(reason);
      },
    );

    // Seats

    const aliceSeat = harden({
      offer: moneyPayment.res,
      cancel: aliceCancel.reject,
      getWinnings: stockTransfer.getWinnings,
      getRefund: moneyTransfer.getRefund,
    });

    const bobSeat = harden({
      offer: stockPayment.res,
      cancel: bobCancel.reject,
      getWinnings: moneyTransfer.getWinnings,
      getRefund: stockTransfer.getRefund,
    });

    return harden({
      left: inviteMaker.make('left', aliceSeat),
      right: inviteMaker.make('right', bobSeat),
    });
  },

  checkUnits: (installation, allegedInviteUnits, expectedTerms, seat) => {
    mustBeSameStructure(allegedInviteUnits.extent.seatDesc, seat);
    const allegedTerms = allegedInviteUnits.extent.terms;
    mustBeSameStructure(allegedTerms, expectedTerms, 'Escrow checkUnits');
    mustBeSameStructure(
      allegedInviteUnits.extent.installation,
      installation,
      'escrow checkUnits installation',
    );
    return true;
  },

  // Check the left or right side, and return the other. Useful when this is a
  // trade of goods for an invite, for example.
  checkPartialUnits: (installation, allegedInvite, expectedTerms, seat) => {
    const allegedSeat = allegedInvite.extent.terms;
    mustBeSameStructure(
      allegedSeat[seat],
      expectedTerms,
      'Escrow checkPartialUnits seat',
    );

    mustBeSameStructure(
      allegedInvite.extent.installation,
      installation,
      'escrow checkPartialUnits installation',
    );

    return seat === 'left' ? allegedSeat.right : allegedSeat.left;
  },
});

const escrowExchangeSrcs = harden({
  start: `${escrowExchange.start}`,
  checkUnits: `${escrowExchange.checkUnits}`,
  checkPartialUnits: `${escrowExchange.checkPartialUnits}`,
});

export { escrowExchangeSrcs };
