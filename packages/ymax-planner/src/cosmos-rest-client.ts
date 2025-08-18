/* eslint-disable max-classes-per-file */
import ky, { HTTPError, type KyInstance } from 'ky';

interface CosmosRestClientConfig {
  agoricNetwork?: string;
  timeout?: number;
  retries?: number;
}

interface CosmosRestClientPowers {
  fetch: typeof fetch;
  log?: (...args: unknown[]) => void;
  setTimeout: typeof setTimeout;
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

  private readonly http: KyInstance;

  constructor(io: CosmosRestClientPowers, config: CosmosRestClientConfig = {}) {
    this.fetch = io.fetch;
    this.setTimeout = io.setTimeout;
    if (!this.fetch || !this.setTimeout) {
      throw new Error('`fetch` and `setTimeout` are required');
    }

    this.agoricNetwork = config.agoricNetwork ?? 'devnet';
    this.log = io.log ?? (() => {});
    this.timeout = config.timeout ?? 10000; // 10s timeout
    this.retries = config.retries ?? 3;

    const chainConfig = CHAIN_CONFIGS[this.agoricNetwork];
    if (!chainConfig) {
      throw new Error(`Unknown chain config ${this.agoricNetwork}`);
    }

    // Initialize with predefined chains
    this.chainConfigs = new Map(Object.entries(chainConfig));

    // Create ky instance using provided fetch, retry, and timeout settings.
    this.http = ky.create({
      fetch: this.fetch,
      retry: {
        limit: this.retries,
        methods: ['get'],
      },
      timeout: this.timeout,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Agoric-YMax-Planner/1.0.0',
      },
    });
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
    try {
      const data = await this.http.get(url).json<T>();
      this.log(`[CosmosRestClient] Success: ${context}`);
      return data;
    } catch (err) {
      if (err instanceof HTTPError) {
        const { response } = err;
        let errorBody = '';
        try {
          errorBody = await response.text();
        } catch {
          errorBody = 'Unknown error';
        }
        throw new CosmosApiError(
          `HTTP ${response.status}: ${response.statusText} - ${errorBody}`,
          { statusCode: response.status, chainId: chainConfig.chainId, url },
        );
      }
      const e = err as Error;
      throw new CosmosApiError(`Failed to fetch ${context}: ${e.message}`, {
        statusCode: 0,
        chainId: chainConfig.chainId,
        url,
      });
    }
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
