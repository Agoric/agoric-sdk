type ConvertResponse = {
  routes: Array<{
    tx: { to: string };
    outputs?: Array<{ token: string; amount: string }>;
    data?: {
      impliedApy?: number | { before?: number; after?: number };
      effectiveApy?: number;
    };
  }>;
};

type PendleAPIIO = {
  fetch: typeof globalThis.fetch;
  chainId: number;
};

type PendleRewardAsset = {
  accentColor: string | null;
  address: string;
  chainId: number;
  decimals: number;
  id: string;
  name: string;
  price: { usd: number };
  priceUpdatedAt: string;
  symbol: string;
};

type PendleRewardQuote = {
  amount: number;
  asset: PendleRewardAsset;
};

// cf GetMarketsCrossChainV2Response
export type PendleMarketData = {
  aggregatedApy: number;
  arbApy: number;
  assetPriceUsd: number;
  estimatedDailyPoolRewards: PendleRewardQuote[];
  impliedApy: number;
  liquidity: {
    acc: number;
    usd: number;
  };
  lpRewardApy: number;
  maxBoostedApy: number;
  pendleApy: number;
  ptDiscount: number;
  swapFeeApy: number;
  timestamp: string;
  totalActiveSupply: number;
  totalLp: number;
  totalPt: number;
  totalSy: number;
  totalTvl: {
    usd: number;
  };
  tradingVolume: {
    usd: number;
  };
  underlyingApy: number;
  underlyingInterestApy: number;
  underlyingRewardApy: number;
  voterApy: number;
  ytFloatingApy: number;
};

type PendleYieldRange = {
  max: number;
  min: number;
};

type PendleRewardBreakdown = {
  absoluteApy: number;
  asset: string;
  relativeApy: number;
};

export type PendleMarketSummary = {
  accountingAsset: string;
  address: string;
  categoryIds: string[];
  chainId: number;
  details: {
    aggregatedApy: number;
    feeRate: number;
    impliedApy: number;
    liquidity: number;
    maxBoostedApy: number;
    pendleApy: number;
    swapFeeApy: number;
    totalActiveSupply: number;
    totalPt: number;
    totalSupply: number;
    totalSy: number;
    totalTvl: number;
    tradingVolume: number;
    underlyingApy: number;
    yieldRange: PendleYieldRange;
  };
  expiry: string;
  inputTokens: string[];
  isNew: boolean;
  isPrime: boolean;
  isVolatile?: boolean;
  name: string;
  outputTokens: string[];
  pt: string;
  rewardTokens: string[];
  sy: string;
  timestamp: string;
  underlyingAsset: string;
  underlyingRewardApyBreakdown: PendleRewardBreakdown[];
  yt: string;
};

export type PendleAllMarkets = {
  markets: PendleMarketSummary[];
};

type GetQuoteArgs = {
  amountIn: bigint;
  receiver: string;
  slippage: string;
  tokensIn: string;
  tokensOut: string;
};

export const makePendleAPI = (
  apiBase: string,
  { fetch, chainId }: PendleAPIIO,
) => ({
  async getAllMarkets() {
    const url = `${apiBase}/v1/markets/all`;
    return (await fetch(url).then(r => {
      if ('ok' in r && !r.ok) {
        throw Error(`Pendle API ${r.status}: ${r.statusText}`);
      }
      return r.json();
    })) as PendleAllMarkets;
  },
  async getMarketData(marketAddress: string) {
    const url = `${apiBase}/v2/${chainId}/markets/${marketAddress}/data`;
    return (await fetch(url).then(r => {
      if ('ok' in r && !r.ok) {
        throw Error(`Pendle API ${r.status}: ${r.statusText}`);
      }
      return r.json();
    })) as PendleMarketData;
  },
  async getQuote({
    amountIn,
    receiver,
    slippage,
    tokensIn,
    tokensOut,
  }: GetQuoteArgs) {
    const params = new URLSearchParams({
      receiver,
      slippage,
      tokensIn,
      tokensOut,
      amountsIn: amountIn.toString(),
      enableAggregator: 'true',
      additionalData: 'impliedApy,effectiveApy',
    });
    const url = `${apiBase}/v2/sdk/${chainId}/convert?${params}`;
    const quote = (await fetch(url).then(r => {
      if ('ok' in r && !r.ok) {
        throw Error(`Pendle SDK ${r.status}: ${r.statusText}`);
      }
      return r.json();
    })) as ConvertResponse;
    const route = quote.routes[0];
    if (!route) throw Error('Pendle SDK returned no routes');
    return { quote, route };
  },
});
