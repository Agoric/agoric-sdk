import {
  AaveV3Arbitrum,
  AaveV3ArbitrumSepolia,
  AaveV3Avalanche,
  AaveV3BNB,
  AaveV3Ethereum,
  AaveV3Fuji,
  AaveV3Optimism,
  AaveV3OptimismSepolia,
  AaveV3Polygon,
  AaveV3Sepolia,
} from '@bgd-labs/aave-address-book';

/**
 * @typedef {`0x${string}`} OxAddress
 * @typedef {Record<string, OxAddress>} EvmAddressesMap
 * @typedef {{ mainnet: EvmAddressesMap, testnet: EvmAddressesMap }} AddressesMap
 */

const aaveAddresses = {
  mainnet: {
    Ethereum: {
      PoolAddressesProvider: AaveV3Ethereum.POOL_ADDRESSES_PROVIDER,
      Pool: AaveV3Ethereum.POOL,
      AaveOracle: AaveV3Ethereum.ORACLE,
    },
    Avalanche: {
      PoolAddressesProvider: AaveV3Avalanche.POOL_ADDRESSES_PROVIDER,
      Pool: AaveV3Avalanche.POOL,
      AaveOracle: AaveV3Avalanche.ORACLE,
    },
    Arbitrum: {
      PoolAddressesProvider: AaveV3Arbitrum.POOL_ADDRESSES_PROVIDER,
      Pool: AaveV3Arbitrum.POOL,
      AaveOracle: AaveV3Arbitrum.ORACLE,
    },
    Optimism: {
      PoolAddressesProvider: AaveV3Optimism.POOL_ADDRESSES_PROVIDER,
      Pool: AaveV3Optimism.POOL,
      AaveOracle: AaveV3Optimism.ORACLE,
    },
    Polygon: {
      PoolAddressesProvider: AaveV3Polygon.AAVE_PROTOCOL_DATA_PROVIDER,
      Pool: AaveV3Polygon.POOL,
      AaveOracle: AaveV3Polygon.ORACLE,
    },
    Fantom: {
      // TODO: does Fantom has AAVE?
      PoolAddressesProvider: '0x',
      Pool: '0x',
      AaveOracle: '0x',
    },
    BNB: {
      PoolAddressesProvider: AaveV3BNB.POOL_ADDRESSES_PROVIDER,
      Pool: AaveV3BNB.POOL,
      AaveOracle: AaveV3BNB.ORACLE,
    },
  },
  testnet: {
    Ethereum: {
      PoolAddressesProvider: AaveV3Sepolia.POOL_ADDRESSES_PROVIDER,
      Pool: AaveV3Sepolia.POOL,
      AaveOracle: AaveV3Sepolia.ORACLE,
    },
    Avalanche: {
      PoolAddressesProvider: AaveV3Fuji.POOL_ADDRESSES_PROVIDER,
      Pool: AaveV3Fuji.POOL,
      AaveOracle: AaveV3Fuji.ORACLE,
    },
    Arbitrum: {
      PoolAddressesProvider: AaveV3ArbitrumSepolia.POOL_ADDRESSES_PROVIDER,
      Pool: AaveV3ArbitrumSepolia.POOL,
      AaveOracle: AaveV3ArbitrumSepolia.ORACLE,
    },
    Optimism: {
      PoolAddressesProvider: AaveV3OptimismSepolia.POOL_ADDRESSES_PROVIDER,
      Pool: AaveV3OptimismSepolia.POOL,
      AaveOracle: AaveV3OptimismSepolia.ORACLE,
    },
    Polygon: {
      // TODO: find polygon testnet addresses for testing aave with polygon
      PoolAddressesProvider: '0x',
      Pool: '0x',
      AaveOracle: '0x',
    },
    Fantom: {
      // TODO: does Fantom has AAVE?
      PoolAddressesProvider: '0x',
      Pool: '0x',
      AaveOracle: '0x',
    },
    BNB: {
      // TODO: find Binance testnet addresses for testing aave with BNB
      PoolAddressesProvider: '0x',
      Pool: '0x',
      AaveOracle: '0x',
    },
  },
};

/** @type {AddressesMap} */
const usdcAddresses = {
  mainnet: {
    Ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    Avalanche: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    Arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    Optimism: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    Polygon: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    Fantom: '0x',
    BNB: '0x',
  },
  testnet: {
    Ethereum: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia
    Avalanche: '0x5425890298aed601595a70AB815c96711a31Bc65', // Fuji
    Arbitrum: '0x2f3A40A3db8a7e3D09B0adfEfbCe4f6F81927557', // Arbitrum Sepolia
    Optimism: '0x4200000000000000000000000000000000000042', // OP Sepolia
    Polygon: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // Amoy
    Fantom: '0x',
    BNB: '0x',
  },
};

