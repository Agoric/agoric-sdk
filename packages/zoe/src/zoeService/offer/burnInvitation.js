// @jessie-check

import { Fail, X, annotateError, assert, makeError } from '@endo/errors';
import { E } from '@endo/eventual-send';

/**
 * @import {InvitationHandle} from '../zoe.js';
 * @import {Instance} from '../utils.js';
 */

/**
 * Burn the invitation, assert that only one invitation was burned,
 * and extract and return the instanceHandle and invitationHandle
 *
 * @template {AssetKind} K
 * @param {Issuer<K>} invitationIssuer
 * @param {ERef<Payment<K>>} invitation
 * @returns {Promise<{
 *   instanceHandle: Instance<any>,
 *   invitationHandle: InvitationHandle,
 * }>}
 */
export const burnInvitation = (invitationIssuer, invitation) => {
  const handleRejected = reason => {
    const err = makeError(X`A Zoe invitation is required, not ${invitation}`);
    annotateError(err, X`Due to ${reason}`);
    throw err;
  };
  const handleFulfilled = invitationAmount => {
    const invitationValue = invitationAmount.value;
    assert(Array.isArray(invitationValue));
    invitationValue.length === 1 ||
      Fail`Only one invitation can be redeemed at a time`;
    const [{ instance: instanceHandle, handle: invitationHandle }] =
      invitationValue;
    return harden({
      instanceHandle,
      invitationHandle,
    });
  };

  return E.when(
    invitationIssuer.burn(invitation),
    handleFulfilled,
    handleRejected,
  );
};
