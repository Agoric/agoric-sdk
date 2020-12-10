// @ts-check
import '../../../exported';
import './types';

import { E } from '@agoric/eventual-send';
import { trade } from '../../contractSupport';
import { Position } from './position';
import { calculateShares } from './calculateShares';

/**
 * Schedule payoffs from a call-spread contract. Looks up the terms from zcf,
 * and uses the priceAuthority to schedule a quote at the closing time. It then
 * reallocates the collateral to the payoffSeats. After the payoffs have been
 * made and the invitations exercised (which might happen before or after the
 * closing), the contract is shut down.
 *
 * @type {SchedulePayoffs}
 */
function schedulePayoffs(zcf, payoffSeats, collateralSeat) {
  const terms = zcf.getTerms();
  const {
    maths: { Collateral: collateralMath, Strike: strikeMath },
    brands: { Strike: strikeBrand },
  } = terms;
  let seatsExited = 0;

  function reallocateToSeat(seat, sharePercent) {
    // we want to shut down the contract instance vat when everyone has been
    // paid, but the options might not be exercised promptly.
    function exitSeatAndShutdownVatIfDone() {
      seat.exit();
      seatsExited += 1;
      const remainder = collateralSeat.getAmountAllocated('Collateral');
      if (collateralMath.isEmpty(remainder) && seatsExited === 2) {
        zcf.shutdown('contract has been settled');
      }
    }

    // don't count a seat as complete until the payout has been made and the
    // invitation has been exercised. When the invite is exercised, the proposal
    // is set for the first time, and the notifier is updated.
    function waitForProposal(updateCount = NaN) {
      console.log(`Notified: ${seat.hasProposal()}, ${updateCount}`);
      const notifier = seat.getNotifier();
      return notifier.getUpdateSince(updateCount).then(nextState => {
        if (seat.hasProposal()) {
          exitSeatAndShutdownVatIfDone();
        } else {
          waitForProposal(nextState.updateCount);
        }
      });
    }

    const totalCollateral = terms.settlementAmount;
    const seatPortion = sharePercent.scale(collateralMath, totalCollateral);
    trade(
      zcf,
      { seat, gains: { Collateral: seatPortion } },
      { seat: collateralSeat, gains: {} },
    );

    if (seat.hasProposal()) {
      console.log(`has proposal`);
      exitSeatAndShutdownVatIfDone();
    } else {
      // if the invitation hasn't been exercised, we have to wait
      waitForProposal();
    }
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
    reallocateToSeat(payoffSeats[Position.LONG], longShare);
    reallocateToSeat(payoffSeats[Position.SHORT], shortShare);
  }

  E(terms.priceAuthority)
    .quoteAtTime(terms.expiration, terms.underlyingAmount, strikeBrand)
    .then(priceQuote =>
      payoffOptions(priceQuote.quoteAmount.value[0].amountOut),
    );
}

harden(schedulePayoffs);
export { schedulePayoffs };
