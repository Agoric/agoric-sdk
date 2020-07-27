// @ts-check

// Eventually will be importable from '@agoric/zoe-contract-support'
import { makeZoeHelpers } from '../../../src/contractSupport';

/** @typedef {import('../zoe').ContractFacet} ContractFacet */

// zcf is the Zoe Contract Facet, i.e. the contract-facing API of Zoe
export const makeContract = harden(
  /** @param {ContractFacet} zcf */ zcf => {
    const { assertKeywords, checkHook } = makeZoeHelpers(zcf);
    assertKeywords(harden(['Asset', 'Price']));

    const makeAccompliceInvite = firstOfferHandle => {
      const {
        proposal: { want: wantProposal },
      } = zcf.getOffer(firstOfferHandle);

      return zcf.makeInvitation(
        offerHandle => {
          const firstHandleAlloc = zcf.getCurrentAllocation(firstOfferHandle);
          // safe because it doesn't change give, so they can still get a refund
          const vicProposal = { Price: firstHandleAlloc.Price };
          const stepOne = [wantProposal, vicProposal];
          // safe because it doesn't change want, so winningsOK looks true
          const offerHandles = [firstOfferHandle, offerHandle];
          zcf.reallocate(offerHandles, stepOne);
          zcf.complete(harden(offerHandles));
        },
        'tantalizing offer',
        harden({
          customProperties: {
            Price: wantProposal.Price,
          },
        }),
      );
    };

    const firstOfferExpected = harden({
      want: { Price: null },
    });

    return zcf.makeInvitation(
      checkHook(makeAccompliceInvite, firstOfferExpected),
      'firstOffer',
    );
  },
);
