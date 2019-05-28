// Copyright (C) 2019 Agoric, under Apache License 2.0

import Nat from '@agoric/nat';
import harden from '@agoric/harden';

import { insist } from '../../collections/insist';
import {
  sameStructure,
  mustBeSameStructure,
  mustBeComparable,
} from '../../collections/sameStructure';

// This assays.js module treats labels as black boxes. It is not aware
// of issuers, and so can handle labels whose issuers are merely
// presences of remote issuers.

// Return an assay, which makes amounts, validates amounts, and
// provides set operations over amounts. An amount is a pass-by-copy
// description of some set of erights. An amount has a label and a
// quantity. All amounts made by the same assay have the same label
// but differ in quantity.
//
// An assay is pass-by-presence, but is not designed to be usefully
// passed. Rather, we expect each vat that needs to operate on amounts
// will have its own local assay to do so.
//
// The default assay makes the default kind of amount.  The default
// kind of amount is a labeled natural number describing a quantity of
// fungible erights. The label describes what kinds of rights these
// are. This is a form of labeled unit, as in unit typing.
function makeNatAssay(label) {
  mustBeComparable(label);

  // memoize well formedness check of amounts
  const brand = new WeakSet();

  const assay = harden({
    getLabel() {
      return label;
    },

    // Given the raw quantity that this kind of amount would label, return
    // an amount so labeling that quantity.
    make(allegedQuantity) {
      const amount = harden({ label, quantity: Nat(allegedQuantity) });
      brand.add(amount);
      return amount;
    },

    // Is this an amount object made by this assay? If so, return
    // it. Otherwise error.
    vouch(amount) {
      insist(brand.has(amount))`\
Unrecognized amount: ${amount}`;
      return amount;
    },

    // Is this like an amount object made by this assay, such as one
    // received by pass-by-copy from an otherwise-identical remote
    // amount? On success, return an amount object made by this
    // assay. Otherwise error.
    //
    // Until we have good support for pass-by-construction, the full
    // assay style is too awkward to use remotely. See
    // mintTestAssay. So coerce also accepts a bare number which it
    // will coerce to a labeled number via assay.make.
    coerce(allegedAmount) {
      if (typeof allegedAmount === 'number') {
        // Will throw on inappropriate number
        return assay.make(allegedAmount);
      }
      if (brand.has(allegedAmount)) {
        return allegedAmount;
      }
      const { label: allegedLabel, quantity } = allegedAmount;
      mustBeSameStructure(label, allegedLabel, 'Unrecognized label');
      // Will throw on inappropriate quantity
      return assay.make(quantity);
    },

    // Return the raw quantity that this amount labels.
    quantity(amount) {
      return assay.vouch(amount).quantity;
    },

    // Represents the empty set of erights, i.e., no erights
    empty() {
      return assay.make(0);
    },

    isEmpty(amount) {
      return assay.quantity(amount) === 0;
    },

    // Set inclusion of erights.
    // Does the set of erights described by `leftAmount` include all
    // the erights described by `rightAmount`?
    includes(leftAmount, rightAmount) {
      return assay.quantity(leftAmount) >= assay.quantity(rightAmount);
    },

    // Set union of erights.
    // Describe all the erights described by `leftAmount` and those
    // described by `rightAmount`.
    with(leftAmount, rightAmount) {
      return assay.make(
        assay.quantity(leftAmount) + assay.quantity(rightAmount),
      );
    },

    // Covering set subtraction of erights.
    // If leftAmount does not include rightAmount, error.
    // Describe the erights described by `leftAmount` and not described
    // by `rightAmount`.
    without(leftAmount, rightAmount) {
      return assay.make(
        assay.quantity(leftAmount) - assay.quantity(rightAmount),
      );
    },
  });
  return assay;
}
harden(makeNatAssay);

