// @ts-check

import { offerTo } from '@agoric/zoe/src/contractSupport';
import { E } from '@agoric/eventual-send';

export const makeMakeCollectFeesInvitation = (
  zcf,
  feeSeat,
  autoswapCreatorFacet,
  runBrand,
) => {
  const collectFees = async seat => {
    const invitation = await E(
      autoswapCreatorFacet,
    ).makeCollectFeesInvitation();
    const { zcfSeat: transferSeat } = zcf.makeEmptySeatKit();
    await E.get(offerTo(zcf, invitation, {}, {}, transferSeat)).deposited;

    feeSeat.decrementBy(
      seat.incrementBy({ RUN: feeSeat.getAmountAllocated('RUN', runBrand) }),
    );
    transferSeat.decrementBy(
      seat.incrementBy({
        RUN: transferSeat.getAmountAllocated('RUN', runBrand),
      }),
    );
    const totalTransferred = seat.getStagedAllocation().RUN;

    zcf.reallocate(transferSeat, feeSeat, seat);
    seat.exit();
    transferSeat.exit();

    return `paid out ${totalTransferred.value}`;
  };

  const makeCollectFeesInvitation = () =>
    zcf.makeInvitation(collectFees, 'collect Fees');

  return { makeCollectFeesInvitation };
};
