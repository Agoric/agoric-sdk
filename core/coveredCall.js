/* global E */
// Copyright (C) 2019 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

function coveredCall(terms, inviteMaker) {
  const [
    escrowExchangeInstallationP,
    moneyNeeded,
    stockNeeded,
    timerP,
    deadline,
  ] = terms;

  const pairP = E(escrowExchangeInstallationP).spawn(
    harden({ left: moneyNeeded, right: stockNeeded }),
  );

  const aliceEscrowSeatP = E.resolve(pairP).then(pair =>
    inviteMaker.redeem(pair.left),
  );
  const bobEscrowSeatP = E.resolve(pairP).then(pair =>
    inviteMaker.redeem(pair.right),
  );

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
          return inviteMaker.make('holder', aliceEscrowSeatP);
        });
    },
    getWinnings() {
      return E(bobEscrowSeatP).getWinnings();
    },
    getRefund() {
      return E(bobEscrowSeatP).getRefund();
    },
  });

  return inviteMaker.make('writer', bobSeat);
}

const coveredCallSrc = `(${coveredCall})`;

export { coveredCall, coveredCallSrc };
