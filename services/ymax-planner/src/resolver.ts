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
    .filter(inv => inv[1].value[0].description === 'resolverService')
    .toSorted()
    .at(-1);
  if (!invitation) {
    throw new Error('No resolver service found');
  }
  return {
    id: invitation[0],
  };
};

/**
 * Wait for a wallet action invocation to complete.
 * Polls wallet updates until either success or error.
 */
const waitForInvocation = async (
  wallet: SigningSmartWalletKit,
  invocationId: string,
): Promise<void> => {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const update = wallet.getLastUpdate();
    
    // Check for wallet action error
    if (update.updated === 'walletAction') {
      throw new Error(update.error);
    }
    
    // Check for invocation completion
    if (
      update.updated === 'invocation' &&
      update.id === invocationId &&
      !!(update.result || update.error)
    ) {
      if (update.error) {
        throw new Error(update.error);
      }
      return;
    }
    
    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, 100));
  }
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

  const id = `invoke-${Date.now()}`;
  
  await signingSmartWalletKit.sendBridgeAction({
    type: 'WALLET_SPEND_ACTION',
    owner: signingSmartWalletKit.address,
    spendAction: JSON.stringify({
      method: 'invokeEntry',
      id,
      targetName: resolverOffer.id,  
      method: 'settleTransaction',
      args: [{
        status,
        txId,
        ...(rejectionReason && { rejectionReason }),
      }],
    }),
  });

  await waitForInvocation(signingSmartWalletKit, id);
};
