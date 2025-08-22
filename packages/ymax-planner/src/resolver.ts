import { type SigningSmartWalletKit } from '@agoric/client-utils';
import type { OfferSpec } from '@agoric/smart-wallet/src/offers';

type ResolveSubscriptionParams = {
  signingSmartWalletKit: SigningSmartWalletKit;
  subscriptionId: string;
  status: 'success' | 'timeout';
  subscriptionData: object;
  proposal?: object;
};

export const resolveSubscription = async ({
  signingSmartWalletKit,
  subscriptionId,
  status,
  subscriptionData,
  proposal = {},
}: ResolveSubscriptionParams) => {
  const action: OfferSpec = harden({
    id: `offer-${Date.now()}`,
    invitationSpec: {
      source: 'agoricContract',
      // TODO: UNTIL https://github.com/Agoric/agoric-sdk/issues/11709
      instancePath: ['resolverMock'],
      // TODO: UNTIL https://github.com/Agoric/agoric-sdk/issues/11709
      // Updates vstorage on the chain by making an offer to the `resolverMock` contract on devnet.
      callPipe: [['vPusherInvitation']],
    },
    offerArgs: {
      vPath: subscriptionId,
      vData: {
        status,
        ...subscriptionData,
      },
    },
    proposal,
  });

  const result = await signingSmartWalletKit.executeOffer(action);
  return result;
};
