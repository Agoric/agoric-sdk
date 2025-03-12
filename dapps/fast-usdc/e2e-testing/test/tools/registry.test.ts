import anyTest from '@endo/ses-ava/prepare-endo.js';
import type { TestFn } from 'ava';
import { commonSetup } from '../support.js';

const test = anyTest as TestFn<Record<string, never>>;

test('assets can be retrieved from config', async t => {
  const { useChain } = await commonSetup(t);

  t.like(useChain('osmosis').chainInfo.nativeAssetList.assets, [
    {
      base: 'uosmo',
    },
    {
      base: 'uion',
    },
  ]);

  t.like(useChain('cosmoshub').chainInfo.nativeAssetList.assets, [
    {
      base: 'uatom',
    },
  ]);
});

test('staking info can be retrieved from config', async t => {
  const { useChain } = await commonSetup(t);

  t.like(useChain('osmosis').chain.staking, {
    staking_tokens: [{ denom: 'uosmo' }],
    lock_duration: { time: '1209600s' },
  });

  t.like(useChain('cosmoshub').chain.staking, {
    staking_tokens: [{ denom: 'uatom' }],
    lock_duration: { time: '1209600s' },
  });
});
