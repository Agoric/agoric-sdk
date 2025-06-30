import test from 'ava';
import {
  getAxelarChainsMap,
  localchainAxelarChainsMap,
  mainnetAxelarChainsMap,
  testnetAxelarChainsMap,
} from '../src/axelar-configs.js';

test('getAxelarChainsMap returns correct configuration', t => {
  const mainnet = getAxelarChainsMap('mainnet');
  const testnet = getAxelarChainsMap('devnet');
  const localchain = getAxelarChainsMap('local');

  t.is(mainnet, mainnetAxelarChainsMap);
  t.is(testnet, testnetAxelarChainsMap);
  t.is(localchain, localchainAxelarChainsMap);
});

test('getAxelarChainsMap throws error for invalid environment', t => {
  t.throws(() => getAxelarChainsMap('invalid'), {
    message: /Unknown environment: invalid/,
  });
});

test.skip('all configurations have consistent contract address structure', t => {
  const environments = [
    mainnetAxelarChainsMap,
    testnetAxelarChainsMap,
    localchainAxelarChainsMap,
  ];

  for (const config of environments) {
    for (const chain of Object.values(config)) {
      t.truthy(chain.contractAddresses.aavePool);
      t.truthy(chain.contractAddresses.compound);
      t.truthy(chain.contractAddresses.factory);
      t.truthy(chain.contractAddresses.usdc);

      // All addresses should be valid hex strings
      t.regex(chain.contractAddresses.aavePool, /^0x[a-fA-F0-9]{40}$/);
      t.regex(chain.contractAddresses.compound, /^0x[a-fA-F0-9]{40}$/);
      t.regex(chain.contractAddresses.factory, /^0x[a-fA-F0-9]{40}$/);
      t.regex(chain.contractAddresses.usdc, /^0x[a-fA-F0-9]{40}$/);
    }
  }
});
