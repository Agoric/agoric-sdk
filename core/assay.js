import harden from '@agoric/harden';

import { insist } from '../util/insist';
import { mustBeSameStructure, mustBeComparable } from '../util/sameStructure';

// This module treats labels as black boxes. It is not aware
// of issuers, and so can handle labels whose issuers are merely
// presences of remote issuers.

// `makeAssayMaker` takes in a 'strategy' object which defines set
// operations for a particular kind of assay. For instance, for the
// natAssay, these operations are arithmetic.

// Return an assay, which makes amounts, validates amounts, and
// provides set operations over amounts. An amount is a pass-by-copy
// description of some set of erights. An amount has a label and a
// quantity. All amounts made by the same assay have the same label
// but differ in quantity.
//
// An assay is pass-by-presence, but is not designed to be usefully
// passed. Rather, we expect each vat that needs to operate on amounts
// will have its own local assay to do so.

function makeAssay(label, strategy) {
  mustBeComparable(label);

  // The brand represents recognition of the amount as authorized.
  const brand = new WeakSet();

  const assay = harden({
    getLabel() {
      return label;
    },

    getStrategy() {
      return strategy;
    },

    // Given the raw quantity that this kind of amount would label, return
    // an amount so labeling that quantity.
    make(allegedQuantity) {
      strategy.insistKind(allegedQuantity);
      const amount = harden({
        label,
        quantity: allegedQuantity,
      });
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
    coerce(allegedAmount) {
      if (brand.has(allegedAmount)) {
        return allegedAmount;
      }
      if (!Object.prototype.hasOwnProperty.call(allegedAmount, 'quantity')) {
        // This is not an amount. Let's see if it's a quantity. Will
        // throw on inappropriate quantity.
        return assay.make(allegedAmount);
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
      return assay.make(strategy.empty());
    },

    isEmpty(amount) {
      return strategy.isEmpty(assay.quantity(amount));
    },

    // Set inclusion of erights.
    // Does the set of erights described by `leftAmount` include all
    // the erights described by `rightAmount`?
    includes(leftAmount, rightAmount) {
      const leftQuantity = assay.quantity(leftAmount);
      const rightQuantity = assay.quantity(rightAmount);
      return strategy.includes(leftQuantity, rightQuantity);
    },

    equals(leftAmount, rightAmount) {
      const leftQuantity = assay.quantity(leftAmount);
      const rightQuantity = assay.quantity(rightAmount);
      return strategy.equals(leftQuantity, rightQuantity);
    },

    // Set union of erights.
    // Combine the amounts described by 'leftAmount' and 'rightAmount'.
    with(leftAmount, rightAmount) {
      const leftQuantity = assay.quantity(leftAmount);
      const rightQuantity = assay.quantity(rightAmount);
      return assay.make(strategy.with(leftQuantity, rightQuantity));
    },

    // Covering set subtraction of erights.
    // If leftAmount does not include rightAmount, error.
    // Return the amount included in 'leftAmount' but not included in 'rightAmount'.
    without(leftAmount, rightAmount) {
      const leftQuantity = assay.quantity(leftAmount);
      const rightQuantity = assay.quantity(rightAmount);
      return assay.make(strategy.without(leftQuantity, rightQuantity));
    },
  });
  return assay;
}
harden(makeAssay);

export { makeAssay };
