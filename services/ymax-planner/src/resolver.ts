import { type SigningSmartWalletKit, retryUntilCondition } from '@agoric/client-utils';
import type { TxStatus } from '@aglocal/portfolio-contract/src/resolver/constants.js';
import type { TxId } from '@aglocal/portfolio-contract/src/resolver/types';

type ResolveTxParams = {
  signingSmartWalletKit: SigningSmartWalletKit;
  txId: TxId;
  status: Omit<TxStatus, 'pending'>;
  rejectionReason?: string;
  setTimeout: typeof globalThis.setTimeout;
};

/**
 * Wait for a wallet invocation to complete by polling getLastUpdate.
 */
const waitForInvocation = async (
  wallet: SigningSmartWalletKit,
  id: string,
  setTimeout: typeof globalThis.setTimeout,
) => {
  await retryUntilCondition(
    async () => {
      const update = wallet.getLastUpdate();
      if (update.updated === 'walletAction') {
        throw Error(update.error);
      }
      return (
        update.updated === 'invocation' &&
        update.id === id &&
        !!(update.result || update.error)
      );
    },
    'invocation completion',
    { retryIntervalMs: 1000, maxRetries: 30, setTimeout },
  );

  const update = wallet.getLastUpdate();
  if (update.error) throw Error(update.error);
};

export const resolvePendingTx = async ({
  signingSmartWalletKit,
  txId,
  status,
  rejectionReason,
  setTimeout,
}: ResolveTxParams) => {
  const id = `resolve-${txId}-${Date.now()}`;
  
  await signingSmartWalletKit.sendBridgeAction({
    method: 'invokeEntry',
    id,
    spendAction: 'resolver-service',
    message: {
      method: 'settleTransaction',
      args: { txId, status, rejectionReason },
    },
  });

  await waitForInvocation(signingSmartWalletKit, id, setTimeout);
};
