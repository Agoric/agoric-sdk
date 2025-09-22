import type {
  InvokeEntryMessage,
  OfferSpec,
} from '@agoric/smart-wallet/src/offers.js';
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

/**
 * A smart wallet kit wrapper that manages sequence numbers for wallet operations.
 * Provides automatic sequence number management and retry logic.
 */
export class SmartWalletWithSequence {
  private readonly signingSmartWalletKit: SigningSmartWalletKit;
  private readonly sequenceManager: SequenceManager;
  private readonly log: (...args: unknown[]) => void;
  private readonly chainId: string;

  constructor(
    powers: SmartWalletWithSequencePowers,
    config: SmartWalletWithSequenceConfig,
  ) {
    this.signingSmartWalletKit = powers.signingSmartWalletKit;
    this.sequenceManager = powers.sequenceManager;
    this.chainId = config.chainId;
    this.log = powers.log ?? (() => {});
  }

  /**
   * Creates SignerData with managed sequence number
   */
  private createSignerData(): SignerData {
    const sequence = this.sequenceManager.getSequence();
    const accountNumber = this.sequenceManager.getAccountNumber();

    this.log(
      `Creating SignerData with sequence: ${sequence}, accountNumber: ${accountNumber}`,
    );

    return {
      accountNumber,
      sequence,
      chainId: this.chainId,
    };
  }

  /**
   * Handles sequence number errors and retries with sync
   */
  private async handleSequenceError<T>(
    operation: () => Promise<T>,
    context: string,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('account sequence mismatch')) {
        this.log(
          `Sequence error detected in ${context}, syncing and retrying:`,
          errorMessage,
        );

        // Sync sequence with network and retry once
        await this.sequenceManager.syncSequence();

        try {
          return await operation();
        } catch (retryError) {
          this.log(`Retry failed for ${context}:`, retryError);
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
      const signerData = this.createSignerData();
      return this.signingSmartWalletKit.sendBridgeAction(
        action,
        undefined,
        signerData,
      );
    };

    return this.handleSequenceError(operation, 'sendBridgeAction');
  }

  /**
   * Execute an offer with managed sequence number
   */
  async executeOffer(
    offer: OfferSpec,
  ): Promise<Awaited<ReturnType<SigningSmartWalletKit['executeOffer']>>> {
    const operation = async () => {
      const signerData = this.createSignerData();
      return this.signingSmartWalletKit.executeOffer(offer, signerData);
    };

    return this.handleSequenceError(operation, 'executeOffer');
  }

  /**
   * Invoke an entry with managed sequence number
   */
  async invokeEntry(
    message: InvokeEntryMessage,
  ): Promise<Awaited<ReturnType<SigningSmartWalletKit['invokeEntry']>>> {
    const operation = async () => {
      const signerData = this.createSignerData();
      return this.signingSmartWalletKit.invokeEntry(message, signerData);
    };

    return this.handleSequenceError(operation, 'invokeEntry');
  }
}

harden(SmartWalletWithSequence);
