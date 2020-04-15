// @ts-check
import rawHarden from '@agoric/harden';

// Eventually will be importable from '@agoric/zoe-contract-support'
import { makeZoeHelpers } from '../../../src/contractSupport';

// TODO: Until we have a version of harden that exports its type.
const harden = /** @type {<T>(x: T) => T} */ (rawHarden);

/**
 * This is a a broken contact to test zoe's error handling
 * @type {import('@agoric/zoe').MakeContract} zoe - the contract facet of zoe
 */
export const makeContract = harden(zcf => {
  const { inviteAnOffer } = makeZoeHelpers(zcf);

  const refundOfferHook = offerHandle => {
    zcf.complete(harden([offerHandle]));
    return `The offer was accepted`;
  };
  const makeRefundInvite = () =>
    inviteAnOffer({
      offerHook: refundOfferHook,
      customProperties: {
        inviteDesc: 'getRefund',
      },
    });

  return harden({
    // should be makeRefundInvite(). Intentionally wrong to provoke an error.
    invite: makeRefundInvite,
    publicAPI: {},
  });
});
