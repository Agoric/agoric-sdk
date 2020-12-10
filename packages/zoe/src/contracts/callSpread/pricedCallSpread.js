// @ts-check
import '../../../exported';
import './types';

import { assert, details } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import {
  assertProposalShape,
  depositToSeat,
  trade,
  assertUsesNatMath,
} from '../../contractSupport';
import { schedulePayoffs } from './payoffHandler';
import { Position } from './position';
import { makePercent } from '../../contractSupport/percentMath';

/**
 * This contract implements a fully collateralized call spread. This is a
 * combination of a call option bought at one strike price and a second call
 * option sold at a higher price. The invitations are produced in pairs. The
 * creatorFacet has a method makeInvitationPair(longCollateralShare) whose
 * argument must be a number between 0 and 100. makeInvitationPair() returns two
 * invitations which require depositing longCollateralShare and
 * (100 - longCollateralShare) to exercise the respective options/invitations.
 * (They are returned under the Keyword 'Option'.) The
 * options are ERTP invitations that are suitable for resale.
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

  // These seats will be created (using makeInvitationWithSeat) before the
  // payoffHandler needs to access them.
  /** @type {Partial<Record<PositionKind,PromiseRecord<ZCFSeat>>>} */
  const payoffSeats = {};

  async function makeOptionInvitation(dir, share) {
    const { invitation: option, zcfSeat } = await zcf.makeInvitationWithSeat(
      _ => {},
      `collect ${dir} payout`,
      {
        position: dir,
      },
    );
    payoffSeats[dir] = zcfSeat;

    const invitationIssuer = zcf.getInvitationIssuer();
    const payment = harden({ Option: option });
    const spreadAmount = harden({
      Option: await E(invitationIssuer).getAmountOf(option),
    });
    // AWAIT ////

    await depositToSeat(zcf, collateralSeat, spreadAmount, payment);
    // AWAIT ////

    const required = share.scale(collateralMath, terms.settlementAmount);

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
        collateralMath.isEqual(newCollateral, required),
        details`Collateral required: ${required.value}`,
      );

      // assert that the requested option was the right one.
      assert(
        spreadAmount.Option.value[0].instance ===
          desiredOption.value[0].instance,
        details`wanted option not a match`,
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

    return zcf.makeInvitation(optionPosition, `call spread ${dir}`, {
      position: dir,
      collateral: required.value,
      option: spreadAmount.Option,
    });
  }

  function makeInvitationPair(longCollateralShare) {
    const longPercent = makePercent(longCollateralShare);

    const longInvitation = makeOptionInvitation(Position.LONG, longPercent);
    const shortInvitation = makeOptionInvitation(
      Position.SHORT,
      longPercent.inverse(),
    );
    schedulePayoffs(zcf, payoffSeats, collateralSeat);
    return { longInvitation, shortInvitation };
  }

  const creatorFacet = harden({ makeInvitationPair });
  return harden({ creatorFacet });
};

harden(start);
export { start };
