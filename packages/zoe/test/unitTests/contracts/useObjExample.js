// @ts-check

// Eventually will be importable from '@agoric/zoe-contract-support'
import { assert, details } from '@agoric/assert';
import { makeZoeHelpers } from '../../../src/contractSupport';

/**
 * Give a use object when a payment is escrowed
 *
 * @typedef {import('../../../src/zoe').ContractFacet} ContractFacet
 * @typedef {import('@agoric/ERTP').Amount} Amount
 * @param {ContractFacet} zcf
 */
const makeContract = zcf => {
  const { assertKeywords, checkHook } = makeZoeHelpers(zcf);
  assertKeywords(harden(['Pixels']));
  const { brandKeywordRecord } = zcf.getInstanceRecord();
  const amountMath = zcf.getAmountMath(brandKeywordRecord.Pixels);

  const makeUseObjHook = offerHandle => {
    const useObj = harden({
      /**
       * (Pretend to) color some pixels.
       * @param {string} color
       * @param {Amount} amountToColor
       */
      colorPixels: (color, amountToColor = undefined) => {
        // Throw if the offer is no longer active, i.e. the user has
        // completed their offer and the assets are no longer escrowed.
        assert(
          zcf.isOfferActive(offerHandle),
          `the escrowing offer is no longer active`,
        );
        const { Pixels: escrowedAmount } = zcf.getCurrentAllocation(
          offerHandle,
          brandKeywordRecord,
        );
        // If no amountToColor is provided, color all the pixels
        // escrowed for this offer.
        if (amountToColor === undefined) {
          amountToColor = escrowedAmount;
        }
        // Ensure that the amount of pixels that we want to color is
        // covered by what is actually escrowed.
        assert(
          amountMath.isGTE(escrowedAmount, amountToColor),
          details`The pixels to color were not all escrowed. Currently escrowed: ${escrowedAmount}, amount to color: ${amountToColor}`,
        );

        // Pretend to color
        return `successfully colored ${amountToColor.value} pixels ${color}`;
      },
    });
    return useObj;
  };

  const expected = harden({
    give: { Pixels: null },
  });

  const makeUseObjInvite = () =>
    zcf.makeInvitation(checkHook(makeUseObjHook, expected), 'use object');

  zcf.initPublicAPI({
    // The only publicAPI method is to make an invite.
    makeInvite: makeUseObjInvite,
  });

  // Return an invite.
  return makeUseObjInvite();
};

harden(makeContract);
export { makeContract };
