/* eslint no-use-before-define: 0 */ // => OFF
// Copyright (C) 2019 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

import { insist } from '../util/insist';
import { makeBasicFungibleConfig } from './config/basicFungibleConfig';

/**
 * makeMint takes in a string description as well as a function to
 * make a configuration. This configuration can be used to add custom
 * methods to issuers, payments, purses, and mints, and it also
 * defines the functions to make the "mintKeeper" (the actual holder
 * of the mappings from purses/payments to amounts) and to make the
 * "assay" (the object that describes the logic of how amounts are
 * withdrawn or deposited, among other things).
 * @param  {string} description
 * @param  {function} makeConfig=makeBasicFungibleConfig
 */
function makeMint(description, makeConfig = makeBasicFungibleConfig) {
  insist(description)`\
Description must be truthy: ${description}`;

  // Each of these methods is used below and must be defined (even in
  // a trivial way) in any configuration
  const {
    makeCustomIssuer,
    makeCustomPayment,
    makeCustomPurse,
    makeCustomMint,
    makeMintKeeper,
    makeAssay,
  } = makeConfig();

  // assetSrc is a purse or payment. Return a fresh payment.  One internal
  // function used for both cases, since they are so similar.
  function takePayment(assetSrc, srcKeeper, paymentAmount, name) {
    name = `${name}`;
    paymentAmount = assay.coerce(paymentAmount);
    const oldSrcAmount = srcKeeper.getAmount(assetSrc);
    const newSrcAmount = assay.without(oldSrcAmount, paymentAmount);

    const corePayment = harden({
      getIssuer() {
        return issuer;
      },
      getBalance() {
        return paymentKeeper.getAmount(payment);
      },
      getName() {
        return name;
      },
    });

    // makeCustomPayment is defined in the passed-in configuration and
    // allows for the customization of the payment, including adding
    // additional methods
    const payment = makeCustomPayment(corePayment, issuer);

    // ///////////////// commit point //////////////////
    // All queries above passed with no side effects.
    // During side effects below, any early exits should be made into
    // fatal turn aborts.
    paymentKeeper.recordNew(payment, paymentAmount);
    srcKeeper.updateAmount(assetSrc, newSrcAmount);
    return payment;
  }

  const coreIssuer = harden({
    getLabel() {
      return assay.getLabel();
    },

    getAssay() {
      return assay;
    },

    makeAmount(quantity) {
      return assay.make(quantity);
    },

    makeEmptyPurse(name = 'a purse') {
      return mint.mint(assay.empty(), name); // mint and issuer call each other
    },

    getExclusive(amount, srcPaymentP, name) {
      return Promise.resolve(srcPaymentP).then(srcPayment => {
        name = name !== undefined ? name : srcPayment.getName(); // use old name
        return takePayment(srcPayment, paymentKeeper, amount, name);
      });
    },

    getExclusiveAll(srcPaymentP, name) {
      return Promise.resolve(srcPaymentP).then(srcPayment => {
        name = name !== undefined ? name : srcPayment.getName(); // use old name
        return takePayment(
          srcPayment,
          paymentKeeper,
          paymentKeeper.getAmount(srcPayment),
          name,
        );
      });
    },

    burn(amount, srcPaymentP) {
      // We deposit the alleged payment, rather than just doing a get
      // exclusive on it, in order to consume the usage erights as well.
      const sinkPurse = coreIssuer.makeEmptyPurse('sink purse');
      return sinkPurse.deposit(amount, srcPaymentP);
    },

    burnAll(srcPaymentP) {
      const sinkPurse = coreIssuer.makeEmptyPurse('sink purse');
      return sinkPurse.depositAll(srcPaymentP);
    },
  });

  // makeCustomIssuer is defined in the passed-in configuration and
  // allows for the customization of the issuer, including adding
  // additional methods
  const issuer = makeCustomIssuer(coreIssuer);

  const label = harden({ issuer, description });

  const assay = makeAssay(label);
  const mintKeeper = makeMintKeeper(assay);
  const { purseKeeper, paymentKeeper } = mintKeeper;

  function depositInto(purse, amount, payment) {
    amount = assay.coerce(amount);
    const oldPurseAmount = purseKeeper.getAmount(purse);
    const oldPaymentAmount = paymentKeeper.getAmount(payment);
    // Also checks that the union is representable
    const newPurseAmount = assay.with(oldPurseAmount, amount);
    const newPaymentAmount = assay.without(oldPaymentAmount, amount);

    // ///////////////// commit point //////////////////
    // All queries above passed with no side effects.
    // During side effects below, any early exits should be made into
    // fatal turn aborts.
    paymentKeeper.updateAmount(payment, newPaymentAmount);
    purseKeeper.updateAmount(purse, newPurseAmount);

    return amount;
  }

  const coreMint = harden({
    getIssuer() {
      return issuer;
    },
    mint(initialBalance, name = 'a purse') {
      initialBalance = assay.coerce(initialBalance);
      name = `${name}`;

      const corePurse = harden({
        getName() {
          return name;
        },
        getIssuer() {
          return issuer;
        },
        getBalance() {
          return purseKeeper.getAmount(purse);
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
              paymentKeeper.getAmount(srcPayment),
              srcPayment,
            );
          });
        },
        withdraw(amount, paymentName = 'a withdrawal payment') {
          return takePayment(purse, purseKeeper, amount, paymentName);
        },
        withdrawAll(paymentName = 'a withdrawal payment') {
          return takePayment(
            purse,
            purseKeeper,
            purseKeeper.getAmount(purse),
            paymentName,
          );
        },
      });

      // makeCustomPurse is defined in the passed-in configuration and
      // allows for the customization of the purse, including adding
      // additional methods
      const purse = makeCustomPurse(corePurse, issuer);
      purseKeeper.recordNew(purse, initialBalance);
      return purse;
    },
  });

  // makeCustomMint is defined in the passed-in configuration and
  // allows for the customization of the mint, including adding
  // additional methods
  const mint = makeCustomMint(coreMint, issuer, assay, mintKeeper);

  return mint;
}
harden(makeMint);

export { makeMint };
