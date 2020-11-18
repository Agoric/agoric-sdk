import '../../../exported';
import './types';

import { assert, details } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import {
  assertProposalShape,
  trade,
  assertUsesNatMath,
  natSafeMath,
} from '../../contractSupport';
import { Position, getOtherPosition } from './position';
import { alienatePayout } from '../../contractSupport/zoeHelpers';

const { multiply, floorDivide, subtract } = natSafeMath;

const PERCENT_BASE = 100;
const inverse = percent => subtract(PERCENT_BASE, percent);

// creator gets a creatorInvitation that is either for the long or
// short side, depending on which is specified in the terms. Creator
// uses that invitation to add collateral, and the payout of that
// invitation is the payout of the contract for that positionKind

// The offerResult of the creator's offer is a facet with methods to
// get the other side of the contract invitation and
// makeSellableOption.

// There is a function on the offerResult of both the creator and
// the other party that allows them to alienate their rights.

/** @type {ContractStartFn} */
const start = async zcf => {
  const terms = zcf.getTerms();
  const {
    maths: { Collateral: collateralMath, Strike: strikeMath },
    longMarginShare,
    creatorPosition,
  } = terms;

  const strikeBrand = strikeMath.getBrand();
  assertUsesNatMath(zcf, collateralMath.getBrand());
  assertUsesNatMath(zcf, strikeBrand);
  // notice that we don't assert that the Underlying is fungible.

  assert(
    strikeMath.isGTE(terms.strikePrice2, terms.strikePrice1),
    details`strikePrice2 must be greater than strikePrice1`,
  );

  assert(
    creatorPosition === Position.LONG || creatorPosition === Position.SHORT,
    `position must be ${Position.LONG} or ${Position.SHORT}`,
  );

  assert(
    longMarginShare >= 0 && longMarginShare <= 100,
    details`longMarginShare must be between 0 and 100 but was ${longMarginShare}.`,
  );

  await zcf.saveIssuer(zcf.getInvitationIssuer(), 'Options');

  const { zcfSeat: collateralSeat } = zcf.makeEmptySeatKit();

  const seats = {
    [Position.LONG]: undefined,
    [Position.SHORT]: undefined,
  };
  const invitationsCreated = {
    [Position.LONG]: false,
    [Position.SHORT]: false,
  };

  const assertCollateral = (seat, requiredCollateral) => {
    assert(
      collateralMath.isGTE(
        seat.getAmountAllocated('Collateral'),
        requiredCollateral,
      ),
      details`${requiredCollateral} is required, but only ${seat.getAmountAllocated(
        'Collateral',
      )} was given`,
    );
  };

  const getMarginRequired = optionPosition => {
    const numerator =
      (optionPosition === Position.LONG)
        ? longMarginShare
        : inverse(longMarginShare);
    const required = floorDivide(
      multiply(terms.settlementAmount.value, numerator),
      100,
    );
    return required;
  };

  const makeSellableOption = optionPosition => {
    const { newZCFSeatPromise, newInvitation } = alienatePayout(
      zcf,
      seats[optionPosition],
      `Collect ${optionPosition} payout. Collateral already added`,
    );
    seats[optionPosition] = newZCFSeatPromise;
    return newInvitation;
  };

  const getCollateralShare = (totalCollateral, sharePercent) =>
    collateralMath.make(
      floorDivide(multiply(totalCollateral.value, sharePercent), PERCENT_BASE),
    );

  let seatsExited = 0;

  const reallocateToSeat = (seatPromise, seatPortion) => {
    seatPromise.then(seat => {
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
  };

  const calculateShares = (price, strikePrice1, strikePrice2) => {
    if (strikeMath.isGTE(strikePrice1, price)) {
      return 0;
    } else if (strikeMath.isGTE(price, strikePrice2)) {
      return PERCENT_BASE;
    }

    const denominator = strikeMath.subtract(strikePrice2, strikePrice1).value;
    const numerator = strikeMath.subtract(price, strikePrice1).value;
    const longShare = floorDivide(
      multiply(PERCENT_BASE, numerator),
      denominator,
    );
    const shortShare = PERCENT_BASE - longShare;
    return harden({ longShare, shortShare });
  };

  const payoutOptions = price => {
    const { longShare, shortShare } = calculateShares(
      price,
      zcf.getTerms().strike1,
      zcf.getTerms().strike2,
    );
    const totalCollateral = collateralSeat.getAmountAllocated('Collateral');
    // either offer might be exercised late, so we pay the two seats separately.
    reallocateToSeat(
      Position.LONG,
      getCollateralShare(totalCollateral, longShare),
    );
    reallocateToSeat(
      Position.SHORT,
      getCollateralShare(totalCollateral, shortShare),
    );
  };

  const schedulePayouts = () => {
    E(terms.priceAuthority)
      .quoteAtTime(terms.expiration, terms.underlyingAmount, strikeBrand)
      .then(priceQuote =>
        payoutOptions(priceQuote.quoteAmount.value[0].amountOut),
      );
  };

  const makeOptionInvitation = optionPosition => {
    assert(
      !invitationsCreated[optionPosition],
      details`${optionPosition} invitation has already been created`,
    );
    const addCollateral = seat => {
      assertProposalShape({
        want: {},
        give: { Collateral: null },
        exit: {
          waived: null, // the seat will exit after the scheduled expiration
        },
      });
      assertCollateral(seat, getMarginRequired(optionPosition));
      trade(
        zcf,
        {
          seat: collateralSeat,
          gains: seat.getAmountAllocated('Collateral'),
        },
        { seat, gains: {} },
      );
      seats[optionPosition] = Promise.resolve(seat);

      // both seats exist
      if (seats[getOtherPosition(optionPosition)] !== undefined) {
        schedulePayouts();
        return harden({
          makeSellableOption: () => makeSellableOption(optionPosition),
        });
      }

      return harden({
        makeOtherInvitation: () =>
          makeOptionInvitation(getOtherPosition(optionPosition)),
        makeSellableOption: () => makeSellableOption(optionPosition),
      });
    };

    invitationsCreated[optionPosition] = true;

    return zcf.makeInvitation(
      addCollateral,
      `Add collateral and collect ${optionPosition} payout`,
      {
        position: optionPosition,
      },
    );
  };

  const creatorInvitation = makeOptionInvitation(creatorPosition);
  return harden({ creatorInvitation });
};

harden(start);
export { start };
