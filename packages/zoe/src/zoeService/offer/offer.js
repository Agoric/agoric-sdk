// @ts-check
import { passStyleOf } from '@endo/marshal';
import { fit } from '@agoric/store';

import { cleanProposal } from '../../cleanProposal.js';
import { burnInvitation } from './burnInvitation.js';
import { makeInvitationQueryFns } from '../invitationQueries.js';

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
 * @param {GetProposalShapeForInvitation} getProposalShapeForInvitation
 * @returns {Offer}
 */
export const makeOfferMethod = (
  invitationIssuer,
  getInstanceAdmin,
  depositPayments,
  getAssetKindByBrand,
  getProposalShapeForInvitation,
) => {
  /** @type {Offer} */
  const offer = async (
    invitation,
    uncleanProposal = harden({}),
    paymentKeywordRecord = harden({}),
    offerArgs = undefined,
  ) => {
    const query = makeInvitationQueryFns(invitationIssuer);
    const { instance, description } = await query.getInvitationDetails(
      invitation,
    );
    // AWAIT ///

    const instanceAdmin = getInstanceAdmin(instance);
    !instanceAdmin.isBlocked(description) ||
      assert.fail(X`not accepting offer with description ${q(description)}`);
    const { invitationHandle } = await burnInvitation(
      invitationIssuer,
      invitation,
    );
    // AWAIT ///

    instanceAdmin.assertAcceptingOffers();

    const proposal = cleanProposal(uncleanProposal, getAssetKindByBrand);
    const proposalShape = getProposalShapeForInvitation(invitationHandle);
    if (proposalShape !== undefined) {
      fit(proposal, proposalShape, 'proposal');
    }

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
    // @ts-expect-error cast
    return userSeat;
  };
  return offer;
};
