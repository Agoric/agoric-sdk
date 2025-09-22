import { Fail } from '@endo/errors';
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

type AccountResponse = {
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
  private sequence: number = 0;
  private accountNumber: number = 0;
  private readonly address: string;

  private readonly cosmosRest: CosmosRestClient;
  private readonly chainName: string;

  private initialized = false;
  private readonly log: (...args: unknown[]) => void;

  constructor(io: SequenceManagerPowers, config: SequenceManagerConfig) {
    this.address = config.address;
    this.chainName = config.chainKey;
    this.cosmosRest = io.cosmosRest;
    this.log = io.log ?? (() => {});
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      Fail`SequenceManager not initialized. Call initialize() first.`;
    }
  }

  /**
   * Fetch current account info from the network and initialize sequence tracking
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const accountInfo = await this.fetchAccountInfo();
    this.sequence = Number(accountInfo.sequence);
    this.accountNumber = Number(accountInfo.account_number);
    this.initialized = true;
    this.log(
      `Sequence manager initialized: account=${this.accountNumber}, sequence=${this.sequence}`,
    );
  }

  /**
   * Get the next sequence number and increment the internal counter
   */
  getSequence(): number {
    this.ensureInitialized();
    const curr = this.sequence;
    this.sequence += 1;
    return curr;
  }

  /**
   * Get the account number
   */
  getAccountNumber(): number {
    this.ensureInitialized();
    return this.accountNumber;
  }

  /**
   * Sync sequence with the network (useful for error recovery)
   */
  async syncSequence(): Promise<void> {
    const accountInfo = await this.fetchAccountInfo();
    this.sequence = Number(accountInfo.sequence);
  }

  private async fetchAccountInfo(): Promise<AccountInfo> {
    try {
      const response = (await this.cosmosRest.getAccountSequence(
        this.chainName,
        this.address,
      )) as AccountResponse;
      return response.account;
    } catch (error) {
      this.log(`Failed to fetch account info for ${this.address}:`, error);
      throw error;
    }
  }
}
