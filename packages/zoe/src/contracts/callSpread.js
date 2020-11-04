// @ts-check
import '../../exported';

import { assert, details } from '@agoric/assert';
import { makePromiseKit } from '@agoric/promise-kit';
import { E } from '@agoric/eventual-send';
import {
  assertProposalShape,
  depositToSeat,
  natSafeMath,
  trade,
  assertUsesNatMath,
} from '../contractSupport';

const { subtract, multiply, floorDivide } = natSafeMath;

/**
 * This contract implements a fully collateralized call spread. This is a
 * combination of a call option bought at one strike price and a second call
 * option sold at a higher price. The invitations are produced in pairs, and the
 * purchaser pays the entire amount that will be paid out. The individual
 * options are ERTP invitations that are suitable for resale.
 *
 * This option is settled financially. There is no requirement that the original
 * purchaser have ownership of the underlying asset at the start, and the
 * beneficiaries shouldn't expect to take delivery at closing.
 *
 * The issuerKeywordRecord specifies the issuers for four keywords: Underlying,
 * Strike, and Collateral. The payout is in Collateral. Strike amounts are used
 * for the price oracle's quotes as to the value of the Underlying, as well as
 * the strike prices in the terms. The terms include { timer, underlyingAmount,
 * expiration, priceAuthority, strikePrice1, strikePrice2, settlementAmount }.
 * The timer must be recognized by the priceAuthority. expiration is a time
 * recognized by the timer. underlyingAmount is passed to the priceAuthority,
 * so it could be an NFT or a fungible amount. strikePrice2 must be greater than
 * strikePrice1. settlementAmount uses Collateral.
 *
 * The creatorInvitation has customProperties that include the amounts of the
 * two options as longAmount and shortAmount. When the creatorInvitation is
 * exercised, the payout includes the two option positions, which are themselves
 * invitations which can be exercised for free, and provide the option payouts
 * with the keyword Collateral.
 *
 * Future enhancements:
 * + issue multiple option pairs with the same expiration from a single instance
 * + create separate invitations to purchase the pieces of the option pair.
 *   (This would remove the current requirement that an intermediary have the
 *   total collateral available before the option descriptions have been
 *   created.)
 * + increase the precision of the calculations. (change PERCENT_BASE to 10000)
 */

/**
 * Constants for long and short positions.
 *
 * @type {{ LONG: 'long', SHORT: 'short' }}
 */
const Position = {
  LONG: 'long',
  SHORT: 'short',
};

const PERCENT_BASE = 100;
const inverse = percent => subtract(PERCENT_BASE, percent);

/**
 * calculate the portion (as a percentage) of the collateral that should be
 * allocated to the long side.
 *
 * @param {AmountMath} strikeMath the math to use
 * @param {Amount} price the value of the underlying asset at closing that
 * determines the payouts to the parties
 * @param {Amount} strikePrice1 the lower strike price
 * @param {Amount} strikePrice2 the upper strike price
 *
 * if price <= strikePrice1, return 0
 * if price >= strikePrice2, return 100.
 * Otherwise return a number between 1 and 99 reflecting the position of price
 * in the range from strikePrice1 to strikePrice2.
 */
function calculateLongShare(strikeMath, price, strikePrice1, strikePrice2) {
  if (strikeMath.isGTE(strikePrice1, price)) {
    return 0;
  } else if (strikeMath.isGTE(price, strikePrice2)) {
    return PERCENT_BASE;
  }

  const denominator = strikeMath.subtract(strikePrice2, strikePrice1).value;
  const numerator = strikeMath.subtract(price, strikePrice1).value;
  return floorDivide(multiply(PERCENT_BASE, numerator), denominator);
}

/**
 * @type {ContractStartFn}
 */
