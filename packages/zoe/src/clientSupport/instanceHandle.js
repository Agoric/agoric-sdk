import { E } from '@agoric/eventual-send';

export const makeGetInstanceHandle = inviteIssuerP => inviteP =>
  E(inviteIssuerP)
    .getAmountOf(inviteP)
    .then(amount => {
      return amount.value[0].instanceHandle;
    });
