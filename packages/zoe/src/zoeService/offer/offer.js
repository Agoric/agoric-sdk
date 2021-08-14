// @ts-check
import { passStyleOf } from '@agoric/marshal';

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
 * @param {AssertFeePurse} assertFeePurse
 * @returns {Offer}
 */
export const makeOffer = (
  invitationIssuer,
  getInstanceAdmin,
  depositPayments,
  getAssetKindByBrand,
  assertFeePurse,
) => {
  /** @type {OfferFeePurseRequired} */
  const offer = async (
    invitation,
    uncleanProposal = harden({}),
    paymentKeywordRecord = harden({}),
    offerArgs = undefined,
    feePurse,
  ) => {
    const { instanceHandle, invitationHandle } = await burnInvitation(
      invitationIssuer,
      invitation,
    );
    // AWAIT ///

    await assertFeePurse(feePurse);

    const instanceAdmin = getInstanceAdmin(instanceHandle);
    instanceAdmin.assertAcceptingOffers();

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
