// Copyright (C) 2019 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

import { makePrivateName } from '../util/PrivateName';
import { insist } from '../util/insist';
import { makeNatAssay } from './assays';

function makeMint(description, makeAssay = makeNatAssay) {
  insist(description)`\
Description must be truthy: ${description}`;

  // Map from purse or payment to the rights it currently
  // holds. Rights can move via payments
  const rights = makePrivateName();

  // src is a purse or payment. Return a fresh payment.  One internal
  // function used for both cases, since they are so similar.
  function takePayment(amount, isPurse, src, _name) {
    // eslint-disable-next-line no-use-before-define
    amount = assay.coerce(amount);
    _name = `${_name}`;
    const srcOldRightsAmount = rights.get(src);
    // eslint-disable-next-line no-use-before-define
    const srcNewRightsAmount = assay.without(srcOldRightsAmount, amount);

    // ///////////////// commit point //////////////////
    // All queries above passed with no side effects.
    // During side effects below, any early exits should be made into
    // fatal turn aborts.

    const payment = harden({
      getIssuer() {
        // eslint-disable-next-line no-use-before-define
        return issuer;
      },
      getBalance() {
        return rights.get(payment);
      },
    });
    rights.set(src, srcNewRightsAmount);
    rights.init(payment, amount);
    return payment;
  }

  const issuer = harden({
    getLabel() {
      // eslint-disable-next-line no-use-before-define
      return assay.getLabel();
    },

    getAssay() {
      // eslint-disable-next-line no-use-before-define
      return assay;
    },

    makeEmptyPurse(name = 'a purse') {
      // eslint-disable-next-line no-use-before-define
      return mint.mint(assay.empty(), name); // mint and issuer call each other
    },

    getExclusive(amount, srcPaymentP, name = 'a payment') {
      return Promise.resolve(srcPaymentP).then(srcPayment =>
        takePayment(amount, false, srcPayment, name),
      );
    },

    getExclusiveAll(srcPaymentP, name = 'a payment') {
      return Promise.resolve(srcPaymentP).then(srcPayment =>
        takePayment(rights.get(srcPayment), false, srcPayment, name),
      );
    },

    slash(amount, srcPaymentP) {
      // We deposit the alleged payment, rather than just doing a get
      // exclusive on it, in order to consume the usage erights as well.
      const sinkPurse = issuer.makeEmptyPurse('sink purse');
      return sinkPurse.deposit(amount, srcPaymentP);
    },

    slashAll(srcPaymentP) {
      const sinkPurse = issuer.makeEmptyPurse('sink purse');
      return sinkPurse.depositAll(srcPaymentP);
    },
  });

  const label = harden({ issuer, description });

  const assay = makeAssay(label);

  function depositInto(purse, amount, srcPayment) {
    amount = assay.coerce(amount);
    const purseOldRightsAmount = rights.get(purse);
    const srcOldRightsAmount = rights.get(srcPayment);
    // Also checks that the union is representable
    const purseNewRightsAmount = assay.with(purseOldRightsAmount, amount);
    const srcNewRightsAmount = assay.without(srcOldRightsAmount, amount);

    // ///////////////// commit point //////////////////
    // All queries above passed with no side effects.
    // During side effects below, any early exits should be made into
    // fatal turn aborts.

    rights.set(srcPayment, srcNewRightsAmount);
    rights.set(purse, purseNewRightsAmount);

    return amount;
  }

  const mint = harden({
    getIssuer() {
      return issuer;
    },
    mint(initialBalance, _name = 'a purse') {
      initialBalance = assay.coerce(initialBalance);
      _name = `${_name}`;

      const purse = harden({
        getIssuer() {
          return issuer;
        },
        getBalance() {
          return rights.get(purse);
        },
        deposit(amount, srcPaymentP) {
          return Promise.resolve(srcPaymentP).then(srcPayment => {
            return depositInto(purse, amount, srcPayment);
          });
        },
        depositAll(srcPaymentP) {
          return Promise.resolve(srcPaymentP).then(srcPayment => {
            return depositInto(purse, rights.get(srcPayment), srcPayment);
          });
        },
        withdraw(amount, name = 'a withdrawal payment') {
          return takePayment(amount, true, purse, name);
        },
        withdrawAll(name = 'a withdrawal payment') {
          return takePayment(rights.get(purse), true, purse, name);
        },
      });
      rights.init(purse, initialBalance);
      return purse;
    },
  });
  return mint;
}
harden(makeMint);

// Creates a local issuer that locally represents a remotely issued
// currency. Returns a promise for a peg object that asynchonously
// converts between the two. The local currency is synchronously
// transferable locally.
function makePeg(E, remoteIssuerP, makeAssay = makeNatAssay) {
  const remoteLabelP = E(remoteIssuerP).getLabel();

  // The remoteLabel is a local copy of the remote pass-by-copy
  // label. It has a presence of the remote issuer and a copy of the
  // description.
  return Promise.resolve(remoteLabelP).then(remoteLabel => {
    // Retaining remote currency deposits it in here.
    // Redeeming local currency withdraws remote from here.
    const backingPurseP = E(remoteIssuerP).makeEmptyPurse('backing');

    const { description } = remoteLabel;
    const localMint = makeMint(description, makeAssay);
    const localIssuer = localMint.getIssuer();
    const localLabel = localIssuer.getLabel();

    function localAmountOf(remoteAmount) {
      return harden({
        label: localLabel,
        quantity: remoteAmount.quantity,
      });
    }

    function remoteAmountOf(localAmount) {
      return harden({
        label: remoteLabel,
        quantity: localAmount.quantity,
      });
    }

    return harden({
      getLocalIssuer() {
        return localIssuer;
      },

      getRemoteIssuer() {
        return remoteIssuerP;
      },

      retainAll(remotePaymentP, name = 'backed') {
        return E(backingPurseP)
          .depositAll(remotePaymentP)
          .then(remoteAmount =>
            localMint
              .mint(localAmountOf(remoteAmount), `${name} purse`)
              .withdrawAll(name),
          );
      },

      redeemAll(localPayment, name = 'redeemed') {
        return localIssuer
          .slashAll(localPayment)
          .then(localAmount =>
            E(backingPurseP).withdraw(remoteAmountOf(localAmount), name),
          );
      },
    });
  });
}
harden(makePeg);

export { makeMint, makePeg };
