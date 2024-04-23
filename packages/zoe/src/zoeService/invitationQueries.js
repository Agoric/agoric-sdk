// @jessie-check

import { assert, details as X, Fail, quote as q } from '@agoric/assert';
import { E } from '@endo/eventual-send';

export const makeInvitationQueryFns = invitationIssuer => {
  /** @type {ZoeService['getInvitationDetails']} */
  const getInvitationDetails = async invitationP => {
    const onRejected = reason => {
      const err = assert.error(
        X`A Zoe invitation is required, not ${invitationP}`,
      );
      assert.note(err, X`Due to ${reason}`);
      throw err;
    };
    const invAmount = await E(invitationIssuer)
      .getAmountOf(invitationP)
      .catch(onRejected);
    (Array.isArray(invAmount.value) && invAmount.value.length === 1) ||
      Fail`Expected exactly 1 invitation, not ${q(invAmount.value.length)}`;
    return invAmount.value[0];
  };

  /** @type {ZoeService['getInstance']} */
  const getInstance = invitation =>
    E.get(getInvitationDetails(invitation)).instance;

  /** @type {ZoeService['getInstallation']} */
  const getInstallation = invitation =>
    E.get(getInvitationDetails(invitation)).installation;

  return harden({
    getInstance,
    getInstallation,
    getInvitationDetails,
  });
};
