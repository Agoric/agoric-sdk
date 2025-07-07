/**
 * @typedef {`0x${string}`} HexAddress
 * @typedef {Record<string, HexAddress>} EvmAddressesMap
 * @typedef {{ mainnet: EvmAddressesMap, testnet: EvmAddressesMap }} AddressesMap
 * @typedef {import('@agoric/orchestration').BaseChainInfo} BaseChainInfo
 */

/**
 * @typedef {object} AxelarChainConfig
 * @property {BaseChainInfo} chainInfo
 * @property {Record<string, HexAddress>} contracts
 */

/**
 * @typedef {Record<string, AxelarChainConfig>} AxelarChainConfigMap
 */

/** @type {AddressesMap} */
const aaveAddresses = {
  mainnet: {
    Ethereum: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
    Avalanche: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    Arbitrum: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    Optimism: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    Polygon: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    Fantom: '0x', // TODO: does Fantom have AAVE?
    Binance: '0x6807dc923806fE8Fd134338EABCA509979a7e0cB',
  },
  testnet: {
    Ethereum: '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951',
    Avalanche: '0x8B9b2AF4afB389b4a70A474dfD4AdCD4a302bb40',
    Arbitrum: '0xBfC91D59fdAA134A4ED45f7B584cAf96D7792Eff',
    Optimism: '0xb50201558B00496A145fE76f7424749556E326D8',
    Polygon: '0x', // TODO: find polygon testnet addresses for testing aave with polygon
    Fantom: '0x', // TODO: does Fantom have AAVE?
    Binance: '0x', // TODO: find Binance testnet addresses for testing aave with Binance
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
    Binance: '0x',
  },
  testnet: {
    Ethereum: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia
    Avalanche: '0x5425890298aed601595a70AB815c96711a31Bc65', // Fuji
    Arbitrum: '0x2f3A40A3db8a7e3D09B0adfEfbCe4f6F81927557', // Arbitrum Sepolia
    Optimism: '0x4200000000000000000000000000000000000042', // OP Sepolia
    Polygon: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // Amoy
    Fantom: '0x',
    Binance: '0x',
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
    Binance: '0x',
  },
  testnet: {
    Ethereum: '0x',
    Avalanche: '0x',
    Arbitrum: '0x',
    Optimism: '0x',
    Polygon: '0x',
    Fantom: '0x',
    Binance: '0x',
  },
};

/**
 * TODO:
 * - Add USDC addresses for Fantom and Binance (mainnet and testnet)
 * - Find a way to pass testnet and mainnet config seperately
 */

/**
 * Mainnet configuration with real contract addresses
 * @type import('@aglocal/portfolio-contract/src/type-guards').MainnetEVMContractAddresses
 */
const mainnetContracts = {
  Ethereum: {
    aavePool: aaveAddresses.mainnet.Ethereum,
    compound: '0x', // TODO
    factory: factoryAddresses.mainnet.Ethereum,
    usdc: usdcAddresses.mainnet.Ethereum,
  },
  Avalanche: {
    aavePool: aaveAddresses.mainnet.Avalanche,
    compound: '0x', // TODO
    factory: factoryAddresses.mainnet.Avalanche,
    usdc: usdcAddresses.mainnet.Avalanche,
  },
  optimism: {
    aavePool: aaveAddresses.mainnet.Optimism,
    compound: '0x', // TODO
    factory: factoryAddresses.mainnet.Optimism,
    usdc: usdcAddresses.mainnet.Optimism,
  },
  arbitrum: {
    aavePool: aaveAddresses.mainnet.Arbitrum,
    compound: '0x', // TODO
    factory: factoryAddresses.mainnet.Arbitrum,
    usdc: usdcAddresses.mainnet.Arbitrum,
  },
  Polygon: {
    aavePool: aaveAddresses.mainnet.Polygon,
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
    aavePool: aaveAddresses.mainnet.Binance,
    compound: '0x', // TODO
    factory: factoryAddresses.mainnet.Binance,
    usdc: usdcAddresses.mainnet.Binance,
  },
};
harden(mainnetContracts);

/**
 * Testnet configuration with testnet contract addresses
 * @type import('@aglocal/portfolio-contract/src/type-guards').TestnetEVMContractAddresses
 */
