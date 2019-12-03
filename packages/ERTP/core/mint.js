/* eslint no-use-before-define: 0 */ // => OFF
// Copyright (C) 2019 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

import { insist } from '../util/insist';
import { makeBasicFungibleConfig } from './config/basicFungibleConfig';
import { makeUnitOps } from './unitOps';

/**
 * makeMint takes in an allegedName as well as a function to
 * make a configuration. This configuration can be used to add custom
 * methods to assays, payments, purses, and mints, and it also
 * defines the functions to make the "mintKeeper" (the actual holder
 * of the mappings from purses/payments to units) and to make the
 * "unitOps" (the object that describes the extentOps of how units are
 * withdrawn or deposited, among other things).
 * @param  {string} allegedName
 * @param  {function} makeConfig=makeBasicFungibleConfig
 */
function makeMint(allegedName, makeConfig = makeBasicFungibleConfig) {
  insist(allegedName)`\
allegedName must be truthy: ${allegedName}`;

  // Each of these methods is used below and must be defined (even in
  // a trivial way) in any configuration
  const {
    makeAssayTrait,
    makePaymentTrait,
    makePurseTrait,
    makeMintTrait,
    makeMintKeeper,
    extentOpsName,
    extentOpsArgs,
  } = makeConfig();

  // Methods like depositExactly() pass in a units which is supposed
  // to be equal to the balance of the payment. These methods
  // use this helper function to check that the units is equal
  function insistUnitsEqualsPaymentBalance(units, payment) {
    units = unitOps.coerce(units);
    const paymentUnits = paymentKeeper.getUnits(payment);
    insist(
      unitOps.equals(units, paymentUnits),
    )`payment balance ${paymentUnits} must equal units ${units}`;
    return paymentUnits;
  }

  // assetSrc is a purse or payment. Return a fresh payment.  One internal
  // function used for both cases, since they are so similar.
  function takePayment(assetHolderSrc, srcKeeper, paymentUnits, name) {
    name = `${name}`;
    paymentUnits = unitOps.coerce(paymentUnits);
    const oldSrcUnits = srcKeeper.getUnits(assetHolderSrc);
    const newSrcUnits = unitOps.without(oldSrcUnits, paymentUnits);

    const corePayment = harden({
      getAssay() {
        return assay;
      },
      getBalance() {
        return paymentKeeper.getUnits(payment);
      },
      getName() {
        return name;
      },
    });

    // makePaymentTrait is defined in the passed-in configuration and adds
    // additional methods to corePayment
    const makePaymentTraitIter = makePaymentTrait(corePayment, assay);
    const paymentTrait = makePaymentTraitIter.next().value;
    const payment = harden({
      ...paymentTrait,
      ...corePayment,
    });
    makePaymentTraitIter.next(payment);

    // ///////////////// commit point //////////////////
    // All queries above passed with no side effects.
    // During side effects below, any early exits should be made into
    // fatal turn aborts.
    paymentKeeper.recordNew(payment, paymentUnits);
    srcKeeper.updateUnits(assetHolderSrc, newSrcUnits);
    return payment;
  }

  // takePaymentAndKill works like takePayment, but it kills the
  // oldPayment (assetSrc) rather than reducing its balance.
  function takePaymentAndKill(oldPayment, name) {
    name = `${name}`;
    const paymentUnits = paymentKeeper.getUnits(oldPayment);

    const corePayment = harden({
      getAssay() {
        return assay;
      },
      getBalance() {
        return paymentKeeper.getUnits(payment);
      },
      getName() {
        return name;
      },
    });
    // makePaymentTrait is defined in the passed-in configuration and adds
    // additional methods to corePayment
    const makePaymentTraitIter = makePaymentTrait(corePayment, assay);
    const paymentTrait = makePaymentTraitIter.next().value;
    const payment = harden({
      ...paymentTrait,
      ...corePayment,
    });
    makePaymentTraitIter.next(payment);

    // ///////////////// commit point //////////////////
    // All queries above passed with no side effects.
    // During side effects below, any early exits should be made into
    // fatal turn aborts.
    paymentKeeper.recordNew(payment, paymentUnits);
    paymentKeeper.remove(oldPayment);
    return payment;
  }

  const coreAssay = harden({
    getLabel() {
      return unitOps.getLabel();
    },

    getUnitOps() {
      return unitOps;
    },

    getExtentOps() {
      return unitOps.getExtentOps();
    },

    makeUnits(extent) {
      return unitOps.make(extent);
    },

    makeEmptyPurse(name = 'a purse') {
      return mint.mint(unitOps.empty(), name); // mint and assay call each other
    },

    combine(paymentsArray, name = 'combined payment') {
      const totalUnits = paymentsArray.reduce((soFar, payment) => {
        return unitOps.with(soFar, paymentKeeper.getUnits(payment));
      }, unitOps.empty());

      const combinedPayment = harden({
        getAssay() {
          return assay;
        },
        getBalance() {
          return paymentKeeper.getUnits(combinedPayment);
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
      paymentKeeper.recordNew(combinedPayment, totalUnits);
      return combinedPayment;
    },

    split(payment, unitsArray, namesArray) {
      namesArray =
        namesArray !== undefined
          ? namesArray
          : Array(unitsArray.length).fill('a split payment');
      insist(
        unitsArray.length === namesArray.length,
      )`the units and names should have the same length`;

      const paymentMinusUnits = unitsArray.reduce((soFar, units) => {
        units = unitOps.coerce(units);
        return unitOps.without(soFar, units);
      }, paymentKeeper.getUnits(payment));

      insist(
        unitOps.isEmpty(paymentMinusUnits),
      )`the units of the proposed new payments do not equal the units of the source payment`;

      // ///////////////// commit point //////////////////
      // All queries above passed with no side effects.
      // During side effects below, any early exits should be made into
      // fatal turn aborts.

      const newPayments = [];

      for (let i = 0; i < unitsArray.length; i += 1) {
        newPayments.push(
          takePayment(payment, paymentKeeper, unitsArray[i], namesArray[i]),
        );
      }
      paymentKeeper.remove(payment);
      return harden(newPayments);
    },

    claimExactly(units, srcPaymentP, name) {
      return Promise.resolve(srcPaymentP).then(srcPayment => {
        insistUnitsEqualsPaymentBalance(units, srcPayment);
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

    burnExactly(units, srcPaymentP) {
      return Promise.resolve(srcPaymentP).then(srcPayment => {
        insistUnitsEqualsPaymentBalance(units, srcPayment);
        const paymentUnits = paymentKeeper.getUnits(srcPayment);
        paymentKeeper.remove(srcPayment);
        return paymentUnits;
      });
    },

    burnAll(srcPaymentP) {
      return Promise.resolve(srcPaymentP).then(srcPayment => {
        const paymentUnits = paymentKeeper.getUnits(srcPayment);
        paymentKeeper.remove(srcPayment);
        return paymentUnits;
      });
    },
  });

  // makeAssayTrait is defined in the passed-in configuration and adds
  // additional methods to coreAssay.
  const makeAssayTraitIter = makeAssayTrait(coreAssay);
  const assayTrait = makeAssayTraitIter.next().value;
  const assay = harden({
    ...assayTrait,
    ...coreAssay,
  });
  makeAssayTraitIter.next(assay);

  const label = harden({ assay, allegedName });

  const unitOps = makeUnitOps(label, extentOpsName, extentOpsArgs);
  const mintKeeper = makeMintKeeper(unitOps);
  const { purseKeeper, paymentKeeper } = mintKeeper;

  // depositInto always deposits the entire payment units
  function depositInto(purse, payment) {
    const oldPurseUnits = purseKeeper.getUnits(purse);
    const paymentUnits = paymentKeeper.getUnits(payment);
    // Also checks that the union is representable
    const newPurseUnits = unitOps.with(oldPurseUnits, paymentUnits);

    // ///////////////// commit point //////////////////
    // All queries above passed with no side effects.
    // During side effects below, any early exits should be made into
    // fatal turn aborts.
    paymentKeeper.remove(payment);
    purseKeeper.updateUnits(purse, newPurseUnits);

    return paymentUnits;
  }

  const coreMint = harden({
    getAssay() {
      return assay;
    },
    mint(initialBalance, name = 'a purse') {
      initialBalance = unitOps.coerce(initialBalance);
      name = `${name}`;

      const corePurse = harden({
        getName() {
          return name;
        },
        getAssay() {
          return assay;
        },
        getBalance() {
          return purseKeeper.getUnits(purse);
        },
        depositExactly(units, srcPaymentP) {
          return Promise.resolve(srcPaymentP).then(srcPayment => {
            insistUnitsEqualsPaymentBalance(units, srcPayment);
            return depositInto(purse, srcPayment);
          });
        },
        depositAll(srcPaymentP) {
          return Promise.resolve(srcPaymentP).then(srcPayment => {
            return depositInto(purse, srcPayment);
          });
        },
        withdraw(units, paymentName = 'a withdrawal payment') {
          return takePayment(purse, purseKeeper, units, paymentName);
        },
        withdrawAll(paymentName = 'a withdrawal payment') {
          return takePayment(
            purse,
            purseKeeper,
            purseKeeper.getUnits(purse),
            paymentName,
          );
        },
      });

      // makePurseTrait is defined in the passed-in configuration and
      // adds additional methods to corePurse
      const makePurseTraitIter = makePurseTrait(corePurse, assay);
      const purseTrait = makePurseTraitIter.next().value;
      const purse = harden({
        ...purseTrait,
        ...corePurse,
      });
      makePurseTraitIter.next(purse);

      purseKeeper.recordNew(purse, initialBalance);
      return purse;
    },
  });

  // makeMintTrait is defined in the passed-in configuration and
  // adds additional methods to coreMint
  const makeMintTraitIter = makeMintTrait(coreMint, assay, unitOps, mintKeeper);
  const mintTrait = makeMintTraitIter.next().value;
  const mint = harden({
    ...mintTrait,
    ...coreMint,
  });
  makeMintTraitIter.next(mint);

  return mint;
}
harden(makeMint);

export { makeMint };
