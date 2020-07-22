// @ts-check

// Eventually will be importable from '@agoric/zoe-contract-support'
import { makeZoeHelpers } from '../contractSupport';

/**
 * Trade one item for another.
 *
 * The initial offer is { give: { Asset: A }, want: { Price: B } }.
 * The outcome from the first offer is an invitation for the second party,
 * who should offer { give: { Price: B }, want: { Asset: A } }, with a want
 * amount no greater than the original's give, and a give amount at least as
 * large as the original's want.
 *
 * @typedef {import('../zoe').ContractFacet} ContractFacet
 * @param {ContractFacet} zcf
 */
const makeContract = zcf => {
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

  return zcf.makeInvitation(
    checkHook(makeMatchingInvite, firstOfferExpected),
    'firstOffer',
  );
};

harden(makeContract);
export { makeContract };
