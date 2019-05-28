/* global E */
// Copyright (C) 2019 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

import { escrowExchange } from './escrow';

function coveredCall(terms, chitMaker) {
  const [moneyNeeded, stockNeeded, timerP, deadline] = terms;

  const [aliceChit, bobChit] = escrowExchange(
    [moneyNeeded, stockNeeded],
    chitMaker,
  );

  const aliceEscrowSeatP = chitMaker.redeem(aliceChit);
  const bobEscrowSeatP = chitMaker.redeem(bobChit);

  // Seats

  E(timerP)
    .delayUntil(deadline)
    .then(_ => E(bobEscrowSeatP).cancel('expired'));

  const bobSeat = harden({
    offer(stockPayment) {
      const sIssuer = stockNeeded.label.issuer;
      return E(sIssuer)
        .getExclusive(stockNeeded, stockPayment, 'prePay')
        .then(prePayment => {
          E(bobEscrowSeatP).offer(prePayment);
          return chitMaker.make(
            ['holder', moneyNeeded, stockNeeded],
            aliceEscrowSeatP,
          );
        });
    },
    getWinnings() {
      return E(bobEscrowSeatP).getWinnings();
    },
    getRefund() {
      return E(bobEscrowSeatP).getRefund();
    },
  });

  return chitMaker.make(['writer', stockNeeded, moneyNeeded], bobSeat);
}

const coveredCallSrc = `\
(function() {
  ${escrowExchange}
  return (${coveredCall});
}())`;

export { coveredCall, coveredCallSrc };
