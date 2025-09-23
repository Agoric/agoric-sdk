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

export class SequenceManager {
  #sequence: number;

  #accountNumber: number;

  #address: string;

  #cosmosRest: CosmosRestClient;

  #chainName: string;

  #log: (...args: unknown[]) => void;

  private constructor(
    io: SequenceManagerPowers,
    config: SequenceManagerConfig,
    accountInfo: AccountInfo,
  ) {
    this.#address = config.address;
    this.#chainName = config.chainKey;
    this.#cosmosRest = io.cosmosRest;
    this.#log = io.log ?? (() => {});
    this.#sequence = Number(accountInfo.sequence);
    this.#accountNumber = Number(accountInfo.account_number);
    this.#log(
      `Sequence manager initialized: account=${this.#accountNumber}, sequence=${this.#sequence}`,
    );
  }

  /**
   * Create a new SequenceManager by fetching current account info from the network
   */
  static async create(
    io: SequenceManagerPowers,
    config: SequenceManagerConfig,
  ): Promise<SequenceManager> {
    await null;
    try {
      const response = await io.cosmosRest.getAccountSequence(
        config.chainKey,
        config.address,
      );
      const accountInfo = response.account;
      return new SequenceManager(io, config, accountInfo);
    } catch (error) {
      io.log?.(`Failed to fetch account info for ${config.address}:`, error);
      throw error;
    }
  }

  /**
   * Get the next sequence number and increment the internal counter
   */
  getSequence(): number {
    const curr = this.#sequence;
    this.#sequence += 1;
    return curr;
  }

  /**
   * Get the account number
   */
  getAccountNumber(): number {
    return this.#accountNumber;
  }

  /**
   * Sync sequence with the network (useful for error recovery)
   */
  async syncSequence(): Promise<void> {
    const oldSequence = this.#sequence;
    const accountInfo = await this.#fetchAccountInfo();
    this.#sequence = Number(accountInfo.sequence);
    this.#log(
      `Synced sequence: ${oldSequence} → ${this.#sequence} (network: ${accountInfo.sequence})`,
    );
  }

  async #fetchAccountInfo(): Promise<AccountInfo> {
    await null;
    try {
      const response = (await this.#cosmosRest.getAccountSequence(
        this.#chainName,
        this.#address,
      )) as AccountResponse;
      return response.account;
    } catch (error) {
      this.#log(`Failed to fetch account info for ${this.#address}:`, error);
      throw error;
    }
  }
}

harden(SequenceManager);
