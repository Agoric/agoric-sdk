import '@endo/init/debug.js';

import test from 'ava';

import {
  portfolioObservationsFromEIP712,
  portfolioObservationsToEIP712,
  ymaxObservationMessageKit,
  type PortfolioObservationsEIP712,
  type PortfolioObservationsContent,
} from '../src/observation-messages.ts';

const observation: PortfolioObservationsContent = harden({
  portfolioId: 12,
  syncState: { policyVersion: 3, rebalanceCount: 7 },
  observations: {
    balances: { '@Base': 200_000_000n, Aave_Base: 100_000_000n },
    instrumentTvls: { Aave_Base: { tvlUsd: 12_000_000n } },
  },
});

const wire: PortfolioObservationsEIP712 = harden({
  portfolio: 12n,
  syncState: { policyVersion: 3n, rebalanceCount: 7n },
  holdings: [
    { place: '@Base', balanceUsdc: 200_000_000n },
    { place: 'Aave_Base', balanceUsdc: 100_000_000n },
  ],
  instruments: [{ instrumentId: 'Aave_Base', tvlUsd: 12_000_000n }],
});

test('portfolioObservationsToEIP712 / portfolioObservationsFromEIP712 round trip', t => {
  t.deepEqual(portfolioObservationsToEIP712(observation), {
    ...wire,
    portfolio: 12,
    syncState: { policyVersion: 3, rebalanceCount: 7 },
  });
  t.deepEqual(portfolioObservationsFromEIP712(wire), observation);
});

test('portfolioObservationsToEIP712 omits absent entries', t => {
  const { holdings, instruments } = portfolioObservationsToEIP712(
    harden({
      ...observation,
      observations: {
        balances: { '@Base': 1n, Aave_Base: undefined },
        instrumentTvls: { Aave_Base: undefined },
      },
    }),
  );
  t.deepEqual(holdings, [{ place: '@Base', balanceUsdc: 1n }]);
  t.deepEqual(instruments, []);
});

test('the domain is distinct from Ymax portfolio operations', t => {
  t.like(
    ymaxObservationMessageKit.getStandaloneDomain(1n, `0x${'1'.repeat(40)}`),
    {
      name: 'YmaxObservation',
      version: '1',
    },
  );
});

const rejected = (
  label: string,
  data: unknown,
  message: RegExp,
): [string, unknown, RegExp] => [label, harden(data), message];

for (const [label, data, message] of [
  rejected(
    'seat place',
    { ...wire, holdings: [{ place: '<Cash>', balanceUsdc: 1n }] },
    /invalid holding place "<Cash>"/,
  ),
  rejected(
    'duplicate place',
    { ...wire, holdings: [...wire.holdings, wire.holdings[0]] },
    /duplicate holding place "@Base"/,
  ),
  rejected(
    'invalid instrument',
    { ...wire, instruments: [{ instrumentId: '@Base', tvlUsd: 1n }] },
    /invalid instrument "@Base"/,
  ),
  rejected(
    'duplicate instrument',
    { ...wire, instruments: [...wire.instruments, wire.instruments[0]] },
    /duplicate instrument "Aave_Base"/,
  ),
  rejected(
    'unsafe portfolio id',
    { ...wire, portfolio: 2n ** 53n },
    /"portfolio" out of range/,
  ),
  rejected(
    'unsafe rebalance count',
    { ...wire, syncState: { policyVersion: 3n, rebalanceCount: 2n ** 53n } },
    /"rebalanceCount" out of range/,
  ),
]) {
  test(`portfolioObservationsFromEIP712 rejects ${label}`, t => {
    t.throws(
      () =>
        portfolioObservationsFromEIP712(data as PortfolioObservationsEIP712),
      {
        message,
      },
    );
  });
}
