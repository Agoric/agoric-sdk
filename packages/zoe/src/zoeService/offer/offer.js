import { passStyleOf } from '@endo/marshal';
import { fit } from '@agoric/store';
import { E } from '@endo/eventual-send';

import { cleanProposal } from '../../cleanProposal.js';
import { burnInvitation } from './burnInvitation.js';
import { makeInvitationQueryFns } from '../invitationQueries.js';

import '@agoric/ertp/exported.js';
import '@agoric/store/exported.js';
import '../internal-types.js';

const { quote: q, Fail } = assert;

export const makeOfferMethod = offerDataAccess => {
  /** @type {Offer} */
  const offer = async (
    invitation,
    uncleanProposal = harden({}),
    paymentKeywordRecord = harden({}),
    offerArgs = undefined,
  ) => {
    const invitationIssuer = offerDataAccess.getInvitationIssuer();
    const query = makeInvitationQueryFns(invitationIssuer);
    const { instance, description } = await query.getInvitationDetails(
      invitation,
    );
    // AWAIT ///

    const instanceAdmin = await offerDataAccess.getInstanceAdmin(instance);
    // AWAIT ///
    !instanceAdmin.isBlocked(description) ||
      Fail`not accepting offer with description ${q(description)}`;
    const { invitationHandle } = await burnInvitation(
      invitationIssuer,
      invitation,
    );
    // AWAIT ///

    instanceAdmin.assertAcceptingOffers();

    const getAssetKindByBrand = brand => {
      return offerDataAccess.getAssetKindByBrand(brand);
    };

    const proposal = cleanProposal(uncleanProposal, getAssetKindByBrand);
    const proposalShape =
      offerDataAccess.getProposalShapeForInvitation(invitationHandle);
    if (proposalShape !== undefined) {
      fit(proposal, proposalShape, `${q(description)} proposal`);
    }

    if (offerArgs !== undefined) {
      const passStyle = passStyleOf(offerArgs);
      passStyle === 'copyRecord' ||
        Fail`offerArgs must be a pass-by-copy record, but instead was a ${q(
          passStyle,
        )}: ${offerArgs}`;
    }

    return E.when(
      offerDataAccess.depositPayments(proposal, paymentKeywordRecord),
      initialAllocation =>
        instanceAdmin.makeUserSeat(
          invitationHandle,
          initialAllocation,
          proposal,
          offerArgs,
        ),
    );
  };

  return offer;
};
