// @ts-check

import { E } from '@agoric/eventual-send';

/** @type {MakeDepositInvitation} */
export const makeDepositInvitation = zoeInvitationPurse => {
  /** @type {DepositInvitation} */
  const depositInvitation = async invitationP => {
    const invitation = await invitationP;
    // Deposit returns the amount deposited
    const invitationAmount = await E(zoeInvitationPurse).deposit(invitation);
    return invitationAmount.value[0];
  };
  return depositInvitation;
};
