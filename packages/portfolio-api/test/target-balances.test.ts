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
