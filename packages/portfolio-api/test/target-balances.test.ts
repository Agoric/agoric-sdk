import '@endo/init/debug.js';

import test from 'ava';

import { Far } from '@endo/far';

import type { Brand } from '@agoric/ertp/src/types.js';

import { computeTargetBalances } from '../src/target-balances.js';
import type { NetworkSpec } from '../src/network/network-spec.js';

const brand = Far('mock brand') as Brand<'nat'>;
const makeAmount = (value: bigint) => harden({ brand, value });
const scale6 = (x: number) => BigInt(Math.round(x * 1e6));

const tinyNetwork: NetworkSpec = harden({
  localPlaces: [],
  chains: [{ name: 'Ethereum', control: 'axelar' }],
  pools: [
    { pool: 'Aave_Ethereum', chain: 'Ethereum', protocol: 'Aave' },
    { pool: 'Compound_Ethereum', chain: 'Ethereum', protocol: 'Compound' },
  ],
  links: [],
});
const amount = makeAmount(scale6(100));
const half = makeAmount(scale6(50));

test('computeTargetBalances honors dynamic no-deposit instruments', t => {
  const target = computeTargetBalances({
    brand,
    currentBalances: {},
    balanceDelta: amount.value,
    targetAllocation: { Aave_Ethereum: 50n, Compound_Ethereum: 50n },
    depositFromChain: 'Ethereum',
    network: tinyNetwork,
    instrumentBlocks: {
      noDepositInstruments: new Set(['Aave_Ethereum']),
      noWithdrawInstruments: new Set(),
    },
  });
  t.deepEqual(target, { '@Ethereum': half, Compound_Ethereum: half });
});

test('computeTargetBalances honors dynamic no-withdraw instruments', t => {
  const target = computeTargetBalances({
    brand,
    currentBalances: { Aave_Ethereum: amount, Compound_Ethereum: amount },
    balanceDelta: -half.value,
    targetAllocation: { Aave_Ethereum: 50n, Compound_Ethereum: 50n },
    network: tinyNetwork,
    instrumentBlocks: {
      noDepositInstruments: new Set(),
      noWithdrawInstruments: new Set(['Aave_Ethereum']),
    },
  });
  t.deepEqual(target, { Compound_Ethereum: half });
});

test('computeTargetBalances network can statically unblock instruments', t => {
  const network = {
    ...tinyNetwork,
    pools: tinyNetwork.pools.map(poolSpec => {
      const blockDepositReason =
        poolSpec.pool === 'Compound_Ethereum' ? null : undefined;
      const blockWithdrawReason =
        poolSpec.pool === 'Aave_Ethereum' ? null : undefined;
      return { ...poolSpec, blockDepositReason, blockWithdrawReason };
    }),
  };
  const target = computeTargetBalances({
    brand,
    currentBalances: { Aave_Ethereum: amount },
    balanceDelta: 0n,
    targetAllocation: { Aave_Ethereum: 50n, Compound_Ethereum: 50n },
    network,
    instrumentBlocks: {
      noDepositInstruments: new Set(['Aave_Ethereum', 'Compound_Ethereum']),
      noWithdrawInstruments: new Set(['Aave_Ethereum', 'Compound_Ethereum']),
    },
  });
  t.deepEqual(target, { Aave_Ethereum: half, Compound_Ethereum: half });
});

for (const balanceDelta of [0n, scale6(20), -scale6(50)]) {
  test(`liquidity caps redistribute targets for balanceDelta ${balanceDelta}`, t => {
    const amt = makeAmount(scale6(100));
    const targets = computeTargetBalances({
      brand,
      currentBalances: { Aave_Ethereum: amt, Compound_Ethereum: amt },
      targetAllocation: { Aave_Ethereum: 0n, Compound_Ethereum: 1n },
      balanceDelta,
      network: tinyNetwork,
      instrumentLiquidity: { Aave_Ethereum: scale6(10) },
      withdrawalLiquidityLimitBps: 9_000n, // 90%
    });
    t.deepEqual(targets, {
      Aave_Ethereum: makeAmount(scale6(91)),
      Compound_Ethereum: makeAmount(scale6(109) + balanceDelta),
    });
  });
}

test('liquidity caps cascade to other sources and round withdrawals down', t => {
  const amt = makeAmount(scale6(100));
  const targets = computeTargetBalances({
    brand,
    currentBalances: { Aave_Ethereum: amt, Compound_Ethereum: amt },
    balanceDelta: -scale6(50),
    network: tinyNetwork,
    instrumentLiquidity: { Aave_Ethereum: scale6(10) + 1n },
    withdrawalLiquidityLimitBps: 9_000n, // 90%
  });
  t.deepEqual(targets, {
    Aave_Ethereum: makeAmount(scale6(91)),
    Compound_Ethereum: makeAmount(scale6(59)),
  });
});

