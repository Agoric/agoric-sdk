// Copyright (C) 2019 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

import { insist } from '../../util/insist';
import {
  mustBeSameStructure,
  mustBeComparable,
} from '../../util/sameStructure';

import {
  insistPixelList,
  includesPixelList,
  withPixelList,
  withoutPixelList,
} from './types/pixelList';

// A pixelList is a naive collection of pixels in the form:
// [ { x: 0, y: 0 }, { x: 1, y: 1} ...]
// This is less than ideal for efficiency and expressiveness but will
// do for now

function makePixelListAssayMaker(canvasSize) {
  function makePixelListAssay(pixelLabel) {
    mustBeComparable(pixelLabel);

    const brand = new WeakSet();

    // our empty pixelList is an empty array
    const emptyAmount = harden({ label: pixelLabel, quantity: [] });
    brand.add(emptyAmount);

    const assay = harden({
      getLabel() {
        return pixelLabel;
      },

      make(pixelList) {
        mustBeComparable(pixelList);
        insistPixelList(pixelList, canvasSize);

        if (pixelList.length === 0) {
          return emptyAmount;
        }

        const amount = harden({ label: pixelLabel, quantity: pixelList });
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
        mustBeSameStructure(pixelLabel, allegedLabel, 'Unrecognized label');
        return assay.make(pixelList);
      },

      quantity(amount) {
        return assay.vouch(amount).quantity;
      },

      empty() {
        return emptyAmount;
      },

      isEmpty(amount) {
        return assay.quantity(amount).length === 0;
      },

      // does left include right?
      includes(leftAmount, rightAmount) {
        const leftPixelList = assay.quantity(leftAmount);
        const rightPixelList = assay.quantity(rightAmount);

        return includesPixelList(leftPixelList, rightPixelList);
      },

      equals(leftAmount, rightAmount) {
        return (
          assay.includes(leftAmount, rightAmount) &&
          assay.includes(rightAmount, leftAmount)
        );
      },

      // set union
      with(leftAmount, rightAmount) {
        const leftPixelList = assay.quantity(leftAmount);
        const rightPixelList = assay.quantity(rightAmount);

        const resultPixelList = withPixelList(leftPixelList, rightPixelList);

        return assay.make(harden(resultPixelList));
      },

      // Covering set subtraction of erights.
      // If leftAmount does not include rightAmount, error.
      // Describe the erights described by `leftAmount` and not described
      // by `rightAmount`.
      without(leftAmount, rightAmount) {
        const leftPixelList = assay.quantity(leftAmount);
        const rightPixelList = assay.quantity(rightAmount);

        const resultPixelList = withoutPixelList(leftPixelList, rightPixelList);

        return assay.make(harden(resultPixelList));
      },
    });
    return harden(assay);
  }
  return harden(makePixelListAssay);
}
harden(makePixelListAssayMaker);

export { makePixelListAssayMaker };