const start = zcf => {
  // terms: underlyingAmount, priceAuthority, strikePrice1, strikePrice2,
  //    settlementAmount, expiration, timer

  const terms = zcf.getTerms();
  const {
    maths: { Collateral: collateralMath, Strike: strikeMath, Quote: quoteMath },
    brands: { Strike: strikeBrand },
  } = terms;
  assertUsesNatMath(zcf, collateralMath.getBrand());
  assertUsesNatMath(zcf, strikeMath.getBrand());
  // notice that we don't assert that the Underlying is fungible.

  assert(
    strikeMath.isGTE(terms.strikePrice2, terms.strikePrice1),
    details`strikePrice2 must be greater than strikePrice1`,
  );

  zcf.saveIssuer(zcf.getInvitationIssuer(), 'Options');

  // Create the two options immediately and allocate them to this seat.
  const { zcfSeat: collateralSeat } = zcf.makeEmptySeatKit();

  // Since the seats for the payout of the settlement aren't created until the
  // invitations for the options themselves are exercised, we don't have those
  // seats at the time of creation of the options, so we use Promises, and
  // allocate the payouts when those promises resolve.
  const seatPromiseKits = {};

  seatPromiseKits[Position.LONG] = makePromiseKit();
  seatPromiseKits[Position.SHORT] = makePromiseKit();
  let seatsExited = 0;

  function reallocateToSeat(position, sharePercent) {
    seatPromiseKits[position].promise.then(seat => {
      const totalCollateral = terms.settlementAmount;
      const collateralShare = floorDivide(
        multiply(totalCollateral.value, sharePercent),
        PERCENT_BASE,
      );
      const seatPortion = collateralMath.make(collateralShare);
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

  function payoffOptions(priceQuoteAmount) {
    const { amountOut } = quoteMath.getValue(priceQuoteAmount)[0];
    const strike1 = terms.strikePrice1;
    const strike2 = terms.strikePrice2;
    const longShare = calculateLongShare(
      strikeMath,
      amountOut,
      strike1,
      strike2,
    );
    // either offer might be exercised late, so we pay the two seats separately.
    reallocateToSeat(Position.LONG, longShare);
    reallocateToSeat(Position.SHORT, inverse(longShare));
  }

  function schedulePayoffs() {
    E(terms.priceAuthority)
      .quoteAtTime(terms.expiration, terms.underlyingAmount, strikeBrand)
      .then(priceQuote => payoffOptions(priceQuote.quoteAmount));
  }

  function makeOptionInvitation(dir) {
    // All we do at time of exercise is resolve the promise.
    return zcf.makeInvitation(
      seat => seatPromiseKits[dir].resolve(seat),
      `collect ${dir} payout`,
      { position: dir },
    );
  }

  async function makeCreatorInvitation() {
    const pair = {
      LongOption: makeOptionInvitation(Position.LONG),
      ShortOption: makeOptionInvitation(Position.SHORT),
    };
    const invitationIssuer = zcf.getInvitationIssuer();
    const longAmount = await E(invitationIssuer).getAmountOf(pair.LongOption);
    const shortAmount = await E(invitationIssuer).getAmountOf(pair.ShortOption);
    const amounts = { LongOption: longAmount, ShortOption: shortAmount };
    await depositToSeat(zcf, collateralSeat, amounts, pair);

    // transfer collateral from creator to collateralSeat, then return a pair
    // of callSpread options
    /** @type {OfferHandler} */
    const createOptionsHandler = creatorSeat => {
      assertProposalShape(creatorSeat, {
        give: { Collateral: null },
        want: { LongOption: null, ShortOption: null },
      });

      trade(
        zcf,
        {
          seat: collateralSeat,
          gains: { Collateral: terms.settlementAmount },
        },
        {
          seat: creatorSeat,
          gains: { LongOption: longAmount, ShortOption: shortAmount },
        },
      );
      schedulePayoffs();
      creatorSeat.exit();
    };

    const custom = harden({
      longAmount,
      shortAmount,
    });
    return zcf.makeInvitation(createOptionsHandler, `call spread pair`, custom);
  }

  return harden({ creatorInvitation: makeCreatorInvitation() });
};

harden(start);
export { start, calculateLongShare };
