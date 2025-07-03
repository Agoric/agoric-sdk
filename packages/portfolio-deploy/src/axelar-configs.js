import {
  AaveV3Avalanche,
  AaveV3Base,
  AaveV3BaseSepolia,
  AaveV3Ethereum,
  AaveV3Fuji,
  AaveV3Sepolia,
} from '@bgd-labs/aave-address-book';

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
  // TODO: fill the missing addresses
  Ethereum: {
    caip: 'eip155:1',
    axelarId: 'Ethereum',
    contractAddresses: {
      // https://etherscan.io/address/0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2
      aavePool: AaveV3Ethereum.POOL,
      // TODO: confirm the compound address
      compound: '0x',
      // TODO: deploy Factory in mainnet and then add the address over here
      factory: '0x',
      usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    },
  },
  Avalanche: {
    caip: 'eip155:43114',
    axelarId: 'Avalanche',
    contractAddresses: {
      // https://snowtrace.io/address/0x794a61358D6845594F94dc1DB02A252b5b4814aD
      aavePool: AaveV3Avalanche.POOL,
      // TODO: confirm the compound address
      compound: '0x',
      // TODO: deploy Factory in mainnet and then add the address over here
      factory: '0x',
      usdc: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    },
  },
  Base: {
    caip: 'eip155:8453',
    axelarId: 'base',
    contractAddresses: {
      // https://basescan.org/address/0xA238Dd80C259a72e81d7e4664a9801593F98d1c5
      aavePool: AaveV3Base.POOL,
      // TODO: confirm the compound address
      compound: '0x',
      // TODO: deploy Factory in mainnet and then add the address over here
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
      // https://sepolia.etherscan.io/address/0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951
      aavePool: AaveV3Sepolia.POOL,
      // TODO: confirm/add the missing addresses
      compound: '0x',
      factory: '0x',
      usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    },
  },
  Avalanche: {
    caip: 'eip155:43113',
    axelarId: 'Avalanche',
    contractAddresses: {
      // https://testnet.snowtrace.io/address/0x8B9b2AF4afB389b4a70A474dfD4AdCD4a302bb40
      aavePool: AaveV3Fuji.POOL,
      // Compound is not deployed on the Avalanche testnet, so we use a placeholder address
      compound: '0x',
      // XXX: How can we update this address each time a new Factory version is deployed?
      // Is there an automated approach?
      factory: '0xc342E491A3afdd44aEa0b07C5F2BEA9334b330Bd',
      usdc: '0x5425890298aed601595a70AB815c96711a31Bc65',
    },
  },
  Base: {
    caip: 'eip155:84532',
    axelarId: 'base-sepolia',
    contractAddresses: {
      // https://sepolia.basescan.org/address/0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27
      aavePool: AaveV3BaseSepolia.POOL,
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
