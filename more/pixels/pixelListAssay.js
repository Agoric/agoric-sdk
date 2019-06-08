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
  insistPixelListEqual,
} from './types/pixelList';

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
  function makePixelListAssay(pixelLabel) {
    mustBeComparable(pixelLabel);

    const brand = new WeakSet();

    // our empty pixelList is an empty array
    const emptyAmount = harden({ label: pixelLabel, quantity: [] });
    brand.add(emptyAmount);

    const assay = {
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
    };
    if (pixelLabel.description === 'pixels') {
      assay.toTransferAndUseRights = (
        srcAmount,
        useRightAssay,
        transferRightAssay,
      ) => {
        const srcPixelList = assay.quantity(srcAmount);

        const useAmount = useRightAssay.make(harden(srcPixelList));
        const transferAmount = transferRightAssay.make(harden(srcPixelList));

        return {
          transferAmount,
          useAmount,
        };

        // my pixelList of length one : [ {x: 0, y:0 }] should turn
        // into two amounts: useRights [{ x: 0, y: 0}] and
        // transferRights [{ x: 0, y: 0 }]

        // pixelListAmount -> useRightsAmount and transferRightsAmount
      };
    }
    if (pixelLabel.description === 'pixelTransferRights') {
      assay.toPixel = (
        { useAmount, transferAmount },
        useRightAssay,
        pixelAssay,
      ) => {
        const usePixelList = useRightAssay.quantity(useAmount);
        const transferPixelList = assay.quantity(transferAmount);

        insistPixelListEqual(usePixelList, transferPixelList);

        const pixelAmount = pixelAssay.make(harden(transferPixelList));
        return pixelAmount;
      };
    }
    return harden(assay);
  }
  return harden(makePixelListAssay);
}
harden(makePixelListAssayMaker);

export { makePixelListAssayMaker };
