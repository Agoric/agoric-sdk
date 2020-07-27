// @ts-check

/**
 * This is a a broken contact to test zoe's error handling
 * @type {import('@agoric/zoe').MakeContract} zoe - the contract facet of zoe
 */
const makeContract = zcf => {
  const refundOfferHook = offerHandle => {
    zcf.complete(harden([offerHandle]));
    return `The offer was accepted`;
  };
  const makeRefundInvite = () =>
    zcf.makeInvitation(refundOfferHook, 'getRefund');
  // should be makeRefundInvite(). Intentionally wrong to provoke an error.
  return makeRefundInvite;
};

harden(makeContract);
export { makeContract };
