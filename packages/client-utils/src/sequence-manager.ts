export type AccountInfo = {
  '@type': string;
  address: string;
  pub_key?: {
    '@type': string;
    key: string;
  };
  account_number: string;
  sequence: string;
};

export type AccountResponse = {
  account: AccountInfo;
};

/**
 * Function to fetch account information from the network
 */
export type FetchAccountInfo = (address: string) => Promise<AccountResponse>;

type SequenceManagerConfig = {
  address: string;
  fetchAccountInfo: FetchAccountInfo;
};

type SequenceManagerPowers = {
  log?: (...args: unknown[]) => void;
};

/**
 * @alpha
 */
export type SequenceManager = {
  getSequence: () => number;
  getAccountNumber: () => number;
  syncSequence: () => Promise<void>;
};

/**
 * Create a new SequenceManager by fetching current account info from the network
 *
 * @alpha
 */
export const makeSequenceManager = async (
  io: SequenceManagerPowers,
  config: SequenceManagerConfig,
): Promise<SequenceManager> => {
  await null;
  const { log = () => {} } = io;
  const { address, fetchAccountInfo } = config;

  const fetchAccount = async (): Promise<AccountInfo> => {
    await null;
    try {
      const response = await fetchAccountInfo(address);
      return response.account;
    } catch (error) {
      log(`Failed to fetch account info for ${address}:`, error);
      throw error;
    }
  };

  const accountInfo = await fetchAccount();

  let sequence = Number(accountInfo.sequence);
  const accountNumber = Number(accountInfo.account_number);

  log(
    `Sequence manager initialized: account=${accountNumber}, sequence=${sequence}`,
  );

  /**
   * Get the next sequence number and increment the internal counter
   */
  const getSequence = () => {
    const curr = sequence;
    sequence += 1;
    return curr;
  };

  /**
   * Get the account number
   */
  const getAccountNumber = () => accountNumber;

  /**
   * Sync sequence with the network (useful for error recovery)
   */
  const syncSequence = async () => {
    const oldSequence = sequence;
    const acctInfo = await fetchAccount();
    sequence = Number(acctInfo.sequence);
    log(
      `Synced sequence: ${oldSequence} → ${sequence} (network: ${acctInfo.sequence})`,
    );
  };

  return harden({
    getSequence,
    getAccountNumber,
    syncSequence,
  });
};
