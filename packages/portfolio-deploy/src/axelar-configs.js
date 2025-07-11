/**
 * @import {AxelarChain} from '@aglocal/portfolio-contract/src/constants.js';
 * @import {EVMContractAddresses} from '@aglocal/portfolio-contract/src/portfolio.contract.ts';
 * @import {BaseChainInfo} from '@agoric/orchestration'
 * @import {EVMContractAddressesMap} from '@aglocal/portfolio-contract/src/type-guards.ts';
 */

/**
 * @typedef {object} AxelarChainIdEntry
 * @property {string} testnet - The Axelar chain ID used in testnet.
 * @property {string} mainnet - The Axelar chain ID used in mainnet.
 *
 */

/**
 * A mapping between internal AxelarChain enum keys and their corresponding
 * Axelar chain identifiers for both testnet and mainnet environments.
 *
 * This is used by YMax to dynamically switch between environments when interacting
 * with Axelar-supported chains.
 *
 * @type {Record<keyof typeof AxelarChain, AxelarChainIdEntry>}
 *
 * @see {@link https://docs.axelar.dev/resources/contract-addresses/testnet/#evm-contract-addresses}
 * @see {@link https://github.com/axelarnetwork/axelarjs-sdk/blob/f84c8a21ad9685091002e24cac7001ed1cdac774/src/chains/supported-chains-list.ts | supported-chains-list.ts}
 */
const AxelarChainIdMap = harden({
  Ethereum: {
    testnet: 'ethereum-sepolia',
    mainnet: 'Ethereum',
  },
  Avalanche: {
    testnet: 'Avalanche',
    mainnet: 'Avalanche',
  },
  Arbitrum: {
    testnet: 'arbitrum-sepolia',
    mainnet: 'arbitrum',
  },
  Optimism: {
    testnet: 'optimism-sepolia',
    mainnet: 'optimism',
  },
  Polygon: {
    testnet: 'polygon-sepolia',
    mainnet: 'Polygon',
  },
  Fantom: {
    testnet: 'Fantom',
    mainnet: 'Fantom',
  },
  Binance: {
    testnet: 'binance',
    mainnet: 'binance',
  },
});

/**
 * @typedef {`0x${string}`} HexAddress
 * @typedef {Record<string, HexAddress>} EvmAddressesMap
 * @typedef {{ mainnet: EvmAddressesMap, testnet: EvmAddressesMap }} AddressesMap
 */

/**
 * @typedef {object} AxelarChainConfig
 * @property {string} axelarId
 * @property {BaseChainInfo<"eip155">} chainInfo
 * @property {EVMContractAddresses} contracts
 */

/**
 * @typedef {Record<AxelarChain, AxelarChainConfig>} AxelarChainConfigMap
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
 * @type {EVMContractAddressesMap}
 
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
  Optimism: {
    aavePool: aaveAddresses.mainnet.Optimism,
    compound: '0x', // TODO
    factory: factoryAddresses.mainnet.Optimism,
    usdc: usdcAddresses.mainnet.Optimism,
  },
  Arbitrum: {
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
  Binance: {
    aavePool: aaveAddresses.mainnet.Binance,
    compound: '0x', // TODO
    factory: factoryAddresses.mainnet.Binance,
    usdc: usdcAddresses.mainnet.Binance,
  },
};
harden(mainnetContracts);

/**
 * Testnet configuration with testnet contract addresses
 * @type {EVMContractAddressesMap}
 */
