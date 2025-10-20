import type { CosmosRestClient } from './cosmos-rest-client.ts';

type AccountInfo = {
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

type SequenceManagerConfig = {
  address: string;
  chainKey: string;
};

type SequenceManagerPowers = {
  cosmosRest: CosmosRestClient;
  log?: (...args: unknown[]) => void;
};

export type SequenceManager = {
  getSequence: () => number;
  getAccountNumber: () => number;
  syncSequence: () => Promise<void>;
};

/**
 * Create a new SequenceManager by fetching current account info from the network
 */
export const makeSequenceManager = async (
  io: SequenceManagerPowers,
  config: SequenceManagerConfig,
): Promise<SequenceManager> => {
  await null;
  const { cosmosRest, log = () => {} } = io;
  const { chainKey, address } = config;

  const fetchAccountInfo = async (): Promise<AccountInfo> => {
    await null;
    try {
      const response = (await cosmosRest.getAccountSequence(
        chainKey,
        address,
      )) as AccountResponse;
      return response.account;
    } catch (error) {
      log(`Failed to fetch account info for ${address}:`, error);
      throw error;
    }
  };

  const accountInfo = await fetchAccountInfo();

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
    const acctInfo = await fetchAccountInfo();
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
