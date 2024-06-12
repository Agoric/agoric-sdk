import test from 'ava';

import { makeNameHubKit } from '@agoric/vats';
import { registerChainNamespace } from '../src/chain-info.js';

test('chain-info', async t => {
  const { nameHub: agoricNames, nameAdmin: agoricNamesAdmin } =
    makeNameHubKit();

  await registerChainNamespace(agoricNamesAdmin, t.log);
  const chainNames = await agoricNames.lookup('chain');
  t.like(await chainNames.lookup('cosmoshub'), {
    chainId: 'cosmoshub-4',
    stakingTokens: [{ denom: 'uatom' }],
  });
  t.deepEqual(chainNames.keys(), [
    'agoric',
    'agoriclocal',
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
  ]);
  t.snapshot(chainNames.entries());
});
