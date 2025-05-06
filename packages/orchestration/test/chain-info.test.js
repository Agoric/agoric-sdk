import test from 'ava';

import { makeNameHubKit } from '@agoric/vats';
import { registerKnownChains } from '../src/chain-info.js';

test('chain-info', async t => {
  const { nameHub: agoricNames, nameAdmin: agoricNamesAdmin } =
    makeNameHubKit();

  await registerKnownChains(agoricNamesAdmin);
  const chainNames = await agoricNames.lookup('chain');
  t.like(await chainNames.lookup('cosmoshub'), {
    chainId: 'cosmoshub-4',
    stakingTokens: [{ denom: 'uatom' }],
  });
  t.deepEqual([...chainNames.keys()].sort(), [
    'agoric',
    'archway',
    'beezee',
    'carbon',
    'celestia',
    'coreum',
    'cosmoshub',
    'crescent',
    'doravota',
    'dydx',
    'dymension',
    'elys',
    'empowerchain',
    'evmos',
    'haqq',
    'injective',
    'juno',
    'kava',
    'kujira',
    'lava',
    'migaloo',
    'neutron',
    'nibiru',
    'noble',
    'nolus',
    'omniflixhub',
    'osmosis',
    'persistence',
    'planq',
    'provenance',
    'pryzm',
    'quicksilver',
    'secretnetwork',
    'sei',
    'shido',
    'sifchain',
    'stargaze',
    'stride',
    'terra2',
    'titan',
    'umee',
  ]);
  t.snapshot(chainNames.entries());
});
