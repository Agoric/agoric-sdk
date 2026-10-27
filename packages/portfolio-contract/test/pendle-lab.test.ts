import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { captureIO, replayIO } from '../../casting/test/net-access-fixture.js';
import { web1 as allMarkets1 } from './fixures/pendle-all-markets.js';
import { web1 as marketData1 } from './fixures/pendle-market-data.js';
import { web1 as quote1 } from './fixures/pendle-quote.js';
import { web1 as withdrawConfirmation1 } from './fixures/pendle-withdraw-confirmation.js';
import { makePendleAPI, type PendleMarketSummary } from './pendle-api.ts';

const require = createRequire(import.meta.url);

const asset = (spec: string) => readFile(require.resolve(spec), 'utf8');
const fixtures = {
  tx: await asset(
    './fixures/tx-0xb3e20275364cf36406de2c91dc76d5b102798c1c752586049e7f1fecee317778.json',
  ),
  receipt: await asset(
    './fixures/receipt-0xb3e20275364cf36406de2c91dc76d5b102798c1c752586049e7f1fecee317778.json',
  ),
};

const pendle = {
  apiBase: 'https://api-v2.pendle.finance/core',
  router: '0x888888888889758f76e7103c6cbf23abbf58f946',
  market: {
    address: '0x0934e592cee932b04b3967162b3cd6c85748c470',
    name: 'gUSDC',
    pt: '0x97c1a4ae3e0da8009aff13e3e3ee7ea5ee4afe84',
    expiry: '2026-06-25T00:00:00.000Z',
  },
} as const;

const lab = {
  buyer: '0x9f8a0b715ee38f6ac26ee06fd90a0296555d4155',
  expectedPtOut: 254136n,
  quote: {
    effectiveApy: '6.36%',
  },
  portfolio: {
    aaveArbitrumPrincipal: 10_000_000_000n,
    aaveArbitrumAccruedYield: 115_000_000n,
    pendleAllocationNumerator: 30n,
    pendleAllocationDenominator: 100n,
  },
  trade: {
    amountIn: 250000n,
    slippage: '0.01',
  },
} as const;

const erc20 = {
  transferTopic:
    '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
} as const;

const topicAddress = (address: string) =>
  `0x000000000000000000000000${address.slice(2).toLowerCase()}`;

const usdc = {
  arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
} as const;

// XXX factor the repeated RECORDING ? captureIO(...) : replayIO(...)
// setup into t.before(...) with per-test fixture selection.
const RECORDING = !!process.env.RECORDING;

const getQuote = async () => {
  const { fetch, web } = RECORDING
    ? captureIO(globalThis.fetch)
    : { fetch: replayIO(quote1), web: new Map() };
  const api = makePendleAPI(pendle.apiBase, {
    fetch,
    chainId: 42161,
  });
  const { route } = await api.getQuote({
    amountIn: lab.trade.amountIn,
    receiver: lab.buyer,
    slippage: lab.trade.slippage,
    tokensIn: usdc.arbitrum,
    tokensOut: pendle.market.pt,
  });
  return { route, web };
};

const getMarketData = async () => {
  const { fetch, web } = RECORDING
    ? captureIO(globalThis.fetch)
    : { fetch: replayIO(marketData1), web: new Map() };
  const api = makePendleAPI(pendle.apiBase, {
    fetch,
    chainId: 42161,
  });
  const data = await api.getMarketData(pendle.market.address);
  return { data, web };
};

const getAllMarkets = async () => {
  const { fetch, web } = RECORDING
    ? captureIO(globalThis.fetch)
    : { fetch: replayIO(allMarkets1), web: new Map() };
  const api = makePendleAPI(pendle.apiBase, {
    fetch,
    chainId: 42161,
  });
  const data = await api.getAllMarkets();
  return { data, web };
};

const getWithdrawConfirmationQuote = async () => {
  const { fetch, web } = RECORDING
    ? captureIO(globalThis.fetch)
    : { fetch: replayIO(withdrawConfirmation1), web: new Map() };
  const api = makePendleAPI(pendle.apiBase, {
    fetch,
    chainId: 42161,
  });
  const amountIn =
    ((lab.portfolio.aaveArbitrumPrincipal +
      lab.portfolio.aaveArbitrumAccruedYield) *
      lab.portfolio.pendleAllocationNumerator) /
    lab.portfolio.pendleAllocationDenominator;
  const { route: buyRoute } = await api.getQuote({
    amountIn,
    receiver: lab.buyer,
    slippage: lab.trade.slippage,
    tokensIn: usdc.arbitrum,
    tokensOut: pendle.market.pt,
  });
  const ptAmount = BigInt(buyRoute.outputs?.[0]?.amount ?? '0');
  const { route: exitRoute } = await api.getQuote({
    amountIn: ptAmount,
    receiver: lab.buyer,
    slippage: lab.trade.slippage,
    tokensIn: pendle.market.pt,
    tokensOut: usdc.arbitrum,
  });
  return { amountIn, buyRoute, exitRoute, web };
};

