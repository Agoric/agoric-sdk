// @ts-check
import rawHarden from '@agoric/harden';

// TODO: Until we have a version of harden that exports its type.
const harden = /** @type {<T>(x: T) => T} */ (rawHarden);

/**
 * This is a a broken contact to test zoe's error handling
 * @type {import('@agoric/zoe').MakeContract} zoe - the contract facet of zoe
 */
export const makeContract = harden(zcf => {
  const refundOfferHook = offerHandle => {
    zcf.complete(harden([offerHandle]));
    return `The offer was accepted`;
  };
  const makeRefundInvite = () =>
    zcf.makeInvitation(refundOfferHook, 'getRefund');

  return harden({
    // should be makeRefundInvite(). Intentionally wrong to provoke an error.
    invite: makeRefundInvite,
    publicAPI: {},
  });
});
