/* global harden */
// @ts-check

// Eventually will be importable from '@agoric/zoe-contract-support'
import { assert, details } from '@agoric/assert';
import { makeZoeHelpers } from '../../../src/contractSupport';

/**
 * Give a use object when a payment is escrowed
 *
 * @typedef {import('../../../src/zoe').ContractFacet} ContractFacet
 * @param {ContractFacet} zcf
 */
const makeContract = zcf => {
  const { assertKeywords, checkHook } = makeZoeHelpers(zcf);
  assertKeywords(harden(['Pixels']));
  const { brandKeywordRecord } = zcf.getInstanceRecord();
  const amountMath = zcf.getAmountMath(brandKeywordRecord.Pixels);

  const makeUseObjHook = offerHandle => {
    return harden({
      colorPixels: (color, amountToColor = undefined) => {
        assert(
          zcf.isOfferActive(offerHandle),
          `the escrowing offer is no longer active`,
        );
        const { Pixels: escrowedAmount } = zcf.getCurrentAllocation(
          offerHandle,
          brandKeywordRecord,
        );
        if (amountToColor === undefined) {
          amountToColor = escrowedAmount;
        }
        assert(
          amountMath.isGTE(escrowedAmount, amountToColor),
          details`The pixels to color were not all escrowed. Currently escrowed: ${escrowedAmount}, amount to color: ${amountToColor}`,
        );
        return `successfully colored ${amountToColor.extent} pixels ${color}`;
      },
    });
  };

  const expected = harden({
    give: { Pixels: null },
  });

  const makeUseObjInvite = () =>
    zcf.makeInvitation(checkHook(makeUseObjHook, expected), 'use object');

  zcf.initPublicAPI({
    makeInvite: makeUseObjInvite,
  });

  return makeUseObjInvite();
};

harden(makeContract);
export { makeContract };