const testnetContracts = {
  'ethereum-sepolia': {
    aavePool: aaveAddresses.testnet.Ethereum,
    compound: '0x', // TODO
    factory: factoryAddresses.testnet.Ethereum,
    usdc: usdcAddresses.testnet.Ethereum,
  },
  Avalanche: {
    aavePool: aaveAddresses.testnet.Avalanche,
    compound: '0x', // TODO
    factory: factoryAddresses.testnet.Avalanche,
    usdc: usdcAddresses.testnet.Avalanche,
  },
  'optimism-sepolia': {
    aavePool: aaveAddresses.testnet.Optimism,
    compound: '0x', // TODO
    factory: factoryAddresses.testnet.Optimism,
    usdc: usdcAddresses.testnet.Optimism,
  },
  'arbitrum-sepolia': {
    aavePool: aaveAddresses.testnet.Arbitrum,
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
    // TODO: AAVE on Binance testnet?
    aavePool: '0x',
    compound: '0x',
    factory: factoryAddresses.testnet.Binance,
    usdc: usdcAddresses.testnet.Binance,
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
 * Mainnet chains only.
 *
 * Sourced from:
 *
 * - https://developers.circle.com/stablecoins/supported-domains
 * - https://chainlist.org/
 * - https://docs.simplehash.com/reference/supported-chains-testnets (accessed on
 *   4 July 2025)
 *  @satisfies {AxelarChainConfigMap}
 */
export const axelarConfig = {
  Ethereum: {
    chainInfo: {
      namespace: 'eip155',
      reference: '1',
      cctpDestinationDomain: 0,
    },
    contracts: { ...mainnetContracts.Ethereum },
  },
  Avalanche: {
    chainInfo: {
      namespace: 'eip155',
      reference: '43114',
      cctpDestinationDomain: 1,
    },
    contracts: { ...mainnetContracts.Avalanche },
  },
  optimism: {
    chainInfo: {
      namespace: 'eip155',
      reference: '10',
      cctpDestinationDomain: 2,
    },
    contracts: { ...mainnetContracts.optimism },
  },
  arbitrum: {
    chainInfo: {
      namespace: 'eip155',
      reference: '42161',
      cctpDestinationDomain: 3,
    },
    contracts: { ...mainnetContracts.arbitrum },
  },
  Polygon: {
    chainInfo: {
      namespace: 'eip155',
      reference: '137',
      cctpDestinationDomain: 7,
    },
    contracts: { ...mainnetContracts.Polygon },
  },
  Fantom: {
    chainInfo: {
      namespace: 'eip155',
      reference: '250',
    },
    contracts: { ...mainnetContracts.Fantom },
  },
  binance: {
    chainInfo: {
      namespace: 'eip155',
      reference: '56',
    },
    contracts: { ...mainnetContracts.binance },
  },
};

/**
 * Testnet chains only.
 *
 * Sourced from:
 *
 * - https://developers.circle.com/stablecoins/supported-domains
 * - https://chainlist.org/
 * - https://docs.simplehash.com/reference/supported-chains-testnets (accessed on
 *   4 July 2025)
 *  @satisfies {AxelarChainConfigMap}
 */
export const axelarConfigTestnet = {
  'ethereum-sepolia': {
    chainInfo: {
      namespace: 'eip155',
      reference: '11155111',
      cctpDestinationDomain: 0,
    },
    contracts: { ...testnetContracts['ethereum-sepolia'] },
  },
  Avalanche: {
    chainInfo: {
      namespace: 'eip155',
      reference: '43113',
      cctpDestinationDomain: 1,
    },
    contracts: { ...testnetContracts.Avalanche },
  },
  'optimism-sepolia': {
    chainInfo: {
      namespace: 'eip155',
      reference: '11155420',
      cctpDestinationDomain: 2,
    },
    contracts: { ...testnetContracts['optimism-sepolia'] },
  },
  'arbitrum-sepolia': {
    chainInfo: {
      namespace: 'eip155',
      reference: '421614',
      cctpDestinationDomain: 3,
    },
    contracts: { ...testnetContracts['arbitrum-sepolia'] },
  },
  'polygon-sepolia': {
    chainInfo: {
      namespace: 'eip155',
      reference: '80002',
      cctpDestinationDomain: 7,
    },
    contracts: { ...testnetContracts['polygon-sepolia'] },
  },
  Fantom: {
    chainInfo: {
      namespace: 'eip155',
      reference: '4002', // XXX: confirm this ID
    },
    contracts: { ...testnetContracts.Fantom },
  },
  binance: {
    chainInfo: {
      namespace: 'eip155',
      reference: '97',
    },
    contracts: { ...testnetContracts.binance },
  },
};
