import type { BaseAccount } from './codegen/cosmos/auth/v1beta1/auth.js';

/**
 * @alpha
 */
export type TxSequencer = {
  getAccountNumber: () => bigint;
  getSequenceNumber: () => bigint;
  resync: () => Promise<void>;
};

/**
 * Manage sequence numbers for submitting transactions from a single address.
 *
 * @alpha
 */
export const makeTxSequencer = async (
  fetchAccount: () => Promise<BaseAccount>,
  { log = () => {} }: { log?: (...args: unknown[]) => void },
): Promise<TxSequencer> => {
  const initial = await fetchAccount();
  const accountNumber: bigint = initial.accountNumber;
  let sequenceNumber: bigint = initial.sequence;
  log(
    `Initialized accountNumber ${accountNumber} sequence number to ${sequenceNumber}`,
  );

  /**
   * Get the account number.
   */
  const getAccountNumber = () => accountNumber;

  /**
   * Get the next sequence number and increment the internal counter.
   */
  const getSequenceNumber = () => {
    const curr = sequenceNumber;
    sequenceNumber += 1n;
    return curr;
  };

  /**
   * Resync with the network (useful for error recovery).
   */
  const resync = async () => {
    const old = sequenceNumber;
    const account = await fetchAccount();
    sequenceNumber = account.sequence;
    log(
      `Resynced accountNumber ${accountNumber} sequence number from ${old} to ${sequenceNumber}`,
    );
  };

  return harden({
    getAccountNumber,
    getSequenceNumber,
    resync,
  });
};