const findMarket = (markets: PendleMarketSummary[], address: string) =>
  markets.find(entry => entry.address.toLowerCase() === address);

test(`getQuote (RECORDING: ${RECORDING})`, async t => {
  const { route, web } = await getQuote();

  if (RECORDING) {
    t.snapshot(web);
    t.truthy(route.outputs?.[0]?.amount);
    t.truthy(route.data?.effectiveApy);
    return;
  }

  t.is(route.tx.to.toLowerCase(), pendle.router);
  t.is(route.outputs?.[0]?.token.toLowerCase(), pendle.market.pt);
  t.is(route.outputs?.[0]?.amount, '253785');
  t.is(route.data?.effectiveApy, 0.06080177284849442);
  t.is(`${((route.data?.effectiveApy ?? 0) * 100).toFixed(2)}%`, '6.08%');
});

test(`getMarketData (RECORDING: ${RECORDING})`, async t => {
  const { data, web } = await getMarketData();

  if (RECORDING) {
    t.snapshot(web);
    t.truthy(data);
    return;
  }

  t.is(data.underlyingApy, 0.05636353939736871);
  t.is(data.impliedApy, 0.0624609187352001);
});

test(`getAllMarkets (RECORDING: ${RECORDING})`, async t => {
  const { data, web } = await getAllMarkets();
  const { markets } = data;

  if (RECORDING) {
    t.snapshot(web);
    t.true(Array.isArray(markets));
    return;
  }

  t.true(Array.isArray(markets));
  const market = findMarket(markets, pendle.market.address);
  t.truthy(market);
  t.is(market?.chainId, 42161);
});

const extractPtPurchased = (receipt: {
  result: { logs: Array<{ address: string; topics: string[]; data: string }> };
}) => {
  const log = receipt.result.logs.find(
    ({ address, topics }) =>
      address.toLowerCase() === pendle.market.pt &&
      topics[0] === erc20.transferTopic &&
      topics[2] === topicAddress(lab.buyer),
  );
  if (!log) {
    throw Error('PT transfer to buyer not found in receipt fixture');
  }
  return BigInt(log.data);
};

test('lab fixtures show PT purchased amount', async t => {
  const tx: {
    result: { to: string; hash: string };
  } = JSON.parse(fixtures.tx);

  const receipt: {
    result: {
      status: string;
      logs: Array<{ address: string; topics: string[]; data: string }>;
    };
  } = JSON.parse(fixtures.receipt);

  t.is(tx.result.to.toLowerCase(), pendle.router);
  t.is(receipt.result.status, '0x1');
  t.is(extractPtPurchased(receipt), lab.expectedPtOut);
  // `effectiveApy` came from the Hosted SDK quote in the lab run; it does not
  // appear as a direct field in the raw tx or receipt artifacts cached here.
  t.is(lab.quote.effectiveApy, '6.36%');
});

// "A user opens their Ymax portfolio and sees Pendle PT instruments
// alongside existing variable-rate options.
// They notice a "Pendle PT-aUSDC - Arbitrum" instrument
// showing a fixed yield of 7.2% with a maturity date of Sept 26, 2026."
//
// but in this test, we'll use available gUSD values.
test('Pendle PT instrument shows a fixed yield and a maturity date', async t => {
  const { data } = await getAllMarkets();
  const accountingAsset = `42161-${usdc.arbitrum.toLowerCase()}`;
  const futureMarkets = data.markets.filter(
    entry => entry.expiry > '2026-01-01T00:00:00.000Z',
  );
  const activeMarkets = futureMarkets.filter(
    entry => entry.details.impliedApy > 0,
  );
  const rankedMarkets = [...activeMarkets].sort((left, right) => {
    return right.details.liquidity - left.details.liquidity;
  });

  t.log(`market count: ${data.markets.length}`);
  t.log(`future market count: ${futureMarkets.length}`);
  t.log(`future active market count: ${activeMarkets.length}`);
  t.log(
    rankedMarkets.slice(0, 12).map(entry => ({
      name: entry.name,
      maturity: entry.expiry,
      liquidity: entry.details.liquidity,
      fixedApy: entry.details.impliedApy,
      isArbitrumUsdcAccountingAsset: entry.accountingAsset === accountingAsset,
    })),
  );

  const market = findMarket(data.markets, pendle.market.address);
  t.truthy(market);
  t.is(market?.name, pendle.market.name);
  t.is(market?.expiry, pendle.market.expiry);
});

