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
    makeIssuerTrait,
    makePaymentTrait,
    makePurseTrait,
    makeMintTrait,
    makeMintKeeper,
    makeAssay,
  } = makeConfig();

  // Methods like depositExactly() pass in an amount which is supposed
  // to be equal to the balance of the payment. These methods
  // use this helper function to check that the amount is equal
  function insistAmountEqualsPaymentBalance(amount, payment) {
    amount = assay.coerce(amount);
    const paymentAmount = paymentKeeper.getAmount(payment);
    insist(
      assay.equals(amount, paymentAmount),
    )`payment balance ${paymentAmount} must equal amount ${amount}`;
    return paymentAmount;
  }

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

    // makePaymentTrait is defined in the passed-in configuration and adds
    // additional methods to corePayment
    const payment = harden({
      ...makePaymentTrait(corePayment, issuer),
      ...corePayment,
    });

    // ///////////////// commit point //////////////////
    // All queries above passed with no side effects.
    // During side effects below, any early exits should be made into
    // fatal turn aborts.
    paymentKeeper.recordNew(payment, paymentAmount);
    srcKeeper.updateAmount(assetSrc, newSrcAmount);
    return payment;
  }

  // takePaymentAndKill works like takePayment, but it kills the
  // oldPayment (assetSrc) rather than reducing its balance.
  function takePaymentAndKill(oldPayment, name) {
    name = `${name}`;
    const paymentAmount = paymentKeeper.getAmount(oldPayment);

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
    // makePaymentTrait is defined in the passed-in configuration and adds
    // additional methods to corePayment
    const payment = harden({
      ...makePaymentTrait(corePayment, issuer),
      ...corePayment,
    });

    // ///////////////// commit point //////////////////
    // All queries above passed with no side effects.
    // During side effects below, any early exits should be made into
    // fatal turn aborts.
    paymentKeeper.recordNew(payment, paymentAmount);
    paymentKeeper.remove(oldPayment);
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

    combine(paymentsArray, name = 'combined payment') {
      const totalAmount = paymentsArray.reduce((soFar, payment) => {
        return assay.with(soFar, paymentKeeper.getAmount(payment));
      }, assay.empty());

      const combinedPayment = harden({
        getIssuer() {
          return issuer;
        },
        getBalance() {
          return paymentKeeper.getAmount(combinedPayment);
        },
        getName() {
          return name;
        },
      });

      // ///////////////// commit point //////////////////
      // All queries above passed with no side effects.
      // During side effects below, any early exits should be made into
      // fatal turn aborts.
      for (const payment of paymentsArray) {
        paymentKeeper.remove(payment);
      }
      paymentKeeper.recordNew(combinedPayment, totalAmount);
      return combinedPayment;
    },

    split(payment, amountsArray, namesArray) {
      namesArray =
        namesArray !== undefined
          ? namesArray
          : Array(amountsArray.length).fill('a split payment');
      insist(
        amountsArray.length === namesArray.length,
      )`the amounts and names should have the same length`;

      const paymentMinusAmounts = amountsArray.reduce((soFar, amount) => {
        return assay.without(soFar, amount);
      }, paymentKeeper.getAmount(payment));

      insist(
        assay.isEmpty(paymentMinusAmounts),
      )`the amounts of the proposed new payments do not equal the amount of the source payment`;

      // ///////////////// commit point //////////////////
      // All queries above passed with no side effects.
      // During side effects below, any early exits should be made into
      // fatal turn aborts.

      const newPayments = [];

      for (let i = 0; i < amountsArray.length; i += 1) {
        newPayments.push(
          takePayment(payment, paymentKeeper, amountsArray[i], namesArray[i]),
        );
      }
      paymentKeeper.remove(payment);
      return harden(newPayments);
    },

    claimExactly(amount, srcPaymentP, name) {
      return Promise.resolve(srcPaymentP).then(srcPayment => {
        insistAmountEqualsPaymentBalance(amount, srcPayment);
        name = name !== undefined ? name : srcPayment.getName(); // use old name
        return takePaymentAndKill(srcPayment, name);
      });
    },

    claimAll(srcPaymentP, name) {
      return Promise.resolve(srcPaymentP).then(srcPayment => {
        name = name !== undefined ? name : srcPayment.getName(); // use old name
        return takePaymentAndKill(srcPayment, name);
      });
    },

    burnExactly(amount, srcPaymentP) {
      const sinkPurse = coreIssuer.makeEmptyPurse('sink purse');
      return sinkPurse.depositExactly(amount, srcPaymentP);
    },

    burnAll(srcPaymentP) {
      const sinkPurse = coreIssuer.makeEmptyPurse('sink purse');
      return sinkPurse.depositAll(srcPaymentP);
    },
  });

  // makeIssuerTrait is defined in the passed-in configuration and adds
  // additional methods to coreIssuer.
  const issuer = harden({
    ...makeIssuerTrait(coreIssuer),
    ...coreIssuer,
  });

  const label = harden({ issuer, description });

  const assay = makeAssay(label);
  const mintKeeper = makeMintKeeper(assay);
  const { purseKeeper, paymentKeeper } = mintKeeper;

  // depositInto always deposits the entire payment amount
  function depositInto(purse, payment) {
    const oldPurseAmount = purseKeeper.getAmount(purse);
    const paymentAmount = paymentKeeper.getAmount(payment);
    // Also checks that the union is representable
    const newPurseAmount = assay.with(oldPurseAmount, paymentAmount);

    // ///////////////// commit point //////////////////
    // All queries above passed with no side effects.
    // During side effects below, any early exits should be made into
    // fatal turn aborts.
    paymentKeeper.remove(payment);
    purseKeeper.updateAmount(purse, newPurseAmount);

    return paymentAmount;
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
        depositExactly(amount, srcPaymentP) {
          return Promise.resolve(srcPaymentP).then(srcPayment => {
            insistAmountEqualsPaymentBalance(amount, srcPayment);
            return depositInto(purse, srcPayment);
          });
        },
        depositAll(srcPaymentP) {
          return Promise.resolve(srcPaymentP).then(srcPayment => {
            return depositInto(purse, srcPayment);
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

      // makePurseTrait is defined in the passed-in configuration and
      // adds additional methods to corePurse
      const purse = harden({
        ...makePurseTrait(corePurse, issuer),
        ...corePurse,
      });

      purseKeeper.recordNew(purse, initialBalance);
      return purse;
    },
  });

  // makeMintTrait is defined in the passed-in configuration and
  // adds additional methods to coreMint
  const mint = harden({
    ...makeMintTrait(coreMint, issuer, assay, mintKeeper),
    ...coreMint,
  });

  return mint;
}
harden(makeMint);

export { makeMint };
