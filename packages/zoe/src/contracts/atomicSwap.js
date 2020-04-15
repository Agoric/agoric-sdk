import harden from '@agoric/harden';

// Eventually will be importable from '@agoric/zoe-contract-support'
import { makeZoeHelpers } from '../contractSupport';

// zcf is the Zoe Contract Facet, i.e. the contract-facing API of Zoe
export const makeContract = harden(zcf => {
  const { swap, assertKeywords, inviteAnOffer } = makeZoeHelpers(zcf);
  assertKeywords(harden(['Asset', 'Price']));

  const makeMatchingInvite = firstOfferHandle => {
    const {
      proposal: { want, give },
    } = zcf.getOffer(firstOfferHandle);
    return inviteAnOffer({
      offerHook: offerHandle => swap(firstOfferHandle, offerHandle),
      customProperties: {
        asset: give.Asset,
        price: want.Price,
        inviteDesc: 'matchOffer',
      },
    });
  };

  const makeFirstOfferInvite = () =>
    inviteAnOffer({
      offerHook: makeMatchingInvite,
      customProperties: {
        inviteDesc: 'firstOffer',
      },
      expected: {
        give: { Asset: null },
        want: { Price: null },
      },
    });

  return harden({
    invite: makeFirstOfferInvite(),
  });
});
