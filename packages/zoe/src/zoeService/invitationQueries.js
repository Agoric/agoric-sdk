// @ts-check

import { assert, details as X } from '@agoric/assert';
import { E } from '@agoric/eventual-send';

export const makeInvitationQueryFns = invitationIssuer => {
  /** @type {GetAmountOfInvitationThen} */
  const getAmountOfInvitationThen = async (invitationP, onFulfilled) => {
    const onRejected = () =>
      assert.fail(X`A Zoe invitation is required, not ${invitationP}`);
    return E(invitationIssuer)
      .getAmountOf(invitationP)
      .then(onFulfilled, onRejected);
  };

  /** @type {GetInstance} */
  const getInstance = invitation => {
    const onFulfilled = amount => amount.value[0].instance;
    return getAmountOfInvitationThen(invitation, onFulfilled);
  };

  /** @type {GetInstallation} */
  const getInstallation = invitation => {
    const onFulfilled = amount => amount.value[0].installation;
    return getAmountOfInvitationThen(invitation, onFulfilled);
  };

  /** @type {GetInvitationDetails} */
  const getInvitationDetails = invitation => {
    const onFulfilled = amount => amount.value[0];
    return getAmountOfInvitationThen(invitation, onFulfilled);
  };

  return {
    getInstance,
    getInstallation,
    getInvitationDetails,
  };
};
