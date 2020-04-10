/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';

// Eventually will be importable from '@agoric/zoe-contract-support'
import { makeZoeHelpers } from '../contractSupport';

// zcf is the Zoe Contract Facet, i.e. the contract-facing API of Zoe
export const makeContract = harden(zcf => {
  const { swap, assertKeywords, rejectIfNotProposal } = makeZoeHelpers(zcf);
  assertKeywords(harden(['Asset', 'Price']));

  const makeMatchingInvite = firstInviteHandle => {
    const seat = harden({
      matchOffer: () => swap(firstInviteHandle, inviteHandle),
    });
    const {
      proposal: { want, give },
    } = zcf.getOffer(firstInviteHandle);
    const { invite, inviteHandle } = zcf.makeInvite(seat, {
      asset: give.Asset,
      price: want.Price,
      seatDesc: 'matchOffer',
    });
    return invite;
  };

  const makeFirstOfferInvite = () => {
    const seat = harden({
      makeFirstOffer: () => {
        const expected = harden({
          give: { Asset: null },
          want: { Price: null },
        });
        rejectIfNotProposal(inviteHandle, expected);
        return makeMatchingInvite(inviteHandle);
      },
    });
    const { invite, inviteHandle } = zcf.makeInvite(seat, {
      seatDesc: 'firstOffer',
    });
    return invite;
  };

  return harden({
    invite: makeFirstOfferInvite(),
  });
});
