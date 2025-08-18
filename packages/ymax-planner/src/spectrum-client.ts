/* eslint-disable max-classes-per-file */

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

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retries + 1; attempt += 1) {
      try {
        const controller = new AbortController();
        const timeoutId = this.setTimeout(
          () => controller.abort(),
          this.config.timeout,
        );

        const response = await this.fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Agoric-Portfolio-Planner/1.0.0',
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new SpectrumApiError(
            `HTTP ${response.status}: ${response.statusText}`,
            { statusCode: response.status, url, context },
          );
        }

        const data = await response.json();
        this.log(`[SpectrumClient] Success: ${context}`);
        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.config.retries + 1) {
          const delay = Math.min(1000 * 2 ** (attempt - 1), 5000); // Exponential backoff, max 5s
          this.log(
            `[SpectrumClient] Attempt ${attempt} failed for ${context}, retrying in ${delay}ms:`,
            lastError.message,
          );
          await new Promise(resolve => this.setTimeout(resolve, delay));
        }
      }
    }

    throw new SpectrumApiError(
      `Failed to fetch ${context} after ${this.config.retries} attempts: ${lastError?.message}`,
      {
        statusCode: 0,
        url,
        context,
        cause: lastError || undefined,
      },
    );
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