test('withdrawal fallback respects liquidity caps below the soft minimum', t => {
  const targets = computeTargetBalances({
    brand,
    currentBalances: {
      Aave_Ethereum: makeAmount(scale6(0.8)),
      Compound_Ethereum: makeAmount(scale6(0.7)),
    },
    balanceDelta: -scale6(0.6),
    network: tinyNetwork,
    instrumentLiquidity: { Aave_Ethereum: scale6(0.2) },
    withdrawalLiquidityLimitBps: 5_000n, // 50%
  });
  t.deepEqual(targets, {
    Aave_Ethereum: makeAmount(scale6(0.7)),
    Compound_Ethereum: makeAmount(scale6(0.2)),
  });
});

test('insufficient liquidity produces a partial withdrawal within the limit', t => {
  const targets = computeTargetBalances({
    brand,
    currentBalances: { Aave_Ethereum: amount, Compound_Ethereum: amount },
    balanceDelta: -half.value,
    network: tinyNetwork,
    instrumentLiquidity: { Aave_Ethereum: 0n, Compound_Ethereum: scale6(10) },
    withdrawalLiquidityLimitBps: 9_000n, // 90%
  });
  t.deepEqual(targets, { Compound_Ethereum: makeAmount(scale6(91)) });
});

test('partial withdrawal combines hub funds and liquidity below the soft minimum', t => {
  const targets = computeTargetBalances({
    brand,
    currentBalances: {
      '@Ethereum': makeAmount(scale6(2)),
      Aave_Ethereum: amount,
      Compound_Ethereum: amount,
    },
    balanceDelta: -half.value,
    network: tinyNetwork,
    instrumentLiquidity: {
      Aave_Ethereum: scale6(0.5),
      Compound_Ethereum: scale6(10),
    },
    withdrawalLiquidityLimitBps: 9_000n,
  });
  t.deepEqual(targets, {
    '@Ethereum': makeAmount(0n),
    Aave_Ethereum: makeAmount(scale6(99.55)),
    Compound_Ethereum: makeAmount(scale6(91)),
  });
});

for (const blocked of [false, true]) {
  test(`withdrawal with no available funds returns no changes, blocked=${blocked}`, t => {
    const targets = computeTargetBalances({
      brand,
      currentBalances: { Aave_Ethereum: amount, Compound_Ethereum: amount },
      balanceDelta: -half.value,
      network: tinyNetwork,
      instrumentLiquidity: blocked
        ? undefined
        : { Aave_Ethereum: 0n, Compound_Ethereum: 0n },
      instrumentBlocks: {
        noDepositInstruments: new Set(),
        noWithdrawInstruments: new Set(
          blocked ? ['Aave_Ethereum', 'Compound_Ethereum'] : [],
        ),
      },
    });
    t.deepEqual(targets, {});
  });
}

test('liquidity limits do not cap hub withdrawals or instruments without data', t => {
  const targets = computeTargetBalances({
    brand,
    currentBalances: { '@Ethereum': amount, Aave_Ethereum: amount },
    targetAllocation: { Compound_Ethereum: 1n },
    network: tinyNetwork,
    instrumentLiquidity: { '@Ethereum': 0n },
    withdrawalLiquidityLimitBps: 9_000n,
  });
  t.deepEqual(targets, {
    '@Ethereum': makeAmount(0n),
    Aave_Ethereum: makeAmount(0n),
    Compound_Ethereum: makeAmount(amount.value + amount.value),
  });
});

test('liquidity-limited sources leave blocked deposits at their source hub', t => {
  const targets = computeTargetBalances({
    brand,
    currentBalances: { Aave_Ethereum: makeAmount(scale6(100)) },
    targetAllocation: { Compound_Ethereum: 1n },
    network: tinyNetwork,
    instrumentLiquidity: { Aave_Ethereum: scale6(10) },
    withdrawalLiquidityLimitBps: 9_000n,
    instrumentBlocks: {
      noDepositInstruments: new Set(['Compound_Ethereum']),
      noWithdrawInstruments: new Set(),
    },
  });
  t.deepEqual(targets, {
    Aave_Ethereum: makeAmount(scale6(91)),
    '@Ethereum': makeAmount(scale6(9)),
  });
});

test('liquidity-capped movements still respect the chain soft minimum', t => {
  const targets = computeTargetBalances({
    brand,
    currentBalances: { Aave_Ethereum: makeAmount(scale6(100)) },
    targetAllocation: { Compound_Ethereum: 1n },
    network: tinyNetwork,
    instrumentLiquidity: { Aave_Ethereum: scale6(0.5) },
    withdrawalLiquidityLimitBps: 9_000n,
  });
  t.deepEqual(targets, {});
});
