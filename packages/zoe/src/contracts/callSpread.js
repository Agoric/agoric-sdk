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
 * This contract implements a fully collateralized call spread. This is a
 * combination of a call option bought at one strike price and a second call
 * option sold at a higher price. The contracts are sold in pairs, and the
 * purchaser pays the entire amount that will be paid out. The individual
 * options are ERTP invitations that are suitable for resale.
 *
 * This option is settled financially. There is no requirement that the original
 * purchaser have ownership of the underlying asset at the start, and the
 * beneficiaries shouldn't expect to take delivery at closing.
 *
 * The issuerKeywordRecord specifies the issuers for four keywords: Underlying,
 * Strike, Collateral and Options. The payout is in Collateral. Strike amounts
 * are used for the price oracle's quotes as to the value of the Underlying, as
 * well as the strike prices in the terms. Options indicates the
 * invitationIssuer, which is part of the amounts of the options. The terms
 * include { expiration, underlyingAmount, priceAuthority, strikePrice1,
 * strikePrice2, settlementAmount }. expiration is a time recognized by the
 * priceAuthority. underlyingAmount is passed to the priceAuthority, so it could
 * be an NFT or a fungible amount. strikePrice2 must be greater than
 * strikePrice1. settlementAmount uses Collateral.
 *
 * The creatorInvitation has terms that include the amounts of the two options
 * as longOption and shortOption. When the creatorInvitation is exercised, the
 * payout includes the two option positions, which are themselves invitations
 * which can be exercised for free, and provide the option payouts.
 *
 * Future enhancements:
 * + issue multiple option pairs with the same expiration from a single instance
 * + create separate invitations to purchase the pieces of the option pair.
 *   (This would remove the current requirement that an intermediary have the
 *   total collateral available before the option descriptions have been
 *   created.)
 * + exit the contract when both seats have been paid.
 * + increase the precision of the calcluations. (change PERCENT_BASE to 10000)
 *
 * @type {ContractStartFn}
 */
const start = zcf => {
  // terms: underlyingAmount, priceAuthority, strike1, strike2,
  //    settlementAmount, expiration

  const terms = zcf.getTerms();
  const {
    maths: { Collateral: collateralMath, Strike: strikeMath, Quote: quoteMath },
    brands: { Strike: strikeBrand },
    issuers: { Quote: quoteIssuer },
  } = terms;
  assertUsesNatMath(zcf, collateralMath.getBrand());
  assertUsesNatMath(zcf, strikeMath.getBrand());
  // notice that we don't assert that the Underlying is fungible.

  assert(
    strikeMath.isGTE(terms.strikePrice2, terms.strikePrice1),
    details`strikePrice2 must be greater than strikePrice1`,
  );

  // Create the two options immediately and allocate them to this seat.
  const { zcfSeat: collateralSeat } = zcf.makeEmptySeatKit();

  // Since the seats for the payout of the settlement aren't created until the
  // invitations for the options themselves are exercised, we don't have those
  // seats at the time of creation of the options, so we use Promises, and
  // allocate the payouts when those promises resolve.
  const seatPromiseKits = {};

  seatPromiseKits[Position.LONG] = makePromiseKit();
  seatPromiseKits[Position.SHORT] = makePromiseKit();

  function reallocateToSeat(position, sharePercent) {
    seatPromiseKits[position].promise.then(seat => {
      const currentCollateral = collateralSeat.getCurrentAllocation()
        .Collateral;
      const totalCollateral = terms.settlementAmount;
      const collateralShare = floorDivide(
        multiply(totalCollateral.value, sharePercent),
        PERCENT_BASE,
      );
      const seatPortion = collateralMath.make(collateralShare);
      const collateralRemainder = collateralMath.subtract(
        currentCollateral,
        seatPortion,
      );
      zcf.reallocate(
        seat.stage({ Collateral: seatPortion }),
        collateralSeat.stage({ Collateral: collateralRemainder }),
      );
      seat.exit();
    });
  }

  // calculate the portion (as a percentage) of the collateral that should be
  // allocated to the long side.
  function calculateLongShare(price) {
    if (strikeMath.isGTE(terms.strikePrice1, price)) {
      return 0;
    } else if (strikeMath.isGTE(price, terms.strikePrice2)) {
      return PERCENT_BASE;
    }

    const denominator = strikeMath.subtract(
      terms.strikePrice2,
      terms.strikePrice1,
    ).value;
    const numerator = strikeMath.subtract(price, terms.strikePrice1).value;
    return floorDivide(multiply(PERCENT_BASE, numerator), denominator);
  }

  function payoffOptions(priceQuoteAmount) {
    const { Price: price } = quoteMath.getValue(priceQuoteAmount)[0];
    const longShare = calculateLongShare(price);
    // either offer might be exercised late, so we pay the two seats separately.
    reallocateToSeat(Position.LONG, longShare);
    reallocateToSeat(Position.SHORT, inverse(longShare));
  }

  function schedulePayoffs() {
    E(terms.priceAuthority)
      .priceAtTime(
        terms.timer,
        terms.expiration,
        terms.underlyingAmount,
        strikeBrand,
      )
      .then(quoteIssuer.getAmountOf)
      .then(priceQuoteAmount => payoffOptions(priceQuoteAmount));
  }

  function makeOptionInvitation(dir) {
    const optionsTerms = harden({
      ...terms,
      position: dir,
    });
    // All we do at time of exercise is resolve the promise.
    return zcf.makeInvitation(
      seat => seatPromiseKits[dir].resolve(seat),
      `collect ${dir} payout`,
      optionsTerms,
    );
  }

  async function makeOptionPair() {
    return {
      longInvitation: makeOptionInvitation(Position.LONG),
      shortInvitation: makeOptionInvitation(Position.SHORT),
    };
  }

  async function makeInvitationToBuy() {
    const { longInvitation, shortInvitation } = await makeOptionPair();
    const invitationIssuer = zcf.getInvitationIssuer();
    const longAmount = await E(invitationIssuer).getAmountOf(longInvitation);
    const shortAmount = await E(invitationIssuer).getAmountOf(shortInvitation);
    depositToSeat(
      zcf,
      collateralSeat,
      { LongOption: longAmount, ShortOption: shortAmount },
      { LongOption: longInvitation, ShortOption: shortInvitation },
    );

    // transfer collateral from longSeat to collateralSeat, then return a pair
    // of callSpread invitations
    /** @type {OfferHandler} */
    const pairBuyerPosition = longSeat => {
      assertProposalShape(longSeat, {
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
          seat: longSeat,
          gains: { LongOption: longAmount, ShortOption: shortAmount },
        },
      );
      schedulePayoffs();
      longSeat.exit();
    };

    const longTerms = harden({
      ...terms,
      LongOption: longAmount,
      ShortOption: shortAmount,
    });
    return zcf.makeInvitation(pairBuyerPosition, `call spread pair`, longTerms);
  }

  return harden({ creatorInvitation: makeInvitationToBuy() });
};

harden(start);
export { start };
