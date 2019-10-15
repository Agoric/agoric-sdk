/* eslint no-use-before-define: 0 */ // => OFF
// Copyright (C) 2019 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

import { insist } from '../util/insist';
import { makeBasicFungibleConfig } from './config/basicFungibleConfig';
import { makeDescOps } from './descOps';

/**
 * makeMint takes in a string description as well as a function to
 * make a configuration. This configuration can be used to add custom
 * methods to assays, payments, purses, and mints, and it also
 * defines the functions to make the "mintKeeper" (the actual holder
 * of the mappings from purses/payments to assetDescs) and to make the
 * "descOps" (the object that describes the extentOps of how assetDescs are
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
    makeAssayTrait,
    makePaymentTrait,
    makePurseTrait,
    makeMintTrait,
    makeMintKeeper,
    extentOpsName,
    extentOpsArgs,
  } = makeConfig();

  // Methods like depositExactly() pass in an assetDesc which is supposed
  // to be equal to the balance of the payment. These methods
  // use this helper function to check that the assetDesc is equal
  function insistAssetDescEqualsPaymentBalance(assetDesc, payment) {
    assetDesc = descOps.coerce(assetDesc);
    const paymentAssetDesc = paymentKeeper.getAssetDesc(payment);
    insist(
      descOps.equals(assetDesc, paymentAssetDesc),
    )`payment balance ${paymentAssetDesc} must equal assetDesc ${assetDesc}`;
    return paymentAssetDesc;
  }

  // assetSrc is a purse or payment. Return a fresh payment.  One internal
  // function used for both cases, since they are so similar.
  function takePayment(assetHolderSrc, srcKeeper, paymentAssetDesc, name) {
    name = `${name}`;
    paymentAssetDesc = descOps.coerce(paymentAssetDesc);
    const oldSrcAssetDesc = srcKeeper.getAssetDesc(assetHolderSrc);
    const newSrcAssetDesc = descOps.without(oldSrcAssetDesc, paymentAssetDesc);

    const corePayment = harden({
      getAssay() {
        return assay;
      },
      getBalance() {
        return paymentKeeper.getAssetDesc(payment);
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
    paymentKeeper.recordNew(payment, paymentAssetDesc);
    srcKeeper.updateAssetDesc(assetHolderSrc, newSrcAssetDesc);
    return payment;
  }

  // takePaymentAndKill works like takePayment, but it kills the
  // oldPayment (assetSrc) rather than reducing its balance.
  function takePaymentAndKill(oldPayment, name) {
    name = `${name}`;
    const paymentAssetDesc = paymentKeeper.getAssetDesc(oldPayment);

    const corePayment = harden({
      getAssay() {
        return assay;
      },
      getBalance() {
        return paymentKeeper.getAssetDesc(payment);
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
    paymentKeeper.recordNew(payment, paymentAssetDesc);
    paymentKeeper.remove(oldPayment);
    return payment;
  }

  const coreAssay = harden({
    getLabel() {
      return descOps.getLabel();
    },

    getDescOps() {
      return descOps;
    },

    getExtentOps() {
      return descOps.getExtentOps();
    },

    makeAssetDesc(extent) {
      return descOps.make(extent);
    },

    makeEmptyPurse(name = 'a purse') {
      return mint.mint(descOps.empty(), name); // mint and assay call each other
    },

    combine(paymentsArray, name = 'combined payment') {
      const totalAssetDesc = paymentsArray.reduce((soFar, payment) => {
        return descOps.with(soFar, paymentKeeper.getAssetDesc(payment));
      }, descOps.empty());

      const combinedPayment = harden({
        getAssay() {
          return assay;
        },
        getBalance() {
          return paymentKeeper.getAssetDesc(combinedPayment);
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
      paymentKeeper.recordNew(combinedPayment, totalAssetDesc);
      return combinedPayment;
    },

    split(payment, assetDescsArray, namesArray) {
      namesArray =
        namesArray !== undefined
          ? namesArray
          : Array(assetDescsArray.length).fill('a split payment');
      insist(
        assetDescsArray.length === namesArray.length,
      )`the assetDescs and names should have the same length`;

      const paymentMinusAssetDescs = assetDescsArray.reduce(
        (soFar, assetDesc) => {
          assetDesc = descOps.coerce(assetDesc);
          return descOps.without(soFar, assetDesc);
        },
        paymentKeeper.getAssetDesc(payment),
      );

      insist(
        descOps.isEmpty(paymentMinusAssetDescs),
      )`the assetDescs of the proposed new payments do not equal the assetDesc of the source payment`;

      // ///////////////// commit point //////////////////
      // All queries above passed with no side effects.
      // During side effects below, any early exits should be made into
      // fatal turn aborts.

      const newPayments = [];

      for (let i = 0; i < assetDescsArray.length; i += 1) {
        newPayments.push(
          takePayment(
            payment,
            paymentKeeper,
            assetDescsArray[i],
            namesArray[i],
          ),
        );
      }
      paymentKeeper.remove(payment);
      return harden(newPayments);
    },

    claimExactly(assetDesc, srcPaymentP, name) {
      return Promise.resolve(srcPaymentP).then(srcPayment => {
        insistAssetDescEqualsPaymentBalance(assetDesc, srcPayment);
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

    burnExactly(assetDesc, srcPaymentP) {
      const sinkPurse = coreAssay.makeEmptyPurse('sink purse');
      return sinkPurse.depositExactly(assetDesc, srcPaymentP);
    },

    burnAll(srcPaymentP) {
      const sinkPurse = coreAssay.makeEmptyPurse('sink purse');
      return sinkPurse.depositAll(srcPaymentP);
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

  const label = harden({ assay, description });

  const descOps = makeDescOps(label, extentOpsName, extentOpsArgs);
  const mintKeeper = makeMintKeeper(descOps);
  const { purseKeeper, paymentKeeper } = mintKeeper;

  // depositInto always deposits the entire payment assetDesc
  function depositInto(purse, payment) {
    const oldPurseAssetDesc = purseKeeper.getAssetDesc(purse);
    const paymentAssetDesc = paymentKeeper.getAssetDesc(payment);
    // Also checks that the union is representable
    const newPurseAssetDesc = descOps.with(oldPurseAssetDesc, paymentAssetDesc);

    // ///////////////// commit point //////////////////
    // All queries above passed with no side effects.
    // During side effects below, any early exits should be made into
    // fatal turn aborts.
    paymentKeeper.remove(payment);
    purseKeeper.updateAssetDesc(purse, newPurseAssetDesc);

    return paymentAssetDesc;
  }

  const coreMint = harden({
    getAssay() {
      return assay;
    },
    mint(initialBalance, name = 'a purse') {
      initialBalance = descOps.coerce(initialBalance);
      name = `${name}`;

      const corePurse = harden({
        getName() {
          return name;
        },
        getAssay() {
          return assay;
        },
        getBalance() {
          return purseKeeper.getAssetDesc(purse);
        },
        depositExactly(assetDesc, srcPaymentP) {
          return Promise.resolve(srcPaymentP).then(srcPayment => {
            insistAssetDescEqualsPaymentBalance(assetDesc, srcPayment);
            return depositInto(purse, srcPayment);
          });
        },
        depositAll(srcPaymentP) {
          return Promise.resolve(srcPaymentP).then(srcPayment => {
            return depositInto(purse, srcPayment);
          });
        },
        withdraw(assetDesc, paymentName = 'a withdrawal payment') {
          return takePayment(purse, purseKeeper, assetDesc, paymentName);
        },
        withdrawAll(paymentName = 'a withdrawal payment') {
          return takePayment(
            purse,
            purseKeeper,
            purseKeeper.getAssetDesc(purse),
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
  const makeMintTraitIter = makeMintTrait(coreMint, assay, descOps, mintKeeper);
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
