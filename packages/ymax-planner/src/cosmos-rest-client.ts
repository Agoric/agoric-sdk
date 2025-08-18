/* eslint-disable max-classes-per-file */

interface CosmosRestClientConfig {
  fetch: typeof fetch;
  setTimeout: typeof setTimeout;

  agoricNetwork?: string;
  log?: (...args: unknown[]) => void;
  timeout?: number;
  retries?: number;
}

interface ChainConfig {
  chainId: string;
  restEndpoint: string;
  name: string;
}

interface Coin {
  denom: string;
  amount: string;
}

interface BalanceResponse {
  balances: Coin[];
  pagination?: {
    next_key: string | null;
    total: string;
  };
}

// TODO get from an SDK package
// Predefined chain configurations
const CHAIN_CONFIGS: Record<string, Record<string, ChainConfig>> = {
  main: {
    noble: {
      chainId: 'noble-1',
      restEndpoint: 'https://noble-api.polkachu.com',
      name: 'Noble',
    },
    agoric: {
      chainId: 'agoric-3',
      restEndpoint: 'https://main.api.agoric.net',
      name: 'Agoric',
    },
  },
  devnet: {
    noble: {
      chainId: 'grand-1',
      restEndpoint: 'https://noble-testnet-api.polkachu.com:443',
      name: 'Noble',
    },
    agoric: {
      chainId: 'agoricdev-25',
      restEndpoint: 'https://devnet.api.agoric.net',
      name: 'Agoric',
    },
  },
};

export class CosmosRestClient {
  private readonly fetch: typeof fetch;

  private readonly setTimeout: typeof setTimeout;

  private readonly agoricNetwork: string;

  private readonly log: (...args: unknown[]) => void;

  private readonly timeout: number;

  private readonly retries: number;

  private readonly chainConfigs: Map<string, ChainConfig>;

  constructor(config: CosmosRestClientConfig = {} as any) {
    this.fetch = config.fetch;
    this.setTimeout = config.setTimeout;
    if (!this.fetch || !this.setTimeout) {
      throw new Error('`fetch` and `setTimeout` are required');
    }

    this.agoricNetwork = config.agoricNetwork ?? 'devnet';
    this.log = config.log ?? (() => {});
    this.timeout = config.timeout ?? 10000; // 10s timeout
    this.retries = config.retries ?? 3;

    const chainConfig = CHAIN_CONFIGS[this.agoricNetwork];
    if (!chainConfig) {
      throw new Error(`Unknown chain config ${this.agoricNetwork}`);
    }

    // Initialize with predefined chains
    this.chainConfigs = new Map(Object.entries(chainConfig));
  }

  /**
   * Fetch account balances for a specific chain
   */
  async getAccountBalances(
    chainKey: string,
    address: string,
    pagination?: { limit?: number; offset?: number },
  ): Promise<BalanceResponse> {
    const chainConfig = this.chainConfigs.get(chainKey);
    if (!chainConfig) {
      throw new Error(
        `Chain configuration not found for: ${chainKey}. Available: ${Array.from(this.chainConfigs.keys()).join(', ')}`,
      );
    }

    let url = `${chainConfig.restEndpoint}/cosmos/bank/v1beta1/balances/${address}`;

    // Add pagination parameters if provided
    const params = new URLSearchParams();
    if (pagination?.limit) {
      params.set('pagination.limit', `${pagination.limit}`);
    }
    if (pagination?.offset) {
      params.set('pagination.offset', `${pagination.offset}`);
    }
    if (params.size > 0) {
      url += `?${params.toString()}`;
    }

    this.log(
      `[CosmosRestClient] Fetching balances for ${address} on ${chainConfig.name}: ${url}`,
    );

    return this.makeRequest<BalanceResponse>(
      url,
      chainConfig,
      `Account balances for ${address} on ${chainConfig.name}`,
    );
  }

  /**
   * Fetch balance for a specific denomination
   */
  async getAccountBalance(
    chainKey: string,
    address: string,
    denom: string,
  ): Promise<Coin> {
    const chainConfig = this.chainConfigs.get(chainKey);
    if (!chainConfig) {
      throw new Error(`Chain configuration not found for: ${chainKey}`);
    }

    const url = `${chainConfig.restEndpoint}/cosmos/bank/v1beta1/balances/${address}/by_denom?denom=${encodeURIComponent(denom)}`;

    this.log(
      `[CosmosRestClient] Fetching ${denom} balance for ${address} on ${chainConfig.name}: ${url}`,
    );

    const response = await this.makeRequest<{ balance: Coin }>(
      url,
      chainConfig,
      `${denom} balance for ${address} on ${chainConfig.name}`,
    );

    return response.balance;
  }

  /**
   * Get chain information/status
   */
  async getChainInfo(chainKey: string) {
    const chainConfig = this.chainConfigs.get(chainKey);
    if (!chainConfig) {
      throw new Error(`Chain configuration not found for: ${chainKey}`);
    }

    const url = `${chainConfig.restEndpoint}/cosmos/base/tendermint/v1beta1/node_info`;

    this.log(
      `[CosmosRestClient] Fetching chain info for ${chainConfig.name}: ${url}`,
    );

    return this.makeRequest(
      url,
      chainConfig,
      `Chain info for ${chainConfig.name}`,
    );
  }

  private async makeRequest<T>(
    url: string,
    chainConfig: ChainConfig,
    context: string,
  ): Promise<T> {
    await null;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retries + 1; attempt += 1) {
      try {
        const controller = new AbortController();
        const timeoutId = this.setTimeout(
          () => controller.abort(),
          this.timeout,
        );

        const response = await this.fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Agoric-YMax-Planner/1.0.0',
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.text().catch(() => 'Unknown error');
          throw new CosmosApiError(
            `HTTP ${response.status}: ${response.statusText} - ${errorBody}`,
            { statusCode: response.status, chainId: chainConfig.chainId, url },
          );
        }

        const data = await response.json();
        this.log(`[CosmosRestClient] Success: ${context}`);
        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.retries + 1) {
          const delay = Math.min(1000 * 2 ** (attempt - 1), 5000); // Exponential backoff, max 5s
          this.log(
            `[CosmosRestClient] Attempt ${attempt} failed for ${context}, retrying in ${delay}ms:`,
            lastError.message,
          );
          await new Promise(resolve => this.setTimeout(resolve, delay));
        }
      }
    }

    throw new CosmosApiError(
      `Failed to fetch ${context} after ${this.retries} attempts: ${lastError?.message}`,
      { statusCode: 0, chainId: chainConfig.chainId, url },
    );
  }
}

class CosmosApiError extends Error {
  public readonly statusCode: number;

  public readonly chainId: string;

  public readonly url: string;

  public readonly cause?: Error;

  constructor(
    message: string,
    details: {
      statusCode: number;
      chainId: string;
      url: string;
      cause?: Error;
    },
  ) {
    const { statusCode, chainId, url, cause } = details;
    super(message, { cause });
    this.name = 'CosmosApiError';
    this.statusCode = statusCode;
    this.chainId = chainId;
    this.url = url;
  }
}

harden(CosmosRestClient);
