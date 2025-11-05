import { Fail, q } from '@endo/errors';
import type { SigningSmartWalletKit, WalletStore } from '@agoric/client-utils';
import type { OfferSpec } from '@agoric/smart-wallet/src/offers';
import type { TxStatus } from '@aglocal/portfolio-contract/src/resolver/constants.js';
import type { TxId } from '@aglocal/portfolio-contract/src/resolver/types';
import type { ResolverKit } from '@aglocal/portfolio-contract/src/resolver/resolver.exo.js';

type ResolveTxParams = {
  signingSmartWalletKit: SigningSmartWalletKit;
  walletStore: WalletStore;
  txId: TxId;
  status: Exclude<TxStatus, 'pending'>;
  proposal?: object;
};

const getInvitationMakers = async (wallet: SigningSmartWalletKit) => {
  const getCurrentWalletRecord = await wallet.query.getCurrentWalletRecord();
  const invitation = getCurrentWalletRecord.offerToUsedInvitation
    .filter(inv => inv[1].value[0].description === 'resolver')
    .toSorted()
    .at(-1);
  if (!invitation) {
    throw new Error('No invitation makers found');
  }
  return {
    id: invitation[0],
    invitation: invitation[1],
  };
};

export const resolvePendingTxByInvitation = async ({
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
      previousOffer: invitationMakersOffer.id,
      invitationMakerName: 'SettleTransaction',
    },
    offerArgs: {
      status,
      txId,
    },
    proposal,
  });

  // An offer error will result in a throw
  await signingSmartWalletKit.executeOffer(action);
};

export const resolvePendingTxByInvocation = async ({
  walletStore,
  txId,
  status,
  proposal,
}: ResolveTxParams) => {
  !proposal || Fail`Unexpected proposal ${q(proposal)}`;

  const offerArgs = {
    status,
    txId,
  };

  const resolver = walletStore.get<ResolverKit['service']>('resolver');

  // An invocation error will result in a throw
  await resolver.settleTransaction(offerArgs);
};

export const resolvePendingTx = resolvePendingTxByInvitation;
