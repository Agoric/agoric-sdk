// @ts-check

import harden from '@agoric/harden';

// Eventually will be importable from '@agoric/zoe-contract-support'
import { makeZoeHelpers } from '../contractSupport';

const rejectMsg = `The covered call option is expired.`;

/** @typedef {import('../zoe').ContractFacet} ContractFacet */

// In a covered call, the owner of a digital asset sells a call
// option. A call option is the right to buy the digital asset at a
// certain price, called the strike price. The call option has an expiry
// date, at which point the contract is cancelled.

// In this contract, the expiry date is represented by the deadline at
// which the offer escrowing the underlying assets is cancelled.
// Therefore, the proposal for the underlying assets must have an
// exit record with the key "afterDeadline".

// The invite that the creator of the covered call receives is the
// call option and has the following additional information in the
// extent of the invite:
// { expirationDate, timerAuthority, underlyingAsset, strikePrice }

// zcf is the Zoe Contract Facet, i.e. the contract-facing API of Zoe
export const makeContract = harden(
  /** @param {ContractFacet} zcf */ zcf => {
    const { swap, assertKeywords, checkHook } = makeZoeHelpers(zcf);
    assertKeywords(harden(['UnderlyingAsset', 'StrikePrice']));

    const makeCallOptionInvite = sellerHandle => {
      const {
        proposal: { want, give, exit },
      } = zcf.getOffer(sellerHandle);

      const exerciseOptionHook = offerHandle =>
        swap(sellerHandle, offerHandle, rejectMsg);
      const exerciseOptionExpected = harden({
        give: { StrikePrice: null },
        want: { UnderlyingAsset: null },
      });

      return zcf.makeInvitation(
        checkHook(exerciseOptionHook, exerciseOptionExpected),
        'exerciseOption',
        harden({
          customProperties: {
            expirationDate: exit.afterDeadline.deadline,
            timerAuthority: exit.afterDeadline.timer,
            underlyingAsset: give.UnderlyingAsset,
            strikePrice: want.StrikePrice,
          },
        }),
      );
    };

    const writeOptionExpected = harden({
      give: { UnderlyingAsset: null },
      want: { StrikePrice: null },
      exit: { afterDeadline: null },
    });

    return harden({
      invite: zcf.makeInvitation(
        checkHook(makeCallOptionInvite, writeOptionExpected),
        'makeCallOption',
      ),
    });
  },
);