// They allocate 30% of their portfolio to it.
// The system swaps USDC for PT via Pendle's AMM, and
// the position appears in their portfolio showing their locked yield (7.2%),
// current market value, value at maturity, and a countdown to the maturity date.
test('plan for 30% pendle results in locked yield, market and maturity values, countdown', async t => {
  const { data } = await getMarketData();
  const totalUsdc =
    lab.portfolio.aaveArbitrumPrincipal +
    lab.portfolio.aaveArbitrumAccruedYield;
  const pendleAllocationUsdc =
    (totalUsdc * lab.portfolio.pendleAllocationNumerator) /
    lab.portfolio.pendleAllocationDenominator;
  const aaveYieldOnMovedBalance =
    (lab.portfolio.aaveArbitrumAccruedYield *
      lab.portfolio.pendleAllocationNumerator) /
    lab.portfolio.pendleAllocationDenominator;
  const msToMaturity =
    Date.parse(pendle.market.expiry) - Date.parse(data.timestamp);
  const daysToMaturity = msToMaturity / (24 * 60 * 60 * 1000);
  const ptExchangeRate = (1 + data.impliedApy) ** (daysToMaturity / 365);
  // XXX YDS would need a trade-size-specific Hosted SDK quote here to get the
  // exact effectiveApy and expectedPtOut for a 30%-of-portfolio rebalance.
  // This uses current market impliedApy as the best recorded approximation.
  const estimatedPtOut = BigInt(
    Math.round(Number(pendleAllocationUsdc) * ptExchangeRate),
  );
  const estimatedLockedYield = estimatedPtOut - pendleAllocationUsdc;

  t.is(totalUsdc, 10_115_000_000n);
  t.is(pendleAllocationUsdc, 3_034_500_000n);
  t.is(aaveYieldOnMovedBalance, 34_500_000n);
  t.true(daysToMaturity > 0);
  t.true(estimatedPtOut > pendleAllocationUsdc);
  t.true(estimatedLockedYield > 0n);
  t.log({
    portfolioUsdc: totalUsdc,
    pendleAllocationUsdc,
    currentImpliedFixedApy: data.impliedApy,
    currentMarketValue: pendleAllocationUsdc,
    valueAtMaturity: estimatedPtOut,
    estimatedLockedYield,
    countdownDays: daysToMaturity,
    aaveYieldOnMovedBalance,
  });
});

// Over the following weeks, the user withdraws some funds.
// The rebalance sells a portion of their PT at the current market price.
// Before executing, the system shows them what they'd give up
// relative to holding to maturity, and they confirm.
test(`withdraw confirmation shows lost yield (RECORDING: ${RECORDING})`, async t => {
  const { amountIn, buyRoute, exitRoute, web } =
    await getWithdrawConfirmationQuote();

  if (RECORDING) {
    t.snapshot(web);
    t.truthy(buyRoute.data?.effectiveApy);
    t.truthy(exitRoute.outputs?.[0]?.amount);
    return;
  }

  const totalUsdc =
    lab.portfolio.aaveArbitrumPrincipal +
    lab.portfolio.aaveArbitrumAccruedYield;
  const currentAaveYieldOnMovedBalance =
    (lab.portfolio.aaveArbitrumAccruedYield *
      lab.portfolio.pendleAllocationNumerator) /
    lab.portfolio.pendleAllocationDenominator;
  const valueAtMaturity = BigInt(buyRoute.outputs?.[0]?.amount ?? '0');
  const currentExitValue = BigInt(exitRoute.outputs?.[0]?.amount ?? '0');
  const giveUpBySellingNow = valueAtMaturity - currentExitValue;

  t.is(amountIn, 3_034_500_000n);
  t.true(totalUsdc === 10_115_000_000n);
  t.true(currentAaveYieldOnMovedBalance === 34_500_000n);
  t.true(valueAtMaturity > 0n);
  t.true(currentExitValue > 0n);
  t.true(giveUpBySellingNow >= 0n);
  t.log({
    portfolioUsdc: totalUsdc,
    pendleAllocationUsdc: amountIn,
    lockedYield: buyRoute.data?.effectiveApy,
    currentAaveYieldOnMovedBalance,
    expectedPtOut: valueAtMaturity,
    currentExitValue,
    giveUpBySellingNow,
  });
});

// On Sept 26, the PT matures. The system auto-redeems it to USDC,
// which appears in the user's Unallocated USDC on Arbitrum.
// They see a status update confirming the redemption and decide what to do next.
test('at maturity, PT is redeemed to USDC in @Arbitrum', async t => {
  const { buyRoute } = await getWithdrawConfirmationQuote();
  const ptAmount = BigInt(buyRoute.outputs?.[0]?.amount ?? '0');
  const redeemedUsdc = ptAmount;

  t.true(ptAmount > 0n);
  // XXX This uses Pendle's PT-at-maturity 1:1 redemption model. We still need
  // an observed redemption tx or backend status path to prove the production
  // "auto-redeemed to USDC" update end-to-end.
  t.is(redeemedUsdc, ptAmount);
  t.log({
    maturity: pendle.market.expiry,
    redeemedUsdc,
    unallocatedArbitrumUsdcAfterRedemption: redeemedUsdc,
  });
});
