import { type SigningSmartWalletKit } from '@agoric/client-utils';
import type { CurrentWalletRecord } from '@agoric/smart-wallet/src/smartWallet.js';
import type { OfferSpec } from '@agoric/smart-wallet/src/offers.js';
import type { TxStatus } from '@aglocal/portfolio-contract/src/resolver/constants.js';
import type { TxId } from '@aglocal/portfolio-contract/src/resolver/types.js';
import { readStreamCellValue } from './vstorage-utils.ts';

type ResolveTxParams = {
  signingSmartWalletKit: SigningSmartWalletKit;
  makeNonce: () => string;
  txId: TxId;
  status: Omit<TxStatus, 'pending'>;
  rejectionReason?: string;
  proposal?: object;
};

const WALLET_RECORD_RETRIES = 4;

const getInvitationMakers = async (wallet: SigningSmartWalletKit) => {
  const walletPath = `published.wallet.${wallet.address}.current`;
  const capData = await readStreamCellValue(wallet.query.vstorage, walletPath, {
    retries: WALLET_RECORD_RETRIES,
  });
  const currentRecord: CurrentWalletRecord =
    wallet.marshaller.fromCapData(capData);

  const invitation = currentRecord.offerToUsedInvitation
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

export const resolvePendingTx = async ({
  signingSmartWalletKit,
  makeNonce,
  txId,
  status,
  rejectionReason,
  proposal = {},
}: ResolveTxParams) => {
  const invitationMakersOffer = await getInvitationMakers(
    signingSmartWalletKit,
  );

  const action: OfferSpec = harden({
    id: `offer-${makeNonce()}`,
    invitationSpec: {
      source: 'continuing',
      previousOffer: invitationMakersOffer.id,
      invitationMakerName: 'SettleTransaction',
    },
    offerArgs: {
      status,
      txId,
      ...(rejectionReason ? { rejectionReason } : {}),
    },
    proposal,
  });

  const result = await signingSmartWalletKit.executeOffer(action, 'auto');
  return result;
};
