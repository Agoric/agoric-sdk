import { type SigningSmartWalletKit } from '@agoric/client-utils';
import type { TxStatus } from '@aglocal/portfolio-contract/src/resolver/constants.js';
import type { TxId } from '@aglocal/portfolio-contract/src/resolver/types';

type ResolveTxParams = {
  signingSmartWalletKit: SigningSmartWalletKit;
  txId: TxId;
  status: Omit<TxStatus, 'pending'>;
  rejectionReason?: string;
};

const getResolverService = async (wallet: SigningSmartWalletKit) => {
  const getCurrentWalletRecord = await wallet.query.getCurrentWalletRecord();
  const invitation = getCurrentWalletRecord.offerToUsedInvitation
    .filter(inv => inv[1].value[0].description === 'resolver')
    .toSorted()
    .at(-1);
  if (!invitation) {
    throw new Error('No resolver service found');
  }
  return {
    id: invitation[0],
  };
};

export const resolvePendingTx = async ({
  signingSmartWalletKit,
  txId,
  status,
  rejectionReason,
}: ResolveTxParams) => {
  const resolverOffer = await getResolverService(
    signingSmartWalletKit,
  );

  const result = await signingSmartWalletKit.invokeEntry({
    id: `invoke-${Date.now()}`,
    targetName: resolverOffer.id,
    method: 'settleTransaction',
    args: [{
      status,
      txId,
      ...(rejectionReason && { rejectionReason }),
    }],
  });
  return result;
};
