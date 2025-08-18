/* eslint-disable max-classes-per-file */
import ky, { HTTPError, type KyInstance } from 'ky';

const BASE_URL = 'https://pools-api.spectrumnodes.com';

// XXX refactor using portfolio-contract/type-guards.ts?
export type Chain =
  | 'ethereum'
  | 'optimism'
  | 'polygon'
  | 'arbitrum'
  | 'base'
  | 'avalanche';
export type Pool = 'aave' | 'compound';

interface AprResponse {
  pool: Pool;
  chain: Chain;
  apr: number;
}

interface PoolBalanceResponse {
  pool: Pool;
  chain: Chain;
  address: string;
  balance: {
    supplyBalance: number;
    borrowAmount: number;
  };
}

interface SpectrumClientConfig {
  fetch: typeof fetch;
  setTimeout: typeof setTimeout;

  baseUrl?: string;
  log?: (...args: unknown[]) => void;
  timeout?: number;
  retries?: number;
}

export class SpectrumClient {
  private readonly fetch: typeof fetch;

  private readonly setTimeout: typeof setTimeout;

  private readonly log: (...args: unknown[]) => void;

  private readonly config: Required<
    Pick<SpectrumClientConfig, 'baseUrl' | 'timeout' | 'retries'>
  >;

  private readonly http: KyInstance;

  constructor(config: SpectrumClientConfig = {} as any) {
    this.fetch = config.fetch;
    this.setTimeout = config.setTimeout;
    if (!this.fetch || !this.setTimeout) {
      throw new Error('`fetch` and `setTimeout` are required');
    }

    this.log = config.log ?? (() => {});
    this.config = {
      baseUrl: config.baseUrl ?? BASE_URL,
      timeout: config.timeout ?? 10000, // 10s timeout
      retries: config.retries ?? 3,
    };

    // Create ky instance with retries and timeout; use provided fetch.
    this.http = ky.create({
      fetch: this.fetch,
      retry: {
        // ky's limit is the number of retries after the initial request
        limit: this.config.retries,
        methods: ['get'],
      },
      timeout: this.config.timeout,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Agoric-Portfolio-Planner/1.0.0',
      },
    });
  }

  async getApr(chain: Chain, pool: Pool): Promise<AprResponse> {
    const url = `${this.config.baseUrl}/apr?chain=${chain}&pool=${pool}`;
    this.log(`[SpectrumClient] Fetching APR: ${url}`);

    return this.makeRequest<AprResponse>(url, `APR for ${chain}/${pool}`);
  }

  async getPoolBalance(
    chain: Chain,
    pool: Pool,
    address: string,
  ): Promise<PoolBalanceResponse> {
    const url = `${this.config.baseUrl}/pool-balance?pool=${pool}&chain=${chain}&address=${address}`;
    this.log(`[SpectrumClient] Fetching pool balance: ${url}`);

    return this.makeRequest<PoolBalanceResponse>(
      url,
      `Pool balance for ${address} on ${chain}/${pool}`,
    );
  }

  private async makeRequest<T>(url: string, context: string): Promise<T> {
    await null;
    try {
      const data = await this.http.get(url).json<T>();
      this.log(`[SpectrumClient] Success: ${context}`);
      return data;
    } catch (err) {
      if (err instanceof HTTPError) {
        const { response } = err;
        const msg = `HTTP ${response.status}: ${response.statusText}`;
        throw new SpectrumApiError(msg, {
          statusCode: response.status,
          url,
          context,
          cause: err,
        });
      }
      const e = err as Error;
      throw new SpectrumApiError(`Failed to fetch ${context}: ${e.message}`, {
        statusCode: 0,
        url,
        context,
        cause: e,
      });
    }
  }
}

class SpectrumApiError extends Error {
  public readonly statusCode: number;

  public readonly url: string;

  public readonly context: string;

  public readonly cause?: Error;

  constructor(
    message: string,
    details: {
      statusCode: number;
      url: string;
      context: string;
      cause?: Error;
    },
  ) {
    const { statusCode, url, context, cause } = details;
    super(message, { cause });
    this.name = 'SpectrumApiError';
    this.statusCode = statusCode;
    this.url = url;
    this.context = context;
  }
}

harden(SpectrumClient);
