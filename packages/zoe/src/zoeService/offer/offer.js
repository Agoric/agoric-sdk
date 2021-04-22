// @ts-check

import { cleanProposal } from '../../cleanProposal';
import { burnInvitation } from './burnInvitation';

import '@agoric/ertp/exported';
import '@agoric/store/exported';
import '../../../exported';
import '../internal-types';

/**
 *
 * @param {Issuer} invitationIssuer
 * @param {WeakStore<Instance,InstanceAdmin>} instanceToInstanceAdmin
 * @param {DepositPayments} depositPayments
 * @param {GetMathKind} getMathKind
 * @returns {Offer}
 */
export const makeOffer = (
  invitationIssuer,
  instanceToInstanceAdmin,
  depositPayments,
  getMathKind,
) => {
  /** @type {Offer} */
  const offer = async (
    invitation,
    uncleanProposal = harden({}),
    paymentKeywordRecord = harden({}),
  ) => {
    const { instanceHandle, invitationHandle } = await burnInvitation(
      invitationIssuer,
      invitation,
    );
    // AWAIT ///
    const instanceAdmin = instanceToInstanceAdmin.get(instanceHandle);
    instanceAdmin.assertAcceptingOffers();

    const proposal = cleanProposal(uncleanProposal, getMathKind);
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
    );
    // AWAIT ///
    return userSeat;
  };
  return offer;
};
