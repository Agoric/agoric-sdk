// @ts-check
import '../../../exported';
import './types';

import { E } from '@agoric/eventual-send';
import { trade } from '../../contractSupport';
import { Position } from './position';
import { calculateShares } from './calculateShares';

/**
 * makePayoffHandler returns an object with methods that are useful for
 * callSpread contracts.
 *
 * @type {MakePayoffHandler}
 */
function makePayoffHandler(zcf, seatPromiseKits, collateralSeat) {
  const terms = zcf.getTerms();
  const {
    maths: { Collateral: collateralMath, Strike: strikeMath },
    brands: { Strike: strikeBrand },
  } = terms;
  let seatsExited = 0;

  /** @type {MakeOptionInvitation} */
  function makeOptionInvitation(position) {
    return zcf.makeInvitation(
      // All we do at the time of exercise is resolve the promise.
      seat => seatPromiseKits[position].resolve(seat),
      `collect ${position} payout`,
      {
        position,
      },
    );
  }

  function reallocateToSeat(seatPromise, sharePercent) {
    seatPromise.then(seat => {
      const totalCollateral = terms.settlementAmount;
      const seatPortion = sharePercent.scale(collateralMath, totalCollateral);
      trade(
        zcf,
        { seat, gains: { Collateral: seatPortion } },
        { seat: collateralSeat, gains: {} },
      );
      seat.exit();
      seatsExited += 1;
      const remainder = collateralSeat.getAmountAllocated('Collateral');
      if (collateralMath.isEmpty(remainder) && seatsExited === 2) {
        zcf.shutdown('contract has been settled');
      }
    });
  }

  function payoffOptions(quoteAmount) {
    const strike1 = terms.strikePrice1;
    const strike2 = terms.strikePrice2;
    const { longShare, shortShare } = calculateShares(
      strikeMath,
      quoteAmount,
      strike1,
      strike2,
    );
    // either offer might be exercised late, so we pay the two seats separately.
    reallocateToSeat(seatPromiseKits[Position.LONG].promise, longShare);
    reallocateToSeat(seatPromiseKits[Position.SHORT].promise, shortShare);
  }

  function schedulePayoffs() {
    E(terms.priceAuthority)
      .quoteAtTime(terms.expiration, terms.underlyingAmount, strikeBrand)
      .then(priceQuote =>
        payoffOptions(priceQuote.quoteAmount.value[0].amountOut),
      );
  }

  /** @type {PayoffHandler} */
  const handler = harden({
    schedulePayoffs,
    makeOptionInvitation,
  });
  return handler;
}

harden(makePayoffHandler);
export { makePayoffHandler };
