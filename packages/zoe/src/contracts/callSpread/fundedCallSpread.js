import '../../../exported';
import './types';

import { assert, details } from '@agoric/assert';
import { makePromiseKit } from '@agoric/promise-kit';
import { E } from '@agoric/eventual-send';
import {
  assertProposalShape,
  depositToSeat,
  trade,
  assertUsesNatMath,
} from '../../contractSupport';
import { makePayoffHandler } from './payoffHandler';
import { Position } from './position';

/**
 * This contract implements a fully collateralized call spread. This is a
 * combination of a call option bought at one strike price and a second call
 * option sold at a higher price. The invitations are produced in pairs, and the
 * purchaser pays the entire amount that will be paid out. The individual
 * options are ERTP invitations that are suitable for resale.
 *
 * This option contract is settled financially. There is no requirement that the
 * original purchaser have ownership of the underlying asset at the start, and
 * the beneficiaries shouldn't expect to take delivery at closing.
 *
 * The issuerKeywordRecord specifies the issuers for three keywords: Underlying,
 * Strike, and Collateral. The payout is in Collateral. Strike amounts are used
 * for the price oracle's quotes as to the value of the Underlying, as well as
 * the strike prices in the terms.
 *
 * The creatorInvitation has customProperties that include the amounts of the
 * two options as longAmount and shortAmount. When the creatorInvitation is
 * exercised, the payout includes the two option positions, which are themselves
 * invitations which can be exercised for free, and provide the option payouts
 * with the keyword Collateral.
 *
 * terms include:
 * `timer` is a timer, and must be recognized by `priceAuthority`.
 * `expiration` is a time recognized by the `timer`.
 * `underlyingAmount` is passed to `priceAuthority`. It could be an NFT or a
 *   fungible amount.
 * `strikePrice2` must be greater than `strikePrice1`.
 * `settlementAmount` is the amount deposited by the funder and split between
 *   the holders of the options. It uses Collateral.
 * `priceAuthority` is an oracle that has a timer so it can respond to requests
 *   for prices as of a stated time. After the deadline, it will issue a
 *   PriceQuote giving the value of the underlying asset in the strike currency.
 *
 * Future enhancements:
 * + issue multiple option pairs with the same expiration from a single instance
 * + increase the precision of the calculations. (change PERCENT_BASE to 10000)
 */

/** @type {ContractStartFn} */
const start = zcf => {
  const terms = zcf.getTerms();
  const {
    maths: { Collateral: collateralMath, Strike: strikeMath },
  } = terms;
  assertUsesNatMath(zcf, collateralMath.getBrand());
  assertUsesNatMath(zcf, strikeMath.getBrand());
  // notice that we don't assert that the Underlying is fungible.

  assert(
    strikeMath.isGTE(terms.strikePrice2, terms.strikePrice1),
    details`strikePrice2 must be greater than strikePrice1`,
  );

  zcf.saveIssuer(zcf.getInvitationIssuer(), 'Options');

  // We will create the two options early and allocate them to this seat.
  const { zcfSeat: collateralSeat } = zcf.makeEmptySeatKit();

  // Since the seats for the payout of the settlement aren't created until the
  // invitations for the options themselves are exercised, we don't have those
  // seats at the time of creation of the options, so we use Promises, and
  // allocate the payouts when those promises resolve.
  /** @type {Record<PositionKind,PromiseRecord<ZCFSeat>>} */
  const seatPromiseKits = {};
  seatPromiseKits[Position.LONG] = makePromiseKit();
  seatPromiseKits[Position.SHORT] = makePromiseKit();

  /** @type {PayoffHandler} */
  const payoffHandler = makePayoffHandler(zcf, seatPromiseKits, collateralSeat);

  async function makeFundedPairInvitation() {
    const pair = {
      LongOption: payoffHandler.makeOptionInvitation(Position.LONG),
      ShortOption: payoffHandler.makeOptionInvitation(Position.SHORT),
    };
    const invitationIssuer = zcf.getInvitationIssuer();
    const longAmount = await E(invitationIssuer).getAmountOf(pair.LongOption);
    // AWAIT ////
    const shortAmount = await E(invitationIssuer).getAmountOf(pair.ShortOption);
    // AWAIT ////

    // TODO(hibbert): I ought to be able to get rid of the double await above,
    // but the following doesn't produce the same result.

    // const [longAmount, shortAmount] = await Promise.all([
    //   E(invitationIssuer).getAmountOf(pair.LongOption),
    //   E(invitationIssuer).getAmountOf(pair.ShortOption),
    // ]);
    const amounts = { LongOption: longAmount, ShortOption: shortAmount };
    await depositToSeat(zcf, collateralSeat, amounts, pair);
    // AWAIT ////

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
      payoffHandler.schedulePayoffs();
      creatorSeat.exit();
    };

    const custom = harden({
      longAmount,
      shortAmount,
    });
    return zcf.makeInvitation(createOptionsHandler, `call spread pair`, custom);
  }

  return harden({ creatorInvitation: makeFundedPairInvitation() });
};

harden(start);
export { start };
