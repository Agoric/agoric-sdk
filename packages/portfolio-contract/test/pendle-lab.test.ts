import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { captureIO, replayIO } from '../../casting/test/net-access-fixture.js';
import { makePendleAPI } from './pendle-api.ts';
import { web1 as quote1 } from './fixures/pendle-quote.js';

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

const RECORDING = !!process.env.RECORDING;

test(`getQuote (RECORDING: ${RECORDING})`, async t => {
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

  if (RECORDING) {
    t.snapshot(web);
  }

  t.is(route.tx.to.toLowerCase(), pendle.router);
  t.is(route.outputs?.[0]?.token.toLowerCase(), pendle.market.pt);
  t.is(route.outputs?.[0]?.amount, '253785');
  t.is(`${((route.data?.effectiveApy ?? 0) * 100).toFixed(2)}%`, '6.08%');
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
