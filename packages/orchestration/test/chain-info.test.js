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
  t.deepEqual(chainNames.keys(), [
    'agoric',
    'celestia',
    'cosmoshub',
    'dydx',
    'juno',
    'neutron',
    'noble',
    'omniflixhub',
    'osmosis',
    'secretnetwork',
    'stargaze',
    'stride',
    'umee',
  ]);
  t.snapshot(chainNames.entries());
});
