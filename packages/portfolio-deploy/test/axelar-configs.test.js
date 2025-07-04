import test from 'ava';
import {
  getContractAddresses,
  localchainContracts,
  mainnetContracts,
  testnetContracts,
} from '../src/axelar-configs.js';

test('getAxelarChainsMap returns correct configuration', t => {
  const mainnet = getContractAddresses('mainnet');
  const testnet = getContractAddresses('devnet');
  const localchain = getContractAddresses('local');

  t.is(mainnet, mainnetContracts);
  t.is(testnet, testnetContracts);
  t.is(localchain, localchainContracts);
});

test('getAxelarChainsMap throws error for invalid environment', t => {
  t.throws(() => getContractAddresses('invalid'), {
    message: /Unknown environment: invalid/,
  });
});

test.skip('all configurations have consistent contract address structure', t => {
  const environments = [
    mainnetContracts,
    testnetContracts,
    localchainContracts,
  ];

  for (const config of environments) {
    for (const chain of Object.values(config)) {
      t.truthy(chain.aavePool);
      t.truthy(chain.compound);
      t.truthy(chain.factory);
      t.truthy(chain.usdc);

      // All addresses should be valid hex strings
      t.regex(chain.aavePool, /^0x[a-fA-F0-9]{40}$/);
      t.regex(chain.compound, /^0x[a-fA-F0-9]{40}$/);
      t.regex(chain.factory, /^0x[a-fA-F0-9]{40}$/);
      t.regex(chain.usdc, /^0x[a-fA-F0-9]{40}$/);
    }
  }
});
