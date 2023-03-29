// @ts-check
import { Fail, assert, details as X } from '@agoric/assert';
import { E } from '@endo/eventual-send';
import { getCopyBagEntries } from '@agoric/store';

/**
 * Burn the invitation, assert that only one invitation was burned,
 * and extract and return the instanceHandle and invitationHandle
 *
 * @param {Issuer<'copyBag'>} invitationIssuer
 * @param {ERef<Payment<'copyBag'>>} invitation
 * @returns {Promise<{
 *   instanceHandle: Instance,
 *   invitationHandle: InvitationHandle,
 * }>}
 */
export const burnInvitation = (invitationIssuer, invitation) => {
  const handleRejected = reason => {
    const err = assert.error(
      X`A Zoe invitation is required, not ${invitation}`,
    );
    assert.note(err, X`Due to ${reason}`);
    throw err;
  };
  /** @param {Amount<'copyBag'>} invitationAmount */
  const handleFulfilled = invitationAmount => {
    const payload = getCopyBagEntries(invitationAmount.value);
    payload.length === 1 || Fail`Only one invitation can be redeemed at a time`;
    const [[{ instance: instanceHandle, handle: invitationHandle }]] = payload;
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
