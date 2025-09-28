import { type SigningSmartWalletKit } from '@agoric/client-utils';
import { retryUntilCondition } from '@agoric/client-utils';
import type { TxStatus } from '@aglocal/portfolio-contract/src/resolver/constants.js';
import type { TxId } from '@aglocal/portfolio-contract/src/resolver/types';

type ResolveTxParams = {
  signingSmartWalletKit: SigningSmartWalletKit;
  txId: TxId;
  status: Omit<TxStatus, 'pending'>;
  rejectionReason?: string;
  setTimeout: typeof global.setTimeout;
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
  { setTimeout }: { setTimeout: typeof global.setTimeout },
): Promise<void> => {
  await retryUntilCondition(
    () => wallet.getLastUpdate(),
    (update) => {
      // Check for wallet action error
      if (update.updated === 'walletAction') {
        throw new Error(update.error);
      }
      
      // Check for invocation completion
      return (
        update.updated === 'invocation' &&
        update.id === invocationId &&
        !!(update.result || update.error)
      );
    },
    `Waiting for invocation ${invocationId} to complete`,
    {
      maxRetries: 60, // 60 * 100ms = 6 seconds max wait
      retryIntervalMs: 100,
      setTimeout,
      log: () => {}, // Disable logging for cleaner output
    }
  );

  // Check final result for errors
  const finalUpdate = wallet.getLastUpdate();
  if (finalUpdate.error) {
    throw new Error(finalUpdate.error);
  }
};

export const resolvePendingTx = async ({
  signingSmartWalletKit,
  txId,
  status,
  rejectionReason,
  setTimeout,
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

  await waitForInvocation(signingSmartWalletKit, id, { setTimeout });
};