const testnetContracts = {
  Ethereum: {
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
  Optimism: {
    aavePool: aaveAddresses.testnet.Optimism,
    compound: '0x', // TODO
    factory: factoryAddresses.testnet.Optimism,
    usdc: usdcAddresses.testnet.Optimism,
  },
  Arbitrum: {
    aavePool: aaveAddresses.testnet.Arbitrum,
    compound: '0x', // TODO
    factory: factoryAddresses.testnet.Arbitrum,
    usdc: usdcAddresses.testnet.Arbitrum,
  },
  Polygon: {
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
  Binance: {
    // TODO: AAVE on Binance testnet?
    aavePool: '0x',
    compound: '0x',
    factory: factoryAddresses.testnet.Binance,
    usdc: usdcAddresses.testnet.Binance,
  },
};
harden(testnetContracts);

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
    axelarId: AxelarChainIdMap.Ethereum.mainnet,
    chainInfo: {
      namespace: 'eip155',
      reference: '1',
      cctpDestinationDomain: 0,
    },
    contracts: { ...mainnetContracts.Ethereum },
  },
  Avalanche: {
    axelarId: AxelarChainIdMap.Avalanche.mainnet,
    chainInfo: {
      namespace: 'eip155',
      reference: '43114',
      cctpDestinationDomain: 1,
    },
    contracts: { ...mainnetContracts.Avalanche },
  },
  Optimism: {
    axelarId: AxelarChainIdMap.Optimism.mainnet,
    chainInfo: {
      namespace: 'eip155',
      reference: '10',
      cctpDestinationDomain: 2,
    },
    contracts: { ...mainnetContracts.Optimism },
  },
  Arbitrum: {
    axelarId: AxelarChainIdMap.Arbitrum.mainnet,
    chainInfo: {
      namespace: 'eip155',
      reference: '42161',
      cctpDestinationDomain: 3,
    },
    contracts: { ...mainnetContracts.Arbitrum },
  },
  Polygon: {
    axelarId: AxelarChainIdMap.Polygon.mainnet,
    chainInfo: {
      namespace: 'eip155',
      reference: '137',
      cctpDestinationDomain: 7,
    },
    contracts: { ...mainnetContracts.Polygon },
  },
  Fantom: {
    axelarId: AxelarChainIdMap.Fantom.mainnet,
    chainInfo: {
      namespace: 'eip155',
      reference: '250',
    },
    contracts: { ...mainnetContracts.Fantom },
  },
  Binance: {
    axelarId: AxelarChainIdMap.Binance.mainnet,
    chainInfo: {
      namespace: 'eip155',
      reference: '56',
    },
    contracts: { ...mainnetContracts.Binance },
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
  Ethereum: {
    axelarId: AxelarChainIdMap.Ethereum.testnet,
    chainInfo: {
      namespace: 'eip155',
      reference: '11155111',
      cctpDestinationDomain: 0,
    },
    contracts: { ...testnetContracts.Ethereum },
  },
  Avalanche: {
    axelarId: AxelarChainIdMap.Avalanche.testnet,
    chainInfo: {
      namespace: 'eip155',
      reference: '43113',
      cctpDestinationDomain: 1,
    },
    contracts: { ...testnetContracts.Avalanche },
  },
  Optimism: {
    axelarId: AxelarChainIdMap.Optimism.testnet,
    chainInfo: {
      namespace: 'eip155',
      reference: '11155420',
      cctpDestinationDomain: 2,
    },
    contracts: { ...testnetContracts.Optimism },
  },
  Arbitrum: {
    axelarId: AxelarChainIdMap.Arbitrum.testnet,
    chainInfo: {
      namespace: 'eip155',
      reference: '421614',
      cctpDestinationDomain: 3,
    },
    contracts: { ...testnetContracts.Arbitrum },
  },
  Polygon: {
    axelarId: AxelarChainIdMap.Polygon.testnet,
    chainInfo: {
      namespace: 'eip155',
      reference: '80002',
      cctpDestinationDomain: 7,
    },
    contracts: { ...testnetContracts.Polygon },
  },
  Fantom: {
    axelarId: AxelarChainIdMap.Fantom.testnet,
    chainInfo: {
      namespace: 'eip155',
      reference: '4002', // XXX: confirm this ID
    },
    contracts: { ...testnetContracts.Fantom },
  },
  Binance: {
    axelarId: AxelarChainIdMap.Binance.testnet,
    chainInfo: {
      namespace: 'eip155',
      reference: '97',
    },
    contracts: { ...testnetContracts.Binance },
  },
};
