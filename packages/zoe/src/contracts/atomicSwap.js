// @ts-check

import harden from '@agoric/harden';

// Eventually will be importable from '@agoric/zoe-contract-support'
import { makeZoeHelpers } from '../contractSupport';

/** @typedef {import('../zoe').ContractFacet} ContractFacet */

// zcf is the Zoe Contract Facet, i.e. the contract-facing API of Zoe
export const makeContract = harden(
  /** @param {ContractFacet} zcf */ zcf => {
    const { swap, assertKeywords, checkHook } = makeZoeHelpers(zcf);
    assertKeywords(harden(['Asset', 'Price']));

    const makeMatchingInvite = firstOfferHandle => {
      const {
        proposal: { want, give },
      } = zcf.getOffer(firstOfferHandle);

      return zcf.makeInvitation(
        offerHandle => swap(firstOfferHandle, offerHandle),
        'matchOffer',
        harden({
          customProperties: {
            asset: give.Asset,
            price: want.Price,
          },
        }),
      );
    };

    const firstOfferExpected = harden({
      give: { Asset: null },
      want: { Price: null },
    });

    return harden({
      invite: zcf.makeInvitation(
        checkHook(makeMatchingInvite, firstOfferExpected),
        'firstOffer',
      ),
    });
  },
);
