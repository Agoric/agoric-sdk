import { E } from '@agoric/eventual-send';

export const makeGetOfferHandle = inviteIssuerP => inviteP =>
  E(inviteIssuerP)
    .getAmountOf(inviteP)
    .then(amount => {
      return amount.extent[0].handle;
    });

export const makeGetInstanceHandle = inviteIssuerP => inviteP =>
  E(inviteIssuerP)
    .getAmountOf(inviteP)
    .then(amount => {
      return amount.extent[0].instanceHandle;
    });
