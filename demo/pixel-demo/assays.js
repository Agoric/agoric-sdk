// Copyright (C) 2019 Agoric, under Apache License 2.0

import Nat from '@agoric/nat';
import harden from '@agoric/harden';

import { insist } from '../../collections/insist';
import {
  sameStructure,
  mustBeSameStructure,
  mustBeComparable,
} from '../../collections/sameStructure';

import {
  insistPixelList,
  includesPixelList,
  withPixelList,
  withoutPixelList,
} from './types/pixelList';

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

// A uniAssay makes uni amounts, which are either empty or have unique
// descriptions. The quantity must either be null, in which case it is
// empty, or be some truthy comparable value, in which case it
// represents a single unique unit described by that truthy
// quantity. Combining two uni amounts with different truthy
// quantities fails, as they represent non-combinable rights.
function makeUniAssayMaker(descriptionCoercer = d => d) {
  function makeUniAssay(label) {
    mustBeComparable(label);

    const brand = new WeakSet();

    const emptyAmount = harden({ label, quantity: null });
    brand.add(emptyAmount);

    const assay = harden({
      getLabel() {
        return label;
      },

      make(optDescription) {
        if (optDescription === null) {
          return emptyAmount;
        }
        insist(!!optDescription)`\
Uni optDescription must be either null or truthy ${optDescription}`;
        mustBeComparable(optDescription);

        const description = descriptionCoercer(optDescription);
        insist(!!description)`\
Uni description must be truthy ${description}`;
        mustBeComparable(description);

        const amount = harden({ label, quantity: description });
        brand.add(amount);
        return amount;
      },

      vouch(amount) {
        insist(brand.has(amount))`\
Unrecognized amount: ${amount}`;
        return amount;
      },

      coerce(allegedMetaAmount) {
        if (brand.has(allegedMetaAmount)) {
          return allegedMetaAmount;
        }
        const { label: allegedLabel, quantity } = allegedMetaAmount;
        mustBeSameStructure(label, allegedLabel, 'Unrecognized label');
        return assay.make(quantity);
      },

      quantity(amount) {
        return assay.vouch(amount).quantity;
      },

      empty() {
        return emptyAmount;
      },

      isEmpty(amount) {
        return assay.quantity(amount) === null;
      },

      includes(leftAmount, rightAmount) {
        const leftQuant = assay.quantity(leftAmount);
        const rightQuant = assay.quantity(rightAmount);
        if (rightQuant === null) {
          return true;
        }
        return sameStructure(leftQuant, rightQuant);
      },

      with(leftAmount, rightAmount) {
        const leftQuant = assay.quantity(leftAmount);
        const rightQuant = assay.quantity(rightAmount);
        if (leftQuant === null) {
          return rightAmount;
        }
        if (rightQuant === null) {
          return leftAmount;
        }
        if (sameStructure(leftQuant, rightQuant)) {
          // The "throw" is useless since insist(false) will unconditionally
          // throw anyway. Rather, it informs IDEs of this control flow.
          throw insist(false)`\
Even identical non-empty uni amounts cannot be added together ${leftAmount}`;
        } else {
          // The "throw" is useless since insist(false) will unconditionally
          // throw anyway. Rather, it informs IDEs of this control flow.
          throw insist(false)`\
Cannot combine different uni descriptions ${leftAmount} vs ${rightAmount}`;
        }
      },

      without(leftAmount, rightAmount) {
        const leftQuant = assay.quantity(leftAmount);
        const rightQuant = assay.quantity(rightAmount);
        if (rightQuant === null) {
          return leftAmount;
        }
        insist(leftQuant !== null)`\
Empty left does not include ${rightAmount}`;

        mustBeSameStructure(
          leftQuant,
          rightQuant,
          'Cannot subtract different uni descriptions',
        );
        return emptyAmount;
      },
    });
    return assay;
  }
  return harden(makeUniAssay);
}
harden(makeUniAssayMaker);

// A pixelList is a naive collection of pixels in the form:
// [ { x: 0, y: 0 }, { x: 1, y: 1} ...]
// This is less than ideal for efficiency and expressiveness but will
// do for now

// a label is an object w/ the properties 'issuer' and 'description'
// issuer is an obj with methods like getExclusive & getEmptyPurse
// description is a string

// our PixelLists should have the same issuer and the same description
// the description is "pixelList"

function makePixelListAssayMaker(canvasSize) {
  function makePixelListAssay(label) {
    mustBeComparable(label);

    const brand = new WeakSet();

    // our empty pixelList is an empty array
    const emptyAmount = harden({ label, pixelList: [] });
    brand.add(emptyAmount);

    const assay = harden({
      getLabel() {
        return label;
      },

      make(pixelList) {
        mustBeComparable(pixelList);
        insistPixelList(pixelList, canvasSize);

        if (pixelList.length === 0) {
          return emptyAmount;
        }

        const amount = harden({ label, quantity: pixelList });
        brand.add(amount);
        return amount;
      },

      vouch(amount) {
        insist(brand.has(amount))`\
  Unrecognized amount: ${amount}`;
        return amount;
      },

      coerce(allegedPixelListAmount) {
        if (brand.has(allegedPixelListAmount)) {
          return allegedPixelListAmount;
        }
        const {
          label: allegedLabel,
          quantity: pixelList,
        } = allegedPixelListAmount;
        mustBeSameStructure(label, allegedLabel, 'Unrecognized label');
        return assay.make(pixelList);
      },

      quantity(amount) {
        return assay.vouch(amount).quantity;
      },

      empty() {
        return emptyAmount;
      },

      isEmpty(amount) {
        return assay.quantity(amount) === [];
      },

      // does left include right?
      includes(leftAmount, rightAmount) {
        const leftPixelList = assay.quantity(leftAmount);
        const rightPixelList = assay.quantity(rightAmount);

        return includesPixelList(leftPixelList, rightPixelList);
      },

      // set union
      with(leftAmount, rightAmount) {
        const leftPixelList = assay.quantity(leftAmount);
        const rightPixelList = assay.quantity(rightAmount);

        return harden({
          label,
          quantity: withPixelList(leftPixelList, rightPixelList),
        });
      },

      // Covering set subtraction of erights.
      // If leftAmount does not include rightAmount, error.
      // Describe the erights described by `leftAmount` and not described
      // by `rightAmount`.
      without(leftAmount, rightAmount) {
        const leftPixelList = assay.quantity(leftAmount);
        const rightPixelList = assay.quantity(rightAmount);

        const pixelList = withoutPixelList(leftPixelList, rightPixelList);

        return harden({
          label,
          quantity: pixelList,
        });
      },
    });
    return assay;
  }
  return harden(makePixelListAssay);
}
harden(makePixelListAssayMaker);

export { makeNatAssay, makeUniAssayMaker, makePixelListAssayMaker };
