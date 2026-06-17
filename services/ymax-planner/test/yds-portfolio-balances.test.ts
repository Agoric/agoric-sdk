import test from 'ava';

import { Far } from '@endo/pass-style';
import type { Brand } from '@agoric/ertp/src/types.js';
import {
  makeYdsPortfolioBalanceReader,
  normalizeYdsPortfolioBalances,
} from '../src/yds-portfolio-balances.ts';

const brand = Far('mock USDC brand') as Brand<'nat'>;

test('normalizeYdsPortfolioBalances accepts record balances', t => {
  t.deepEqual(
    normalizeYdsPortfolioBalances(
      {
        data: {
          balances: {
            '@agoric': '25000000',
            USDN: { value: '12000000' },
          },
        },
      },
      brand,
    ),
    {
      '@agoric': { brand, value: 25_000_000n },
      USDN: { brand, value: 12_000_000n },
    },
  );
});

test('normalizeYdsPortfolioBalances accepts array balances', t => {
  t.deepEqual(
    normalizeYdsPortfolioBalances(
      {
        data: {
          portfolio: {
            balances: [
              { place: '@Base', amount: 1_000_000 },
              { id: 'Aave_Base', balance: { value: '2000000' } },
            ],
          },
        },
      },
      brand,
    ),
    {
      '@Base': { brand, value: 1_000_000n },
      Aave_Base: { brand, value: 2_000_000n },
    },
  );
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
          JSON.stringify({ balances: { '@noble': '3000000' } }),
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
