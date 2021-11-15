// @ts-check

import { offerTo } from '@agoric/zoe/src/contractSupport/index.js';
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

    seat.incrementBy(
      feeSeat.decrementBy(
        harden({ RUN: feeSeat.getAmountAllocated('RUN', runBrand) }),
      ),
    );
    seat.incrementBy(
      transferSeat.decrementBy(
        harden({
          RUN: transferSeat.getAmountAllocated('RUN', runBrand),
        }),
      ),
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
