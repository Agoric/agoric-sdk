// @ts-check

import { assert, details as X } from '@agoric/assert';

import { cleanProposal } from '../../cleanProposal';
import { burnInvitation } from './burnInvitation';

import '@agoric/ertp/exported';
import '@agoric/store/exported';
import '../../../exported';
import '../internal-types';

/**
 * @param {Issuer} invitationIssuer
 * @param {GetInstanceAdmin} getInstanceAdmin
 * @param {DepositPayments} depositPayments
 * @param {GetAssetKindByBrand} getAssetKindByBrand
 * @param {HasChargeAccount} hasChargeAccount
 * @returns {Offer}
 */
export const makeOffer = (
  invitationIssuer,
  getInstanceAdmin,
  depositPayments,
  getAssetKindByBrand,
  hasChargeAccount,
) => {
  /** @type {Offer} */
  const offer = async (
    chargeAccount,
    invitation,
    uncleanProposal = harden({}),
    paymentKeywordRecord = harden({}),
  ) => {
    const chargeAccountProvided = await hasChargeAccount(chargeAccount);
    assert(
      chargeAccountProvided,
      X`A chargeAccount must be provided, not ${chargeAccount}`,
    );
    const { instanceHandle, invitationHandle } = await burnInvitation(
      invitationIssuer,
      invitation,
    );
    // AWAIT ///
    const instanceAdmin = getInstanceAdmin(instanceHandle);
    instanceAdmin.assertAcceptingOffers();

    const proposal = cleanProposal(uncleanProposal, getAssetKindByBrand);
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
      chargeAccount,
    );
    // AWAIT ///
    return userSeat;
  };
  return offer;
};
