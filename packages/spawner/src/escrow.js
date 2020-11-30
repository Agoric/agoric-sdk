// Copyright (C) 2019 Agoric, under Apache License 2.0

/* global E makePromiseKit */

import { mustBeSameStructure } from '@agoric/same-structure';

// For clarity, the code below internally speaks of a scenario is which Alice is
// trading some of her money for some of Bob's stock. However, for generality,
// the API does not expose names like "alice", "bob", "money", or "stock".
// Rather, Alice and Bob are left and right respectively. Money represents the
// rights transferred from left to right, and Stock represents the rights
// transferred from right to left.
const escrowExchange = harden({
  start: (terms, inviteMaker) => {
    const { left: moneyNeeded, right: stockNeeded } = terms;

    // TODO: How to get issuer?
    function makeTransfer(issuer, amount, srcPaymentP) {
      const escrowP = E(issuer).claim(srcPaymentP, amount);
      const winnings = makePromiseKit();
      const refund = makePromiseKit();
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

    const moneyPayment = makePromiseKit();
    const moneyTransfer = makeTransfer(moneyNeeded, moneyPayment.promise);

    const stockPayment = makePromiseKit();
    const stockTransfer = makeTransfer(stockNeeded, stockPayment.promise);

    // TODO Use cancellation tokens instead.
    const aliceCancel = makePromiseKit();
    const bobCancel = makePromiseKit();

    // Set it all in motion optimistically.

    const decisionP = Promise.race([
      Promise.all([moneyTransfer.phase1(), stockTransfer.phase1()]),
      aliceCancel.promise,
      bobCancel.promise,
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
      offer: moneyPayment.resolve,
      cancel: aliceCancel.reject,
      getWinnings: stockTransfer.getWinnings,
      getRefund: moneyTransfer.getRefund,
    });

    const bobSeat = harden({
      offer: stockPayment.resolve,
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
    mustBeSameStructure(allegedInviteUnits.value.seatDesc, seat);
    const allegedTerms = allegedInviteUnits.value.terms;
    mustBeSameStructure(allegedTerms, expectedTerms, 'Escrow checkUnits');
    mustBeSameStructure(
      allegedInviteUnits.value.installation,
      installation,
      'escrow checkUnits installation',
    );
    return true;
  },

  // Check the left or right side, and return the other. Useful when this is a
  // trade of goods for an invite, for example.
  checkPartialUnits: (installation, allegedInvite, expectedTerms, seat) => {
    const allegedSeat = allegedInvite.value.terms;
    mustBeSameStructure(
      allegedSeat[seat],
      expectedTerms,
      'Escrow checkPartialUnits seat',
    );

    mustBeSameStructure(
      allegedInvite.value.installation,
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