// TODO: deploy the factory in mainnet/testnet and fill these addresses
/** @type {AddressesMap} */
const factoryAddresses = {
  mainnet: {
    Ethereum: '0x',
    Avalanche: '0x',
    Arbitrum: '0x',
    Optimism: '0x',
    Polygon: '0x',
    Fantom: '0x',
    BNB: '0x',
  },
  testnet: {
    Ethereum: '0x',
    Avalanche: '0x',
    Arbitrum: '0x',
    Optimism: '0x',
    Polygon: '0x',
    Fantom: '0x',
    BNB: '0x',
  },
};

/**
 * @typedef {`${string}:${string}`} CaipId
 * @typedef {{[key: string]: CaipId}} CaipIdMap
 * @typedef {{ mainnet: CaipIdMap, testnet: CaipIdMap }} CaipIds
 */

/**
 * TODO:
 * - Add USDC addresses for Fantom and BNB (mainnet and testnet)
 * - Find a way to pass testnet and mainnet config seperately
 */

/**
 * Mainnet configuration with real contract addresses
 * @type import('@aglocal/portfolio-contract/src/type-guards').MainnetEVMContractAddresses
 */
export const mainnetContracts = {
  Ethereum: {
    aavePool: aaveAddresses.mainnet.Ethereum.Pool,
    compound: '0x', // TODO
    factory: factoryAddresses.mainnet.Ethereum,
    usdc: usdcAddresses.mainnet.Ethereum,
  },
  Avalanche: {
    aavePool: aaveAddresses.mainnet.Avalanche.Pool,
    compound: '0x', // TODO
    factory: factoryAddresses.mainnet.Avalanche,
    usdc: usdcAddresses.mainnet.Avalanche,
  },
  optimism: {
    aavePool: aaveAddresses.mainnet.Optimism.Pool,
    compound: '0x', // TODO
    factory: factoryAddresses.mainnet.Optimism,
    usdc: usdcAddresses.mainnet.Optimism,
  },
  arbitrum: {
    aavePool: aaveAddresses.mainnet.Arbitrum.Pool,
    compound: '0x', // TODO
    factory: factoryAddresses.mainnet.Arbitrum,
    usdc: usdcAddresses.mainnet.Arbitrum,
  },
  Polygon: {
    aavePool: aaveAddresses.mainnet.Polygon.Pool,
    compound: '0x', // TODO
    factory: factoryAddresses.mainnet.Polygon,
    usdc: usdcAddresses.mainnet.Polygon,
  },
  Fantom: {
    // TODO: aave and compound?
    aavePool: '0x',
    compound: '0x',
    factory: factoryAddresses.mainnet.Fantom,
    usdc: usdcAddresses.mainnet.Fantom,
  },
  binance: {
    aavePool: aaveAddresses.mainnet.BNB.Pool,
    compound: '0x', // TODO
    factory: factoryAddresses.mainnet.BNB,
    usdc: usdcAddresses.mainnet.BNB,
  },
};
harden(mainnetContracts);

/**
 * Testnet configuration with testnet contract addresses
 * @type import('@aglocal/portfolio-contract/src/type-guards').TestnetEVMContractAddresses
 */
export const testnetContracts = {
  'ethereum-sepolia': {
    aavePool: aaveAddresses.testnet.Ethereum.Pool,
    compound: '0x', // TODO
    factory: factoryAddresses.testnet.Ethereum,
    usdc: usdcAddresses.testnet.Ethereum,
  },
  Avalanche: {
    aavePool: aaveAddresses.testnet.Avalanche.Pool,
    compound: '0x', // TODO
    factory: factoryAddresses.testnet.Avalanche,
    usdc: usdcAddresses.testnet.Avalanche,
  },
  'optimism-sepolia': {
    aavePool: aaveAddresses.testnet.Optimism.Pool,
    compound: '0x', // TODO
    factory: factoryAddresses.testnet.Optimism,
    usdc: usdcAddresses.testnet.Optimism,
  },
  'arbitrum-sepolia': {
    aavePool: aaveAddresses.testnet.Arbitrum.Pool,
    compound: '0x', // TODO
    factory: factoryAddresses.testnet.Arbitrum,
    usdc: usdcAddresses.testnet.Arbitrum,
  },
  'polygon-sepolia': {
    // TODO: AAVE and Compound on polygon testnet?
    aavePool: '0x',
    compound: '0x',
    factory: factoryAddresses.testnet.Polygon,
    usdc: usdcAddresses.testnet.Polygon,
  },
  Fantom: {
    // TODO: aave and compound?
    aavePool: '0x',
    compound: '0x',
    factory: factoryAddresses.testnet.Fantom,
    usdc: usdcAddresses.testnet.Fantom,
  },
  binance: {
    // TODO: AAVE on BNB testnet?
    aavePool: '0x',
    compound: '0x',
    factory: factoryAddresses.testnet.BNB,
    usdc: usdcAddresses.testnet.BNB,
  },
};
harden(testnetContracts);

