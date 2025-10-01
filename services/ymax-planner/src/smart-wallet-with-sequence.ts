import type { OfferSpec } from '@agoric/smart-wallet/src/offers.js';
import type { BridgeAction } from '@agoric/smart-wallet/src/smartWallet.js';
import type { SignerData } from '@cosmjs/stargate';
import type { SigningSmartWalletKit } from '@agoric/client-utils';
import type { SequenceManager } from './sequence-manager.ts';

type SmartWalletWithSequencePowers = {
  signingSmartWalletKit: SigningSmartWalletKit;
  sequenceManager: SequenceManager;
  log?: (...args: unknown[]) => void;
};

type SmartWalletWithSequenceConfig = {
  chainId: string;
};

type QueuedOperation<T> = {
  operation: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  context: string;
};

export type SmartWalletWithSequence = {
  sendBridgeAction: (
    action: BridgeAction,
  ) => Promise<Awaited<ReturnType<SigningSmartWalletKit['sendBridgeAction']>>>;
  executeOffer: (
    offer: OfferSpec,
  ) => Promise<Awaited<ReturnType<SigningSmartWalletKit['sendBridgeAction']>>>;
};

/**
 * A smart wallet kit wrapper that manages sequence numbers for wallet operations.
 */
export const makeSmartWalletWithSequence = (
  powers: SmartWalletWithSequencePowers,
  config: SmartWalletWithSequenceConfig,
): SmartWalletWithSequence => {
  const { signingSmartWalletKit, sequenceManager, log = () => {} } = powers;
  const { chainId } = config;

  // TODO: Add bounds checking to prevent unbounded queue growth under sustained failures
  const operationQueue: QueuedOperation<any>[] = [];
  let isProcessingQueue = false;

  /**
   * Creates SignerData with managed sequence number
   */
  const createSignerData = (): SignerData => {
    const sequence = sequenceManager.getSequence();
    const accountNumber = sequenceManager.getAccountNumber();

    log(
      `Creating SignerData with sequence: ${sequence}, accountNumber: ${accountNumber}`,
    );

    return {
      accountNumber,
      sequence,
      chainId,
    };
  };

  /**
   * Handles sequence number errors and retries with sync
   */
  const performOperation = async <T>(
    operation: () => Promise<T>,
    context: string,
  ): Promise<T> => {
    await null;
    try {
      return await operation();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('account sequence mismatch')) {
        log(
          `Sequence error detected in ${context}, syncing and retrying:`,
          errorMessage,
        );

        // Sync sequence with network and retry once
        await sequenceManager.syncSequence();

        try {
          return await operation();
        } catch (retryError) {
          log(`Retry failed for ${context}:`, retryError);
          throw retryError;
        }
      }

      throw error;
    }
  };

  /**
   * Process the operation queue sequentially
   */
  const processQueue = async (): Promise<void> => {
    await null;
    log(
      `Starting queue processing, ${operationQueue.length} operations queued`,
    );

    while (operationQueue.length > 0) {
      const queuedOp = operationQueue.shift()!;

      log(`Processing ${queuedOp.context}, ${operationQueue.length} remaining`);

      try {
        const result = await performOperation(
          queuedOp.operation,
          queuedOp.context,
        );
        queuedOp.resolve(result);
        log(`Completed ${queuedOp.context}`);
      } catch (error) {
        log(`Failed ${queuedOp.context}:`, error);
        queuedOp.reject(error);
      }
    }
  };

  /**
   * Queue an operation for sequential execution
   */
  const queueOperation = async <T>(
    operation: () => Promise<T>,
    context: string,
    logPrefix = '',
  ): Promise<T> => {
    return new Promise((resolve, reject) => {
      operationQueue.push({
        operation,
        resolve,
        reject,
        context: logPrefix ? `${logPrefix} ${context}` : context,
      });

      log(
        `${logPrefix ? `${logPrefix} ` : ''}Queued ${context}, queue length: ${operationQueue.length}`,
      );

      if (!isProcessingQueue) {
        isProcessingQueue = true;
        void processQueue().finally(() => {
          isProcessingQueue = false;
        });
      }
    });
  };

  /**
   * Send a bridge action with managed sequence number
   */
  const sendBridgeAction = async (
    action: BridgeAction,
  ): Promise<
    Awaited<ReturnType<SigningSmartWalletKit['sendBridgeAction']>>
  > => {
    const operation = async () => {
      const signerData = createSignerData();
      return signingSmartWalletKit.sendBridgeAction(
        action,
        undefined,
        undefined,
        signerData,
      );
    };

    return queueOperation(operation, 'sendBridgeAction');
  };

  /**
   * Execute an offer with managed sequence number
   */
  const executeOffer = async (
    offer: OfferSpec,
  ): Promise<
    Awaited<ReturnType<SigningSmartWalletKit['sendBridgeAction']>>
  > => {
    const txId = offer.offerArgs?.txId;
    const logPrefix = txId ? `[${txId}]` : '';

    const operation = async () => {
      const signerData = createSignerData();
      return signingSmartWalletKit.sendBridgeAction(
        harden({
          method: 'executeOffer',
          offer,
        }),
        undefined,
        undefined,
        signerData,
      );
    };

    return queueOperation(operation, 'executeOffer', logPrefix);
  };

  return harden({
    sendBridgeAction,
    executeOffer,
  });
};
