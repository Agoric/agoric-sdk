// @ts-check

import { assert, details as X } from '@agoric/assert';
import { E } from '@agoric/eventual-send';

export const makeInvitationQueryFns = invitationIssuer => {
  /** @type {GetInvitationDetails} */
  const getInvitationDetails = async invitationP => {
    const onRejected = reason => {
      // Or you could do it the other way around
      assert.note(reason, X`A Zoe invitation is required, not ${invitationP}`);
      throw reason;
    };
    return E.get(
      E.get(
        E(invitationIssuer)
          .getAmountOf(invitationP)
          .catch(onRejected),
      ).value,
    )[0];
  };

  /** @type {GetInstance} */
  const getInstance = invitation =>
    E.get(getInvitationDetails(invitation)).instance;

  /** @type {GetInstallation} */
  const getInstallation = invitation =>
    E.get(getInvitationDetails(invitation)).installation;

  return harden({
    getInstance,
    getInstallation,
    getInvitationDetails,
  });
};
