// @ts-check

import '../../../exported';
import './types';

import { assert, details as X } from '@agoric/assert';
import { makePromiseKit } from '@agoric/promise-kit';
import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { amountMath } from '@agoric/ertp';
import {
  assertProposalShape,
  depositToSeat,
  trade,
  assertUsesNatMath,
  makeRatio,
  multiplyBy,
} from '../../contractSupport';
import { makePayoffHandler } from './payoffHandler';
import { Position } from './position';

import { oneMinus } from './percent';

const PERCENT_BASE = 100n;
const BASIS_POINTS = 10000n;

/**
 * This contract implements a fully collateralized call spread. This is a
 * combination of a call option bought at one strike price and a second call
 * option sold at a higher price. The invitations are produced in pairs. The
 * creatorFacet has a method makeInvitationPair(longCollateralShare) whose
 * argument must be a number between 0 and 100. makeInvitationPair() returns two
 * invitations which require depositing amounts summing to the settlement amount
 * in the proportions longCollateralShare and (100 - longCollateralShare) to
 * redeem the respective options/invitations. (They are returned under the
 * Keyword 'Option'.) The options are ERTP invitations that are suitable for
 * resale.
 *
 * This option contract is settled financially. There is no requirement that the
 * creator have ownership of the underlying asset at the start, and
 * the beneficiaries shouldn't expect to take delivery at closing.
 *
 * The issuerKeywordRecord specifies the issuers for three keywords: Underlying,
 * Strike, and Collateral. The payout is in Collateral. Strike amounts are used
 * for the price oracle's quotes as to the value of the Underlying, as well as
 * the strike prices in the terms.
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
 */

/** @type {ContractStartFn} */
const start = zcf => {
  const {
    brands,
    strikePrice1,
    strikePrice2,
    settlementAmount,
  } = zcf.getTerms();
  assertUsesNatMath(zcf, brands.Collateral);
  assertUsesNatMath(zcf, brands.Strike);
  // notice that we don't assert that the Underlying is fungible.

  assert(
    amountMath.isGTE(strikePrice2, strikePrice1),
    X`strikePrice2 must be greater than strikePrice1`,
  );

  zcf.saveIssuer(zcf.getInvitationIssuer(), 'Options');

  // We will create the two options early and allocate them to this seat.
  const { zcfSeat: collateralSeat } = zcf.makeEmptySeatKit();

  // Since the seats for the payout of the settlement aren't created until the
  // invitations for the options themselves are exercised, we don't have those
  // seats at the time of creation of the options, so we use Promises, and
  // allocate the payouts when those promises resolve.
  /** @type {Record<PositionKind,PromiseRecord<ZCFSeat>>} */
  const seatPromiseKits = {
    [Position.LONG]: makePromiseKit(),
    [Position.SHORT]: makePromiseKit(),
  };

  /** @type {PayoffHandler} */
  const payoffHandler = makePayoffHandler(zcf, seatPromiseKits, collateralSeat);

  async function makeOptionInvitation(position, share) {
    const option = payoffHandler.makeOptionInvitation(position);
    const invitationIssuer = zcf.getInvitationIssuer();
    const payment = harden({ Option: option });
    const spreadAmount = harden({
      Option: await E(invitationIssuer).getAmountOf(option),
    });
    // AWAIT ////

    await depositToSeat(zcf, collateralSeat, spreadAmount, payment);
    // AWAIT ////

    const required = multiplyBy(settlementAmount, share);

    /** @type {OfferHandler} */
    const optionPosition = depositSeat => {
      assertProposalShape(depositSeat, {
        give: { Collateral: null },
        want: { Option: null },
        exit: { onDemand: null },
      });

      const {
        give: { Collateral: newCollateral },
        want: { Option: desiredOption },
      } = depositSeat.getProposal();

      // assert that the allocation includes the amount of collateral required
      assert(
        amountMath.isEqual(newCollateral, required),
        X`Collateral required: ${required.value}`,
      );

      // assert that the requested option was the right one.
      assert(
        spreadAmount.Option.value[0].instance ===
          desiredOption.value[0].instance,
        X`wanted option not a match`,
      );

      trade(
        zcf,
        { seat: depositSeat, gains: spreadAmount },
        {
          seat: collateralSeat,
          gains: { Collateral: newCollateral },
          losses: spreadAmount,
        },
      );
      depositSeat.exit();
    };

    return zcf.makeInvitation(optionPosition, `call spread ${position}`, {
      position,
      collateral: required.value,
      option: spreadAmount.Option,
    });
  }

  // TODO(2282): change the API so the caller can provide share in basis points
  //  rather than percent
  function makeInvitationPair(longCollateralShare) {
    const longPercent = makeRatio(
      (longCollateralShare * BASIS_POINTS) / PERCENT_BASE,
      brands.Collateral,
      BASIS_POINTS,
    );

    const longInvitation = makeOptionInvitation(Position.LONG, longPercent);
    const shortInvitation = makeOptionInvitation(
      Position.SHORT,
      oneMinus(longPercent),
    );
    payoffHandler.schedulePayoffs();
    return { longInvitation, shortInvitation };
  }

  const creatorFacet = Far('creatorFacet', { makeInvitationPair });
  return harden({ creatorFacet });
};

harden(start);
export { start };
