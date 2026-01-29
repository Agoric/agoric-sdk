import test from 'ava';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import cctpChainInfo from '@agoric/orchestration/src/cctp-chain-info.js';

/**
 * @import {Macro} from 'ava';
 */

// List of chains to test to ensure an IBC connection exists from noble to them
// XXX: Some missing connections.
const fastUsdcDestinationChains = /** @type {const} */ ([
  { name: 'archway', mapOfZones: true, chainRegistry: 'not-preferred' },
  'beezee',
  { name: 'carbon', mapOfZones: true, chainRegistry: false },
  { name: 'celestia', mapOfZones: false, chainRegistry: false },
  'coreum',
  'cosmoshub',
  'crescent',
  'doravota',
  'dydx',
  'dymension',
  { name: 'empowerchain', mapOfZones: false, chainRegistry: false },
  'evmos',
  'haqq',
  'injective',
  'juno',
  'kava',
  'kujira',
  'lava',
  'migaloo',
  'neutron',
  { name: 'nibiru', mapOfZones: false, chainRegistry: false },
  { name: 'nolus', mapOfZones: true, chainRegistry: false },
  'omniflixhub',
  'osmosis',
  'persistence',
  'planq',
  'provenance',
  'pryzm',
  { name: 'quicksilver', mapOfZones: false, chainRegistry: false },
  'secretnetwork',
  'sei',
  'shido',
  { name: 'sifchain', mapOfZones: true, chainRegistry: false },
  'stargaze',
  { name: 'stride', mapOfZones: false, chainRegistry: false },
  'terra2',
  { name: 'titan', mapOfZones: false, chainRegistry: false },
  'umee',
]);

/** @type {Macro<[string | { name: string, mapOfZones: boolean, chainRegistry: boolean | 'not-preferred' }]>} */
const testNobleConnection = test.macro({
  exec(t, input) {
    const name = typeof input === 'string' ? input : input.name;
    const info = fetchedChainInfo[name];
    const { chainId } = info;
    const connection = fetchedChainInfo.noble.connections[chainId];

    const { chainRegistry, mapOfZones } =
      typeof input === 'string'
        ? { chainRegistry: true, mapOfZones: true }
        : input;

    if (!chainRegistry || chainRegistry === 'not-preferred') {
      t.falsy(connection, `expected ${name} not preferred in chain registry`);
    } else if (!mapOfZones) {
      t.truthy(
        connection,
        `expected ${name} connection to exist, though not in mapOfZones`,
      );
    } else {
      t.truthy(connection, `expected ${name} connection to exist`);
    }
  },
  title(_, input) {
    const name = typeof input === 'string' ? input : input.name;
    if (typeof input === 'string' || input.chainRegistry === true) {
      return `Connection in chain registry from noble to ${name}`;
    }
    return `No preferred connection in chain registry from noble to ${name}`;
  },
});

for (const chain of fastUsdcDestinationChains) {
  test(testNobleConnection, chain);
}

/**
 * List of chains reachable over CCTP through Noble
 */
const cctpDestinationChains = [
  'ethereum',
  'avalanche',
  'optimism',
  'arbitrum',
  'solana',
  'base',
  'polygon',
];

const testCctpDesintation = test.macro({
  exec(t, input) {
    const info = cctpChainInfo[/** @type {string} */ (input)];
    t.true('cctpDestinationDomain' in info);
    t.true(info.cctpDestinationDomain >= 0);
  },
  title(_, input) {
    return `Connection from noble to ${input}`;
  },
});

for (const chain of cctpDestinationChains) {
  test(testCctpDesintation, chain);
}
