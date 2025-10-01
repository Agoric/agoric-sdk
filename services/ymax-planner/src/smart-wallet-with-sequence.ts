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

/**
 * A smart wallet kit wrapper that manages sequence numbers for wallet operations.
 * Provides sequence number management and retry logic.
 * Uses a queue to ensure sequential execution and prevent sequence conflicts.
 */
export class SmartWalletWithSequence {
  #signingSmartWalletKit: SigningSmartWalletKit;

  #sequenceManager: SequenceManager;

  #log: (...args: unknown[]) => void;

  #chainId: string;

  // TODO: Add bounds checking to prevent unbounded queue growth under sustained failures
  #operationQueue: QueuedOperation<any>[] = [];

  #isProcessingQueue = false;

  constructor(
    powers: SmartWalletWithSequencePowers,
    config: SmartWalletWithSequenceConfig,
  ) {
    this.#signingSmartWalletKit = powers.signingSmartWalletKit;
    this.#sequenceManager = powers.sequenceManager;
    this.#chainId = config.chainId;
    this.#log = powers.log ?? (() => {});
  }

  /**
   * Creates SignerData with managed sequence number
   */
  #createSignerData(): SignerData {
    const sequence = this.#sequenceManager.getSequence();
    const accountNumber = this.#sequenceManager.getAccountNumber();

    this.#log(
      `Creating SignerData with sequence: ${sequence}, accountNumber: ${accountNumber}`,
    );

    return {
      accountNumber,
      sequence,
      chainId: this.#chainId,
    };
  }

  /**
   * Queue an operation for sequential execution
   */
  async #queueOperation<T>(
    operation: () => Promise<T>,
    context: string,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.#operationQueue.push({
        operation,
        resolve,
        reject,
        context,
      });

      this.#log(
        `Queued ${context}, queue length: ${this.#operationQueue.length}`,
      );

      if (!this.#isProcessingQueue) {
        this.#isProcessingQueue = true;
        void this.#processQueue().finally(() => {
          this.#isProcessingQueue = false;
        });
      }
    });
  }

  /**
   * Process the operation queue sequentially
   */
  async #processQueue(): Promise<void> {
    await null;
    this.#log(
      `Starting queue processing, ${this.#operationQueue.length} operations queued`,
    );

    while (this.#operationQueue.length > 0) {
      const queuedOp = this.#operationQueue.shift()!;

      this.#log(
        `Processing ${queuedOp.context}, ${this.#operationQueue.length} remaining`,
      );

      try {
        const result = await this.#performOperation(
          queuedOp.operation,
          queuedOp.context,
        );
        queuedOp.resolve(result);
        this.#log(`Completed ${queuedOp.context}`);
      } catch (error) {
        this.#log(`Failed ${queuedOp.context}:`, error);
        queuedOp.reject(error);
      }
    }
  }

  /**
   * Handles sequence number errors and retries with sync
   */
  async #performOperation<T>(
    operation: () => Promise<T>,
    context: string,
  ): Promise<T> {
    await null;
    try {
      return await operation();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('account sequence mismatch')) {
        this.#log(
          `Sequence error detected in ${context}, syncing and retrying:`,
          errorMessage,
        );

        // Sync sequence with network and retry once
        await this.#sequenceManager.syncSequence();

        try {
          return await operation();
        } catch (retryError) {
          this.#log(`Retry failed for ${context}:`, retryError);
          throw retryError;
        }
      }

      throw error;
    }
  }

  /**
   * Send a bridge action with managed sequence number
   */
  async sendBridgeAction(
    action: BridgeAction,
  ): Promise<Awaited<ReturnType<SigningSmartWalletKit['sendBridgeAction']>>> {
    const operation = async () => {
      const signerData = this.#createSignerData();
      return this.#signingSmartWalletKit.sendBridgeAction(
        action,
        undefined,
        undefined,
        signerData,
      );
    };

    return this.#queueOperation(operation, 'sendBridgeAction');
  }

  /**
   * Execute an offer with managed sequence number
   */
  async executeOffer(
    offer: OfferSpec,
  ): Promise<Awaited<ReturnType<SigningSmartWalletKit['sendBridgeAction']>>> {
    const operation = async () => {
      const signerData = this.#createSignerData();
      return this.#signingSmartWalletKit.sendBridgeAction(
        harden({
          method: 'executeOffer',
          offer,
        }),
        undefined,
        undefined,
        signerData,
      );
    };

    return this.#queueOperation(operation, 'executeOffer');
  }
}

harden(SmartWalletWithSequence);
