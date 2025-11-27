import { BroadcastTxError } from '@cosmjs/stargate';
import type { BaseAccount } from '../src/codegen/cosmos/auth/v1beta1/auth.js';

export const createMockFetchAccount = (
  accountNumber: bigint,
  sequenceNumber: bigint,
) => {
  let callCount = 0;
  let currentSequence = sequenceNumber;

  const fetch = async (): Promise<BaseAccount> => {
    callCount += 1;
    return {
      address: 'agoric1test',
      accountNumber,
      sequence: currentSequence,
    };
  };

  return {
    fetch,
    setSequenceNumber: (newSequenceNumber: bigint) => {
      currentSequence = newSequenceNumber;
    },
    getCallCount: () => callCount,
    getNetworkSequence: () => currentSequence,
  };
};

export type SubmitTxResponse = {
  code: number;
  height: number;
  transactionHash: string;
  sequence: bigint;
};

export class MockSigningSmartWalletKit {
  #submittedTransactions: Array<{
    method: string;
    sequence: bigint;
  }> = [];

  #networkSequence: () => bigint;

  #shouldSimulateSequenceConflicts: boolean;

  #networkDelay: number;

  networkConfig = { chainName: 'agoricdev-25' };

  sendBridgeAction: (
    action: any,
    fee: any,
    memo: any,
    signerData: any,
  ) => Promise<SubmitTxResponse>;

  pollOffer: (
    _address: string,
    _offerId: string,
  ) => Promise<{ status: string }>;

  getSubmittedTransactions: () => Array<{ method: string; sequence: bigint }>;

  clearTransactions: () => void;

  setNetworkDelay: (delay: number) => void;

  constructor(
    getNetworkSequence: () => bigint,
    options: {
      simulateSequenceConflicts?: boolean;
      networkDelay?: number;
    } = {},
  ) {
    this.#networkSequence = getNetworkSequence;
    this.#shouldSimulateSequenceConflicts =
      options.simulateSequenceConflicts ?? false;
    this.#networkDelay = options.networkDelay ?? 10;

    this.sendBridgeAction = async (
      action: any,
      fee: any,
      memo: any,
      signerData: any,
    ): Promise<SubmitTxResponse> => {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, this.#networkDelay));

      const currentNetworkSequence = this.#networkSequence();

      // Simulate sequence mismatch if enabled and sequence is out of sync
      if (
        this.#shouldSimulateSequenceConflicts &&
        signerData.sequence < currentNetworkSequence
      ) {
        const log = `account sequence mismatch, expected ${currentNetworkSequence}, got ${signerData.sequence}: incorrect account sequence`;
        throw new BroadcastTxError(32, 'sdk', log);
      }

      // Record successful transaction
      const method = action.method || 'sendBridgeAction';
      this.#submittedTransactions.push({
        method,
        sequence: BigInt(signerData.sequence),
      });

      return {
        code: 0,
        height: 3321450 + this.#submittedTransactions.length,
        transactionHash: `hash_${method}_${signerData.sequence}`,
        sequence: BigInt(signerData.sequence),
      };
    };

    this.pollOffer = async (_address: string, _offerId: string) => {
      return { status: 'accepted' };
    };

    this.getSubmittedTransactions = () => {
      return this.#submittedTransactions;
    };

    this.clearTransactions = () => {
      this.#submittedTransactions = [];
    };

    this.setNetworkDelay = (delay: number) => {
      this.#networkDelay = delay;
    };
  }
}
