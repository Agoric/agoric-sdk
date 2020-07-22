// @ts-check

// Eventually will be importable from '@agoric/zoe-contract-support'
import { makeZoeHelpers } from '../contractSupport';

const rejectMsg = `The covered call option is expired.`;

/**
 * In a covered call, a digital asset's owner sells a call
 * option. A call option is the right to buy the digital asset at a
 * pre-determined price, called the strike price. The call option has an expiry
 * date, when the contract will be cancelled.
 *
 * In this contract, the expiry date is the deadline when
 * the offer escrowing the underlying assets is cancelled.
 * Therefore, the proposal for the underlying assets must have an
 * exit record with the key "afterDeadline".
 *
 * The invite received by the covered call creator is the call option. It has
 * this additional information in the invite's value:
 * { expirationDate, timerAuthority, underlyingAsset, strikePrice }
 *
 * The initial proposal should be:
 * {
 *   give: { UnderlyingAsset: assetAmount },
 *   want: { StrikePrice: priceAmount  },
 *   exit: { afterDeadline: { deadline: time, timer: timer } },
 * }
 * The result of the initial offer is { payout, outcome }, where payout will
 * eventually resolve to the strikePrice, and outcome is an assayable invitation
 * to buy the underlying asset. Since the contract provides assurance that the
 * underlying asset is available on the specified terms, the invite itself can
 * be traded as a valuable good.
 *
 * @typedef {import('../zoe').ContractFacet} ContractFacet
 * @param {ContractFacet} zcf
 */
const makeContract = zcf => {
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

  return zcf.makeInvitation(
    checkHook(makeCallOptionInvite, writeOptionExpected),
    'makeCallOption',
  );
};

harden(makeContract);
export { makeContract };
