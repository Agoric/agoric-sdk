interface CosmosRestClientConfig {
  timeout?: number;
  retries?: number;
  variant: string;
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

interface CosmosApiError extends Error {
  statusCode: number;
  chainId: string;
  endpoint?: string;
}

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
  private readonly config: Required<CosmosRestClientConfig>;

  private readonly chainConfigs: Map<string, ChainConfig>;

  constructor(config: CosmosRestClientConfig) {
    this.config = {
      timeout: config.timeout ?? 10000, // 10s timeout
      retries: config.retries ?? 3,
      variant: config.variant,
    };

    const chainConfig = CHAIN_CONFIGS[config.variant];

    if (!chainConfig) {
      throw new Error(`Unknown chain config ${this.config.variant}`);
    }

    // Initialize with predefined chains
    this.chainConfigs = new Map(Object.entries(chainConfig));
  }

  /**
   * Add or update a chain configuration
   */
  addChain(chainKey: string, chainConfig: ChainConfig): void {
    this.chainConfigs.set(chainKey, chainConfig);
  }

  /**
   * Get available chain configurations
   */
  getAvailableChains(): Array<{ key: string; config: ChainConfig }> {
    return Array.from(this.chainConfigs.entries()).map(([key, config]) => ({
      key,
      config,
    }));
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
      params.set('pagination.limit', pagination.limit.toString());
    }
    if (pagination?.offset) {
      params.set('pagination.offset', pagination.offset.toString());
    }
    if (params.size > 0) {
      url += `?${params.toString()}`;
    }

    console.warn(
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

    console.warn(
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

    console.warn(
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

    for (let attempt = 1; attempt <= this.config.retries; attempt += 1) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.config.timeout,
        );

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Agoric-Portfolio-Planner/1.0.0',
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.text().catch(() => 'Unknown error');
          const error = new Error(
            `HTTP ${response.status}: ${response.statusText} - ${errorBody}`,
          ) as CosmosApiError;
          error.statusCode = response.status;
          error.chainId = chainConfig.chainId;
          error.endpoint = url;
          throw error;
        }

        const data = await response.json();
        console.warn(`[CosmosRestClient] Success: ${context}`);
        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.config.retries) {
          const delay = Math.min(1000 * 2 ** (attempt - 1), 5000); // Exponential backoff, max 5s
          console.warn(
            `[CosmosRestClient] Attempt ${attempt} failed for ${context}, retrying in ${delay}ms:`,
            lastError.message,
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    const finalError = new Error(
      `Failed to fetch ${context} after ${this.config.retries} attempts: ${lastError?.message}`,
    ) as CosmosApiError;
    finalError.statusCode = 0;
    finalError.chainId = chainConfig.chainId;
    throw finalError;
  }
}

harden(CosmosRestClient);
