// @ts-check
import { passStyleOf } from '@agoric/marshal';
import { E } from '@agoric/eventual-send';

import { cleanProposal } from '../../cleanProposal.js';
import { burnInvitation } from './burnInvitation.js';

import '@agoric/ertp/exported.js';
import '@agoric/store/exported.js';
import '../../../exported.js';
import '../internal-types.js';

const { details: X, quote: q } = assert;

/**
 * @param {Issuer} invitationIssuer
 * @param {GetInstanceAdmin} getInstanceAdmin
 * @param {DepositPayments} depositPayments
 * @param {GetAssetKindByBrand} getAssetKindByBrand
 * @param {ChargeZoeFee} chargeZoeFee
 * @param {Amount} offerFeeAmount
 * @param {ERef<TimerService> | undefined} timeAuthority
 * @returns {Offer}
 */
export const makeOffer = (
  invitationIssuer,
  getInstanceAdmin,
  depositPayments,
  getAssetKindByBrand,
  chargeZoeFee,
  offerFeeAmount,
  timeAuthority,
) => {
  /** @type {OfferFeePurseRequired} */
  const offer = async (
    invitation,
    uncleanProposal = harden({}),
    paymentKeywordRecord = harden({}),
    offerArgs = undefined,
    feePurse,
  ) => {
    const {
      instanceHandle,
      invitationHandle,
      fee,
      expiry,
    } = await burnInvitation(invitationIssuer, invitation);
    // AWAIT ///

    const instanceAdmin = getInstanceAdmin(instanceHandle);
    instanceAdmin.assertAcceptingOffers();

    if (
      timeAuthority !== undefined &&
      expiry !== undefined &&
      fee !== undefined
    ) {
      // TODO: is there a way to make this a top-level await?
      const currentTime = await E(timeAuthority).getCurrentTimestamp();
      // AWAIT ///

      assert(
        expiry >= currentTime,
        X`The invitation has expired. It is currently ${currentTime} and the invitation expired at ${expiry}`,
      );
      await instanceAdmin.transferFeeToCreator(feePurse, fee);
      // AWAIT ///
    }

    await chargeZoeFee(feePurse, offerFeeAmount);
    // AWAIT ///

    const proposal = cleanProposal(uncleanProposal, getAssetKindByBrand);

    if (offerArgs !== undefined) {
      const passStyle = passStyleOf(offerArgs);
      assert(
        passStyle === 'copyRecord',
        X`offerArgs must be a pass-by-copy record, but instead was a ${q(
          passStyle,
        )}: ${offerArgs}`,
      );
    }

    const initialAllocation = await depositPayments(
      proposal,
      paymentKeywordRecord,
    );
    // AWAIT ///

    // This triggers the offerHandler in ZCF
    const userSeat = await instanceAdmin.makeUserSeat(
      invitationHandle,
      initialAllocation,
      proposal,
      offerArgs,
    );
    // AWAIT ///
    return userSeat;
  };
  return offer;
};
