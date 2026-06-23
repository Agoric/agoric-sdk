import test from 'ava';

import { Far } from '@endo/pass-style';
import type { Brand } from '@agoric/ertp/src/types.js';
import {
  makeYdsPortfolioBalanceReader,
  normalizeYdsPortfolioBalances,
} from '../src/yds-portfolio-balances.ts';

const brand = Far('mock USDC brand') as Brand<'nat'>;

const makeYdsPayload = (
  balances: unknown,
  extras: Record<string, unknown> = {},
) => ({
  data: {
    latestSnapshot: {
      balances,
      observedAt: '2026-06-18T00:00:00Z',
    },
    ...extras,
  },
});

test('normalizeYdsPortfolioBalances accepts current endpoint balances', t => {
  t.deepEqual(
    normalizeYdsPortfolioBalances(
      makeYdsPayload({
        positions: {
          USDN: 12.5,
          Aave_Base: 2.000001,
        },
        accounts: {
          noble: 25,
          Base: 1.25,
        },
      }),
      brand,
    ),
    {
      USDN: { brand, value: 12_500_000n },
      Aave_Base: { brand, value: 2_000_001n },
      '@noble': { brand, value: 25_000_000n },
      '@Base': { brand, value: 1_250_000n },
    },
  );
});

test('normalizeYdsPortfolioBalances rejects legacy balance shapes', t => {
  for (const payload of [
    { balances: { '@noble': '3000000' } },
    { data: { balances: { '@noble': '3000000' } } },
    { data: { portfolio: { balances: [] } } },
    makeYdsPayload([
      { place: '@Base', amount: 1 },
      { id: 'Aave_Base', balance: { value: '2' } },
    ]),
  ]) {
    t.throws(() => normalizeYdsPortfolioBalances(payload, brand));
  }
});

test('normalizeYdsPortfolioBalances rejects malformed places and balances', t => {
  for (const balances of [
    { positions: { NotAnInstrument: 1 }, accounts: {} },
    { positions: {}, accounts: { NotAChain: 1 } },
    { positions: { USDN: '1' }, accounts: {} },
    { positions: { USDN: { value: 1 } }, accounts: {} },
    { positions: { USDN: -1 }, accounts: {} },
    { positions: { USDN: Number.POSITIVE_INFINITY }, accounts: {} },
    { positions: { USDN: 0.0000001 }, accounts: {} },
    { positions: { USDN: Number.MAX_SAFE_INTEGER }, accounts: {} },
    { positions: [], accounts: {} },
    { positions: {}, accounts: [] },
  ]) {
    t.throws(() =>
      normalizeYdsPortfolioBalances(makeYdsPayload(balances), brand),
    );
  }
});

test('makeYdsPortfolioBalanceReader fetches portfolio endpoint with auth', async t => {
  const calls: Array<{ url: string; headers: Headers }> = [];
  const reader = makeYdsPortfolioBalanceReader(
    {
      fetch: async (input, init) => {
        const url = input instanceof Request ? input.url : String(input);
        const headers = new Headers(
          input instanceof Request ? input.headers : init?.headers,
        );
        calls.push({ url, headers });
        return new Response(
          JSON.stringify(
            makeYdsPayload({
              positions: {},
              accounts: { noble: 3 },
            }),
          ),
          {
            headers: { 'content-type': 'application/json' },
          },
        );
      },
    },
    {
      ydsUrl: 'https://yds.example.test/api',
      ydsApiKey: 'secret',
      retries: 0,
    },
  );

  t.deepEqual(await reader('portfolio7', brand), {
    '@noble': { brand, value: 3_000_000n },
  });
  t.is(calls.length, 1);
  t.is(calls[0].url, 'https://yds.example.test/api/portfolios/portfolio7');
  t.is(calls[0].headers.get('x-resolver-auth-key'), 'secret');
});
