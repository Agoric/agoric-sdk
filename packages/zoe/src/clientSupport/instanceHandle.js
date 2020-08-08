import { E } from '@agoric/eventual-send';

export const makeGetInstanceHandle = inviteIssuerE => inviteE =>
  E(inviteIssuerE)
    .getAmountOf(inviteE)
    .then(amount => {
      return amount.value[0].instanceHandle;
    });