// A meta assay wraps those base assays returned by
// baseLabelToAssayFn. A meta amount's quantity is a base amount, or
// null for empty. Thus, different meta amounts that have the same
// meta label can contain different meta quantities, each of whom is a
// base amount with a different base label. The "single" qualifier
// here is for the restriction that a metaSingleAssay cannot combine
// base amounts with different base labels.
//
// TODO: Before we can make a more general meta assay, we need to
// recognize a ConstMap as a pass-by-copy object. Once we have that,
// we can have a meta amount be a ConstMap from base labels to base
// amounts.
//
// Since an empty meta amount has a null quantity rather than a base
// amount, it has no corresponding base assay.
function makeMetaSingleAssayMaker(baseLabelToAssayFn) {
  function makeMetaSingleAssay(metaLabel) {
    mustBeComparable(metaLabel);

    // memoize well formedness check of meta amounts.
    const metaBrand = new WeakSet();

    const metaEmptyAmount = harden({ label: metaLabel, quantity: null });
    metaBrand.add(metaEmptyAmount);

    const metaAssay = harden({
      getLabel() {
        return metaLabel;
      },

      // Given the raw quantity that this kind of amount would label, return
      // an amount so labeling that quantity.
      make(allegedBaseAmount) {
        if (allegedBaseAmount === null) {
          return metaEmptyAmount;
        }
        const baseAssay = baseLabelToAssayFn(allegedBaseAmount.label);
        insist(baseAssay !== undefined)`\
base label not found ${allegedBaseAmount}`;
        const baseAmount = baseAssay.make(allegedBaseAmount.quantity);
        if (baseAssay.isEmpty(baseAmount)) {
          return metaEmptyAmount;
        }
        const metaAmount = harden({ label: metaLabel, quantity: baseAmount });
        metaBrand.add(metaAmount);
        return metaAmount;
      },

      // Is this an amount object made by this assay? If so, return
      // it. Otherwise error.
      vouch(metaAmount) {
        insist(metaBrand.has(metaAmount))`\
Unrecognized metaAmount: ${metaAmount}`;
        return metaAmount;
      },

      // Is this like an amount object made by this assay, such as one
      // received by pass-by-copy from an otherwise-identical remote
      // amount? On success, return an amount object made by this
      // assay. Otherwise error.
      //
      // Until we have good support for pass-by-construction, the full
      // assay style is too awkward to use remotely. See
      // mintTestAssay. So coerce also accepts a bare number which it
      // will coerce to a labeled number via metaAssay.make.
      coerce(allegedMetaAmount) {
        if (metaBrand.has(allegedMetaAmount)) {
          return allegedMetaAmount;
        }
        const {
          label: allegedMetaLabel,
          quantity: allegedBaseAmount,
        } = allegedMetaAmount;
        mustBeSameStructure(
          metaLabel,
          allegedMetaLabel,
          'Unrecognized meta label',
        );
        // Will throw on inappropriate quantity
        return metaAssay.make(allegedBaseAmount);
      },

      // Return the raw quantity that this meta amount labels. This
      // will be either null or a base amount with a label recognized
      // by baseLabelToAssayFn.
      quantity(metaAmount) {
        return metaAssay.vouch(metaAmount).quantity;
      },

      // The meta empty amount has a quantity of null, rather than a
      // base amount.
      empty() {
        return metaEmptyAmount;
      },

      isEmpty(metaAmount) {
        const baseAmount = metaAssay.quantity(metaAmount);
        if (baseAmount === null) {
          insist(metaAmount === metaEmptyAmount)`\
The empty meta amount should be unique`;
          return true;
        }
        const baseAssay = baseLabelToAssayFn(baseAmount.label);
        insist(!baseAssay.isEmpty(baseAmount))`\
Empty base amount should be canonicalized as a null meta quantity`;
        return false;
      },

      // Set inclusion of erights.
      // Does the set of erights described by `leftAmount` include all
      // the erights described by `rightAmount`?
      includes(leftMetaAmount, rightMetaAmount) {
        if (metaAssay.isEmpty(rightMetaAmount)) {
          return true;
        }
        if (metaAssay.isEmpty(leftMetaAmount)) {
          return false;
        }
        const leftBaseAmount = leftMetaAmount.quantity;
        const leftBaseLabel = leftBaseAmount.label;
        const rightBaseAmount = rightMetaAmount.quantity;
        const rightBaseLabel = rightBaseAmount.label;

        if (!sameStructure(leftBaseLabel, rightBaseLabel)) {
          return false;
        }
        const baseAssay = baseLabelToAssayFn(leftBaseLabel);
        return baseAssay.includes(leftBaseAmount, rightBaseAmount);
      },

      // Set union of erights.
      // Describe all the erights described by `leftAmount` and those
      // described by `rightAmount`.
      with(leftMetaAmount, rightMetaAmount) {
        if (metaAssay.isEmpty(leftMetaAmount)) {
          return rightMetaAmount;
        }
        if (metaAssay.isEmpty(rightMetaAmount)) {
          return leftMetaAmount;
        }
        const leftBaseAmount = leftMetaAmount.quantity;
        const leftBaseLabel = leftBaseAmount.label;
        const rightBaseAmount = rightMetaAmount.quantity;
        const rightBaseLabel = rightBaseAmount.label;

        mustBeSameStructure(
          leftBaseLabel,
          rightBaseLabel,
          'Cannot combine different base rights',
        );
        const baseAssay = baseLabelToAssayFn(leftBaseLabel);

        return metaAssay.make(baseAssay.with(leftBaseAmount, rightBaseAmount));
      },

      // Covering set subtraction of erights.
      // If leftAmount does not include rightAmount, error.
      // Describe the erights described by `leftAmount` and not described
      // by `rightAmount`.
      without(leftMetaAmount, rightMetaAmount) {
        if (metaAssay.isEmpty(rightMetaAmount)) {
          return leftMetaAmount;
        }
        insist(!metaAssay.isEmpty(leftMetaAmount))`\
empty left meta assay does not include ${rightMetaAmount}`;

        const leftBaseAmount = leftMetaAmount.quantity;
        const leftBaseLabel = leftBaseAmount.label;
        const rightBaseAmount = rightMetaAmount.quantity;
        const rightBaseLabel = rightBaseAmount.label;

        mustBeSameStructure(
          leftBaseLabel,
          rightBaseLabel,
          'Cannot subtract different base rights',
        );
        const baseAssay = baseLabelToAssayFn(leftBaseLabel);

        return metaAssay.make(
          baseAssay.without(leftBaseAmount, rightBaseAmount),
        );
      },
    });
    return metaAssay;
  }
  return harden(makeMetaSingleAssay);
}
harden(makeMetaSingleAssayMaker);

export { makeNatAssay, makeMetaSingleAssayMaker };
