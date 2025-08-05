const BASE_URL = "https://pools-api.spectrumnodes.com";

type Chain = "ethereum" | "optimism" | "polygon" | "arbitrum" | "base" | "avalanche";
type Pool = "aave" | "compound";

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
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

export class SpectrumClient {
  private readonly config: Required<SpectrumClientConfig>;

  constructor(config: SpectrumClientConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl ?? BASE_URL,
      timeout: config.timeout ?? 10000, // 10s timeout
      retries: config.retries ?? 3,
    };
  }

  async getApr(chain: Chain, pool: Pool): Promise<AprResponse> {
    const url = `${this.config.baseUrl}/apr?chain=${chain}&pool=${pool}`;
    console.log(`[SpectrumClient] Fetching APR: ${url}`);
    
    return this.makeRequest<AprResponse>(url, `APR for ${chain}/${pool}`);
  }

  async getPoolBalance(chain: Chain, pool: Pool, address: string): Promise<PoolBalanceResponse> {
    const url = `${this.config.baseUrl}/pool-balance?pool=${pool}&chain=${chain}&address=${address}`;
    console.log(`[SpectrumClient] Fetching pool balance: ${url}`);
    
    return this.makeRequest<PoolBalanceResponse>(url, `Pool balance for ${address} on ${chain}/${pool}`);
  }

  private async makeRequest<T>(url: string, context: string): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
        
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Agoric-Portfolio-Planner/1.0.0',
          },
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new SpectrumApiError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            context
          );
        }
        
        const data = await response.json();
        console.log(`[SpectrumClient] Success: ${context}`);
        return data;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.config.retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
          console.warn(`[SpectrumClient] Attempt ${attempt} failed for ${context}, retrying in ${delay}ms:`, lastError.message);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new SpectrumApiError(
      `Failed to fetch ${context} after ${this.config.retries} attempts: ${lastError?.message}`,
      0,
      context,
      lastError || undefined
    );
  }
}

class SpectrumApiError extends Error {
  public readonly statusCode: number;
  public readonly context: string;
  public readonly cause?: Error;

  constructor(
    message: string,
    statusCode: number,
    context: string,
    cause?: Error
  ) {
    super(message);
    this.name = 'SpectrumApiError';
    this.statusCode = statusCode;
    this.context = context;
    this.cause = cause;
  }
}

harden(SpectrumClient);
