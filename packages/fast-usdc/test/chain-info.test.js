import test from 'ava';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';

// List of chains to test to ensure an IBC connection exists from noble to them
// XXX: Some missing connections.
const fastUsdcDestinationChains = [
  // 'archway', // Connection in chain registry but not tagged as 'preferred'
  'beezee',
  // 'carbon', // Connection in mapofzones but not chain registry
  // 'celestia', // No connection in mapofzones or chain registry
  'coreum',
  'cosmoshub',
  'crescent',
  'doravota',
  'dydx',
  'dymension',
  // 'empowerchain', // No connection in mapofzones or chain registry
  'evmos',
  'haqq',
  'injective',
  'juno',
  'kava',
  'kujira',
  'lava',
  'migaloo',
  'neutron',
  // 'nibiru', // Connection in chain registry but not tagged as 'preferred'
  // 'nolus', // Connection in mapofzones but not chain registry
  'omniflixhub',
  'osmosis',
  'persistence',
  'planq',
  'provenance',
  'pryzm',
  // 'quicksilver', // No connection in mapofzones or chain registry
  'secretnetwork',
  'sei',
  'shido',
  // 'sifchain', // Connection in mapofzones but not chain registry
  'stargaze',
  // 'stride', // No connection in mapofzones or chain registry
  'terra2',
  'titan',
  'umee',
];

const testNobleConnection = test.macro({
  exec(t, input) {
    const info = fetchedChainInfo[input];
    const { chainId } = info;
    const connection = fetchedChainInfo.noble.connections[chainId];
    t.truthy(connection);
  },
  title(_, input) {
    return `Connection from noble to ${input}`;
  },
});

for (const chain of fastUsdcDestinationChains) {
  test(testNobleConnection, chain);
}
