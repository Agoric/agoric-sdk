/* eslint no-use-before-define: 0 */ // --> OFF
// Copyright (C) 2019 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

import { insist } from '../util/insist';
import { makeNatAssay } from './assays';
import { makeBasicMintController } from './mintController';

function makeMint(
  description,
  makeMintController = makeBasicMintController,
  makeAssay = makeNatAssay,
) {
  insist(description)`\
Description must be truthy: ${description}`;

  // src is a purse or payment. Return a fresh payment.  One internal
  // function used for both cases, since they are so similar.
  function takePayment(amount, isPurse, src, _name) {
    amount = assay.coerce(amount);
    _name = `${_name}`;
    const srcOldRightsAmount = mintController.getAmount(src);
    const srcNewRightsAmount = assay.without(srcOldRightsAmount, amount);

    // ///////////////// commit point //////////////////
    // All queries above passed with no side effects.
    // During side effects below, any early exits should be made into
    // fatal turn aborts.

    const payment = harden({
      getIssuer() {
        return issuer;
      },
      getBalance() {
        return mintController.getAmount(payment);
      },
    });
    mintController.recordPayment(src, payment, amount, srcNewRightsAmount);
    return payment;
  }

  const issuer = harden({
    getLabel() {
      return assay.getLabel();
    },

    getAssay() {
      return assay;
    },

    makeEmptyPurse(name = 'a purse') {
      return mint.mint(assay.empty(), name); // mint and issuer call each other
    },

    getExclusive(amount, srcPaymentP, name = 'a payment') {
      return Promise.resolve(srcPaymentP).then(srcPayment =>
        takePayment(amount, false, srcPayment, name),
      );
    },

    getExclusiveAll(srcPaymentP, name = 'a payment') {
      return Promise.resolve(srcPaymentP).then(srcPayment =>
        takePayment(
          mintController.getAmount(srcPayment),
          false,
          srcPayment,
          name,
        ),
      );
    },

    burn(amount, srcPaymentP) {
      // We deposit the alleged payment, rather than just doing a get
      // exclusive on it, in order to consume the usage erights as well.
      const sinkPurse = issuer.makeEmptyPurse('sink purse');
      return sinkPurse.deposit(amount, srcPaymentP);
    },

    burnAll(srcPaymentP) {
      const sinkPurse = issuer.makeEmptyPurse('sink purse');
      return sinkPurse.depositAll(srcPaymentP);
    },
  });

  const label = harden({ issuer, description });

  const assay = makeAssay(label);
  const mintController = makeMintController(assay);

  function depositInto(purse, amount, srcPayment) {
    amount = assay.coerce(amount);
    const purseOldRightsAmount = mintController.getAmount(purse);
    const srcOldRightsAmount = mintController.getAmount(srcPayment);
    // Also checks that the union is representable
    const purseNewRightsAmount = assay.with(purseOldRightsAmount, amount);
    const srcNewRightsAmount = assay.without(srcOldRightsAmount, amount);

    // ///////////////// commit point //////////////////
    // All queries above passed with no side effects.
    // During side effects below, any early exits should be made into
    // fatal turn aborts.

    mintController.recordDeposit(
      srcPayment,
      assay.coerce(srcNewRightsAmount),
      purse,
      assay.coerce(purseNewRightsAmount),
    );

    return amount;
  }

  const mint = harden({
    getIssuer() {
      return issuer;
    },
    destroyAll() {
      mintController.destroyAll();
    },
    destroy(amount) {
      amount = assay.coerce(amount);
      // for non-fungible tokens that are unique, destroy them by removing them from
      // the purses/payments that they live in
      mintController.destroy(amount);
    },
    revoke(amount) {
      this.destroy(amount);
      return mint(amount);
    },
    mint(initialBalance, _name = 'a purse') {
      initialBalance = assay.coerce(initialBalance);
      _name = `${_name}`;

      const purse = harden({
        getIssuer() {
          return issuer;
        },
        getBalance() {
          return mintController.getAmount(purse);
        },
        deposit(amount, srcPaymentP) {
          return Promise.resolve(srcPaymentP).then(srcPayment => {
            return depositInto(purse, amount, srcPayment);
          });
        },
        depositAll(srcPaymentP) {
          return Promise.resolve(srcPaymentP).then(srcPayment => {
            return depositInto(
              purse,
              mintController.getAmount(srcPayment),
              srcPayment,
            );
          });
        },
        withdraw(amount, name = 'a withdrawal payment') {
          return takePayment(amount, true, purse, name);
        },
        withdrawAll(name = 'a withdrawal payment') {
          return takePayment(
            mintController.getAmount(purse),
            true,
            purse,
            name,
          );
        },
      });
      mintController.recordMint(purse, initialBalance);
      return purse;
    },
  });

  // TODO: pass along destroyMint capability too
  return mint;
}
harden(makeMint);

// Creates a local issuer that locally represents a remotely issued
// currency. Returns a promise for a peg object that asynchonously
// converts between the two. The local currency is synchronously
// transferable locally.
function makePeg(
  E,
  remoteIssuerP,
  makeMintController,
  makeAssay = makeNatAssay,
) {
  const remoteLabelP = E(remoteIssuerP).getLabel();

  // The remoteLabel is a local copy of the remote pass-by-copy
  // label. It has a presence of the remote issuer and a copy of the
  // description.
  return Promise.resolve(remoteLabelP).then(remoteLabel => {
    // Retaining remote currency deposits it in here.
    // Redeeming local currency withdraws remote from here.
    const backingPurseP = E(remoteIssuerP).makeEmptyPurse('backing');

    const { description } = remoteLabel;
    const localMint = makeMint(description, makeMintController, makeAssay);
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
          .burnAll(localPayment)
          .then(localAmount =>
            E(backingPurseP).withdraw(remoteAmountOf(localAmount), name),
          );
      },
    });
  });
}
harden(makePeg);

export { makeMint, makePeg };
