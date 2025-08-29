import { type SigningSmartWalletKit } from '@agoric/client-utils';
import type { OfferSpec } from '@agoric/smart-wallet/src/offers';
import type { TxStatus } from '@aglocal/portfolio-contract/src/resolver/constants.js';

type ResolveSubscriptionParams = {
  signingSmartWalletKit: SigningSmartWalletKit;
  subscriptionId: string;
  status: Omit<TxStatus, 'pending'>;
  proposal?: object;
};

const getInvitationMakers = async (wallet: SigningSmartWalletKit) => {
  const getCurrentWalletRecord = await wallet.query.getCurrentWalletRecord();
  const invitation = getCurrentWalletRecord.offerToUsedInvitation.find(
    inv => inv[1].value[0].description === 'resolver',
  );
  if (!invitation) {
    throw new Error('No invitation makers found');
  }
  return invitation;
};

export const resolvePendingTx = async ({
  signingSmartWalletKit,
  subscriptionId,
  status,
  proposal = {},
}: ResolveSubscriptionParams) => {
  const invitationMakersOffer = await getInvitationMakers(
    signingSmartWalletKit,
  );

  const action: OfferSpec = harden({
    id: `offer-${Date.now()}`,
    invitationSpec: {
      source: 'continuing',
      previousOffer: invitationMakersOffer[0],
      invitationMakerName: 'SettleTransaction',
    },
    offerArgs: {
      status,
      txId: subscriptionId,
    },
    proposal,
  });

  const result = await signingSmartWalletKit.executeOffer(action);
  return result;
};
