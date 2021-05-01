// @ts-check

import { amountMath } from '@agoric/ertp';
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

    const totalTransferred = amountMath.add(
      feeSeat.getAmountAllocated('RUN', runBrand),
      transferSeat.getAmountAllocated('RUN', runBrand),
    );
    zcf.reallocate(
      transferSeat.stage({ RUN: amountMath.makeEmpty(runBrand) }),
      feeSeat.stage({ RUN: amountMath.makeEmpty(runBrand) }),
      seat.stage({ RUN: totalTransferred }),
    );
    seat.exit();
    transferSeat.exit();

    return `paid out ${totalTransferred.value}`;
  };

  const makeCollectFeesInvitation = () =>
    zcf.makeInvitation(collectFees, 'collect Fees');

  return { makeCollectFeesInvitation };
};
