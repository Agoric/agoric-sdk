import { type SigningSmartWalletKit } from '@agoric/client-utils';
import type { OfferSpec } from '@agoric/smart-wallet/src/offers';
import type { TxStatus } from '@aglocal/portfolio-contract/src/resolver/constants.js';
import type { TxId } from '@aglocal/portfolio-contract/src/resolver/types';

type ResolveTxParams = {
  signingSmartWalletKit: SigningSmartWalletKit;
  txId: TxId;
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
  txId,
  status,
  proposal = {},
}: ResolveTxParams) => {
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
      txId,
    },
    proposal,
  });

  const result = await signingSmartWalletKit.executeOffer(action);
  return result;
};
