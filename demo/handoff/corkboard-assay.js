// Copyright (C) 2019 Agoric, under Apache License 2.0

import harden from '@agoric/harden';
import {
  mustBeComparable,
  mustBeSameStructure,
  sameStructure,
} from '../../collections/sameStructure';
import { insist } from '../../collections/insist';
import { makePrivateName } from '../../collections/PrivateName';

// A CorkboardAssay vouches for Corkboards, which allow vats to connect to one
// another in a lightweight way. Corkboards can not be combined or split.
// The quantity must be a unique string. The empty value may be useful for empty
// purses.
function makeCorkboardAssayMaker(descriptionCoercer = d => d) {
  function makeCorkboardAssay(label = 'generic') {
    mustBeComparable(label);

    const brand = makePrivateName();

    const emptyAmount = harden({ label, quantity: null });
    brand.init(emptyAmount);

    const assay = harden({
      getLabel() {
        return label;
      },

      make(optDescription) {
        if (optDescription === null) {
          return emptyAmount;
        }
        insist(!!optDescription)`\
Corkboard optDescription must be either null or truthy ${optDescription}`;
        mustBeComparable(optDescription);

        const description = descriptionCoercer(optDescription);
        insist(!!description)`\
Corkboard description must be truthy ${description}`;
        mustBeComparable(description);

        const amount = harden(description);
        brand.init(amount);
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
        if (brand.has(quantity)) {
          return brand.get(quantity);
        }
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
        return leftQuant === rightQuant;
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
          'Cannot subtract Corkboard descriptions',
        );
        return emptyAmount;
      },
    });
    return assay;
  }
  return harden(makeCorkboardAssay);
}
harden(makeCorkboardAssayMaker);

export { makeCorkboardAssayMaker };
