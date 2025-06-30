/**
 * Axelar chain configurations for different environments
 *
 * @import { AxelarChainsMap } from '@aglocal/portfolio-contract/src/type-guards.js';
 */

/**
 * Mainnet configuration with real contract addresses
 * @type {AxelarChainsMap}
 */
export const mainnetAxelarChainsMap = {
  Ethereum: {
    caip: 'eip155:1',
    axelarId: 'Ethereum',
    contractAddresses: {
      aavePool: '0x',
      compound: '0x',
      factory: '0x',
      usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    },
  },
  Avalanche: {
    caip: 'eip155:43114',
    axelarId: 'Avalanche',
    contractAddresses: {
      aavePool: '0x',
      compound: '0x',
      factory: '0x',
      usdc: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    },
  },
  Base: {
    caip: 'eip155:8453',
    axelarId: 'base',
    contractAddresses: {
      aavePool: '0x',
      compound: '0x',
      factory: '0x',
      usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    },
  },
};
harden(mainnetAxelarChainsMap);

/**
 * Testnet configuration with testnet contract addresses
 * @type {AxelarChainsMap}
 */
export const testnetAxelarChainsMap = {
  Ethereum: {
    caip: 'eip155:11155111',
    axelarId: 'ethereum-sepolia',
    contractAddresses: {
      // XXX: ⚠️ No testing has been performed on the Ethereum testnet.
      // These addresses are placeholders and need to be updated accordingly.
      aavePool: '0x',
      compound: '0x',
      factory: '0x',
      usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    },
  },
  Avalanche: {
    caip: 'eip155:43113',
    axelarId: 'Avalanche',
    contractAddresses: {
      aavePool: '0xccEa5C65f6d4F465B71501418b88FBe4e7071283',
      // Compound is not deployed on the Avalanche testnet, so we use a placeholder address
      compound: '0x',
      // XXX: How can we update this address each time a new Factory version is deployed?
      // Is there an automated approach?
      factory: '0xc342E491A3afdd44aEa0b07C5F2BEA9334b330Bd',
      // This is not Circle's native USDC. It's a variant deployed on Aave within the Avalanche ecosystem.
      // As a result, it cannot be used to test CCTP transfers, which specifically require
      // Circle-issued USDC with the address: 0x5425890298aed601595a70AB815c96711a31Bc65
      usdc: '0xCaC7Ffa82c0f43EBB0FC11FCd32123EcA46626cf',
    },
  },
  Base: {
    caip: 'eip155:84532',
    axelarId: 'base-sepolia',
    contractAddresses: {
      // Aave is available on the Base testnet, but we haven’t tested there yet.
      // Our testing has primarily been done on the Avalanche network.
      aavePool: '0x',
      compound: '0x571621Ce60Cebb0c1D442B5afb38B1663C6Bf017',
      factory: '0xDBe05a67EcE4380f3B7A728A6dEB848884Bb9e8a',
      usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    },
  },
};
harden(testnetAxelarChainsMap);

/**
 * Localchain configuration with mock addresses for testing
 * @type {AxelarChainsMap}
 */
export const localchainAxelarChainsMap = {
  Ethereum: {
    caip: 'eip155:1337',
    axelarId: 'ethereum',
    contractAddresses: {
      aavePool: '0x1111111111111111111111111111111111111111',
      compound: '0x2222222222222222222222222222222222222222',
      factory: '0x3333333333333333333333333333333333333333',
      usdc: '0x4444444444444444444444444444444444444444',
    },
  },
  Avalanche: {
    caip: 'eip155:43114',
    axelarId: 'avalanche',
    contractAddresses: {
      aavePool: '0x1111111111111111111111111111111111111111',
      compound: '0x2222222222222222222222222222222222222222',
      factory: '0x3333333333333333333333333333333333333333',
      usdc: '0x4444444444444444444444444444444444444444',
    },
  },
  Base: {
    caip: 'eip155:8453',
    axelarId: 'base',
    contractAddresses: {
      aavePool: '0x1111111111111111111111111111111111111111',
      compound: '0x2222222222222222222222222222222222222222',
      factory: '0x3333333333333333333333333333333333333333',
      usdc: '0x4444444444444444444444444444444444444444',
    },
  },
};
harden(localchainAxelarChainsMap);

/**
 * Get the appropriate axelarChainsMap based on environment
 * @param {string} environment - The environment ('mainnet', 'devnet', 'localchain')
 * @returns {AxelarChainsMap} The configuration for the specified environment
 */
export const getAxelarChainsMap = environment => {
  switch (environment) {
    case 'mainnet':
      return mainnetAxelarChainsMap;
    case 'devnet':
      return testnetAxelarChainsMap;
    case 'local':
      return localchainAxelarChainsMap;
    default:
      throw new Error(
        `Unknown environment: ${environment}. Must be 'mainnet', 'devnet', or 'local'`,
      );
  }
};
harden(getAxelarChainsMap);
