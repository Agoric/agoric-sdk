// @ts-check
import { passStyleOf } from '@agoric/marshal';

import { cleanProposal } from '../../cleanProposal';
import { burnInvitation } from './burnInvitation';

import '@agoric/ertp/exported';
import '@agoric/store/exported';
import '../../../exported';
import '../internal-types';

const { details: X, quote: q } = assert;

/**
 * @param {Issuer} invitationIssuer
 * @param {GetInstanceAdmin} getInstanceAdmin
 * @param {DepositPayments} depositPayments
 * @param {GetAssetKindByBrand} getAssetKindByBrand
 * @returns {Offer}
 */
export const makeOffer = (
  invitationIssuer,
  getInstanceAdmin,
  depositPayments,
  getAssetKindByBrand,
) => {
  /** @type {Offer} */
  const offer = async (
    invitation,
    uncleanProposal = harden({}),
    paymentKeywordRecord = harden({}),
    offerArgs = undefined,
  ) => {
    const { instanceHandle, invitationHandle } = await burnInvitation(
      invitationIssuer,
      invitation,
    );
    // AWAIT ///

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