/**
 * Localchain configuration with mock addresses for testing
 * @type import('@aglocal/portfolio-contract/src/type-guards').EVMContractAddresses
 */
export const localchainContracts = {
  Ethereum: {
    aavePool: '0x1111111111111111111111111111111111111111',
    compound: '0x2222222222222222222222222222222222222222',
    factory: '0x3333333333333333333333333333333333333333',
    usdc: '0x4444444444444444444444444444444444444444',
  },
  'ethereum-sepolia': {
    aavePool: '0x1111111111111111111111111111111111111111',
    compound: '0x2222222222222222222222222222222222222222',
    factory: '0x3333333333333333333333333333333333333333',
    usdc: '0x4444444444444444444444444444444444444444',
  },
  Avalanche: {
    aavePool: '0x1111111111111111111111111111111111111111',
    compound: '0x2222222222222222222222222222222222222222',
    factory: '0x3333333333333333333333333333333333333333',
    usdc: '0x4444444444444444444444444444444444444444',
  },
  optimism: {
    aavePool: '0x1111111111111111111111111111111111111111',
    compound: '0x2222222222222222222222222222222222222222',
    factory: '0x3333333333333333333333333333333333333333',
    usdc: '0x4444444444444444444444444444444444444444',
  },
  'optimism-sepolia': {
    aavePool: '0x1111111111111111111111111111111111111111',
    compound: '0x2222222222222222222222222222222222222222',
    factory: '0x3333333333333333333333333333333333333333',
    usdc: '0x4444444444444444444444444444444444444444',
  },
  arbitrum: {
    aavePool: '0x1111111111111111111111111111111111111111',
    compound: '0x2222222222222222222222222222222222222222',
    factory: '0x3333333333333333333333333333333333333333',
    usdc: '0x4444444444444444444444444444444444444444',
  },
  'arbitrum-sepolia': {
    aavePool: '0x1111111111111111111111111111111111111111',
    compound: '0x2222222222222222222222222222222222222222',
    factory: '0x3333333333333333333333333333333333333333',
    usdc: '0x4444444444444444444444444444444444444444',
  },
  Polygon: {
    aavePool: '0x1111111111111111111111111111111111111111',
    compound: '0x2222222222222222222222222222222222222222',
    factory: '0x3333333333333333333333333333333333333333',
    usdc: '0x4444444444444444444444444444444444444444',
  },
  'polygon-sepolia': {
    aavePool: '0x1111111111111111111111111111111111111111',
    compound: '0x2222222222222222222222222222222222222222',
    factory: '0x3333333333333333333333333333333333333333',
    usdc: '0x4444444444444444444444444444444444444444',
  },
  Fantom: {
    aavePool: '0x1111111111111111111111111111111111111111',
    compound: '0x2222222222222222222222222222222222222222',
    factory: '0x3333333333333333333333333333333333333333',
    usdc: '0x4444444444444444444444444444444444444444',
  },
  binance: {
    aavePool: '0x1111111111111111111111111111111111111111',
    compound: '0x2222222222222222222222222222222222222222',
    factory: '0x3333333333333333333333333333333333333333',
    usdc: '0x4444444444444444444444444444444444444444',
  },
};
harden(localchainContracts);

/**
 * Get the appropriate axelarChainsMap based on environment
 * @param {string} environment - The environment ('mainnet', 'devnet', 'localchain')
 * @returns {import('@aglocal/portfolio-contract/src/type-guards').EVMContractAddresses} The configuration for the specified environment
 */
export const getContractAddresses = environment => {
  switch (environment) {
    case 'mainnet':
      return mainnetContracts;
    case 'devnet':
      return testnetContracts;
    case 'local':
      return localchainContracts;
    default:
      throw new Error(
        `Unknown environment: ${environment}. Must be 'mainnet', 'devnet', or 'local'`,
      );
  }
};
harden(getContractAddresses);
