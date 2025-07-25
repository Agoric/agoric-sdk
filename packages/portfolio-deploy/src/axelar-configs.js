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

/**
 * TODO: Fill in the contract addresses for AAVE, Compound, and USDC
 * link: https://github.com/Agoric/agoric-sdk/issues/11651
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

/** @type {AddressesMap} */
const aaveUsdcAddresses = {
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
    Ethereum: '0x', // Sepolia
    Avalanche: '0xb1c85310a1b809C70fA6806d27Da425C1261F801', // Fuji
    Arbitrum: '0x', // Arbitrum Sepolia
    Optimism: '0x', // OP Sepolia
    Polygon: '0x', // Amoy
    Fantom: '0x',
    Binance: '0x',
  },
};

/** @type {AddressesMap} */
const aaveRewardsControllerAddresses = {
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
    Ethereum: '0x', // Sepolia
    Avalanche: '0x03aFC1Dfb53eae8eB7BE0E8CB6524aa79C3F8578', // Fuji
    Arbitrum: '0x', // Arbitrum Sepolia
    Optimism: '0x', // OP Sepolia
    Polygon: '0x', // Amoy
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
    Avalanche: '0x84E2eFa88324A270b95B062048BD43fb821FDb0f',
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
 */

/** @see {@link https://developers.circle.com/cctp/evm-smart-contracts#tokenmessenger-mainnet} */
const mainnetTokenMessenger = (rows =>
  Object.fromEntries(
    rows.map(([Chain, Domain, Address]) => [Chain, { Domain, Address }]),
  ))(
  /** @type {[string, number, `0x${string}`][]} */ ([
    ['Ethereum', 0, '0xBd3fa81B58Ba92a82136038B25aDec7066af3155'],
    ['Avalanche', 1, '0x6B25532e1060CE10cc3B0A99e5683b91BFDe6982'],
    ['OP Mainnet', 2, '0x2B4069517957735bE00ceE0fadAE88a26365528f'],
    ['Arbitrum', 3, '0x19330d10D9Cc8751218eaf51E8885D058642E08A'],
    ['Base', 6, '0x1682Ae6375C4E4A97e4B583BC394c861A46D8962'],
    ['Polygon PoS', 7, '0x9daF8c91AEFAE50b9c0E69629D3F6Ca40cA3B3FE'],
    ['Unichain', 10, '0x4e744b28E787c3aD0e810eD65A24461D4ac5a762'],
  ]),
);

/**
 * Mainnet configuration with real contract addresses
 * @type {EVMContractAddressesMap}
 
 */
const mainnetContracts = {
  Ethereum: {
    aavePool: aaveAddresses.mainnet.Ethereum,
    compound: '0x', // TODO
    compoundRewardsController: '0x',
    factory: factoryAddresses.mainnet.Ethereum,
    usdc: usdcAddresses.mainnet.Ethereum,
    tokenMessenger: mainnetTokenMessenger.Ethereum.Address,
    aaveUSDC: aaveUsdcAddresses.mainnet.Ethereum,
    aaveRewardsController: aaveRewardsControllerAddresses.mainnet.Ethereum,
  },
  Avalanche: {
    aavePool: aaveAddresses.mainnet.Avalanche,
    compound: '0x', // TODO
    compoundRewardsController: '0x',
    factory: factoryAddresses.mainnet.Avalanche,
    usdc: usdcAddresses.mainnet.Avalanche,
    tokenMessenger: mainnetTokenMessenger.Avalanche.Address,
    aaveUSDC: aaveUsdcAddresses.mainnet.Avalanche,
    aaveRewardsController: aaveRewardsControllerAddresses.mainnet.Avalanche,
  },
  Optimism: {
    aavePool: aaveAddresses.mainnet.Optimism,
    compound: '0x', // TODO
    compoundRewardsController: '0x',
    factory: factoryAddresses.mainnet.Optimism,
    usdc: usdcAddresses.mainnet.Optimism,
    tokenMessenger: mainnetTokenMessenger['OP Mainnet'].Address,
    aaveUSDC: aaveUsdcAddresses.mainnet.Optimism,
    aaveRewardsController: aaveRewardsControllerAddresses.mainnet.Optimism,
  },
  Arbitrum: {
    aavePool: aaveAddresses.mainnet.Arbitrum,
    compound: '0x', // TODO
    compoundRewardsController: '0x',
    factory: factoryAddresses.mainnet.Arbitrum,
    usdc: usdcAddresses.mainnet.Arbitrum,
    tokenMessenger: mainnetTokenMessenger.Arbitrum.Address,
    aaveUSDC: aaveUsdcAddresses.mainnet.Arbitrum,
    aaveRewardsController: aaveRewardsControllerAddresses.mainnet.Arbitrum,
  },
  Polygon: {
    aavePool: aaveAddresses.mainnet.Polygon,
    compound: '0x', // TODO
    compoundRewardsController: '0x',
    factory: factoryAddresses.mainnet.Polygon,
    usdc: usdcAddresses.mainnet.Polygon,
    tokenMessenger: mainnetTokenMessenger['Polygon PoS'].Address,
    aaveUSDC: aaveUsdcAddresses.mainnet.Polygon,
    aaveRewardsController: aaveRewardsControllerAddresses.mainnet.Polygon,
  },
  Fantom: {
    // TODO: aave and compound?
    aavePool: '0x',
    compound: '0x',
    compoundRewardsController: '0x',
    factory: factoryAddresses.mainnet.Fantom,
    usdc: usdcAddresses.mainnet.Fantom,
    tokenMessenger: '0x', // TODO
    aaveUSDC: '0x',
    aaveRewardsController: '0x',
  },
  Binance: {
    aavePool: aaveAddresses.mainnet.Binance,
    compound: '0x', // TODO
    compoundRewardsController: '0x',
    factory: factoryAddresses.mainnet.Binance,
    usdc: usdcAddresses.mainnet.Binance,
    tokenMessenger: '0x', // TODO
    aaveUSDC: aaveUsdcAddresses.mainnet.Binance,
    aaveRewardsController: aaveRewardsControllerAddresses.mainnet.Binance,
  },
};
harden(mainnetContracts);

/** https://developers.circle.com/cctp/evm-smart-contracts#tokenmessenger-testnet */
const testnetTokenMessenger = (rows =>
  Object.fromEntries(
    rows.map(([Chain, Domain, Address]) => [Chain, { Domain, Address }]),
  ))(
  /** @type {[string, number, `0x${string}`][]} */ ([
    ['Ethereum Sepolia', 0, '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5'],
    ['Avalanche Fuji', 1, '0xeb08f243E5d3FCFF26A9E38Ae5520A669f4019d0'],
    ['OP Sepolia', 2, '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5'],
    ['Arbitrum Sepolia', 3, '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5'],
    ['Base Sepolia', 6, '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5'],
    ['Polygon PoS Amoy', 7, '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5'],
    ['Unichain Sepolia', 10, '0x8ed94B8dAd2Dc5453862ea5e316A8e71AAed9782'],
  ]),
);

// XXX turn these inside out? contract.chain.address
/**
 * Testnet configuration with testnet contract addresses
 * @type {EVMContractAddressesMap}
 */
const testnetContracts = {
  Ethereum: {
    aavePool: aaveAddresses.testnet.Ethereum,
    compound: '0x', // TODO
    compoundRewardsController: '0x',
    factory: factoryAddresses.testnet.Ethereum,
    usdc: usdcAddresses.testnet.Ethereum,
    tokenMessenger: testnetTokenMessenger['Ethereum Sepolia'].Address,
    aaveUSDC: aaveUsdcAddresses.testnet.Ethereum,
    aaveRewardsController: aaveRewardsControllerAddresses.testnet.Ethereum,
  },
  Avalanche: {
    aavePool: aaveAddresses.testnet.Avalanche,
    compound: '0x', // TODO
    compoundRewardsController: '0x',
    factory: factoryAddresses.testnet.Avalanche,
    usdc: usdcAddresses.testnet.Avalanche,
    tokenMessenger: testnetTokenMessenger['Avalanche Fuji'].Address,
    aaveUSDC: aaveUsdcAddresses.testnet.Avalanche,
    aaveRewardsController: aaveRewardsControllerAddresses.testnet.Avalanche,
  },
  Optimism: {
    aavePool: aaveAddresses.testnet.Optimism,
    compound: '0x', // TODO
    compoundRewardsController: '0x',
    factory: factoryAddresses.testnet.Optimism,
    usdc: usdcAddresses.testnet.Optimism,
    tokenMessenger: testnetTokenMessenger['OP Sepolia'].Address,
    aaveUSDC: aaveUsdcAddresses.testnet.Optimism,
    aaveRewardsController: aaveRewardsControllerAddresses.testnet.Optimism,
  },
  Arbitrum: {
    aavePool: aaveAddresses.testnet.Arbitrum,
    compound: '0x', // TODO
    compoundRewardsController: '0x',
    factory: factoryAddresses.testnet.Arbitrum,
    usdc: usdcAddresses.testnet.Arbitrum,
    tokenMessenger: testnetTokenMessenger['Arbitrum Sepolia'].Address,
    aaveUSDC: aaveUsdcAddresses.testnet.Arbitrum,
    aaveRewardsController: aaveRewardsControllerAddresses.testnet.Arbitrum,
  },
  Polygon: {
    // TODO: AAVE and Compound on polygon testnet?
    aavePool: '0x',
    compound: '0x',
    compoundRewardsController: '0x',
    factory: factoryAddresses.testnet.Polygon,
    usdc: usdcAddresses.testnet.Polygon,
    tokenMessenger: testnetTokenMessenger['Polygon PoS Amoy'].Address,
    aaveUSDC: '0x',
    aaveRewardsController: '0x',
  },
  Fantom: {
    // TODO: aave and compound?
    aavePool: '0x',
    compound: '0x',
    compoundRewardsController: '0x',
    factory: factoryAddresses.testnet.Fantom,
    usdc: usdcAddresses.testnet.Fantom,
    tokenMessenger: '0x', // TODO?
    aaveUSDC: '0x',
    aaveRewardsController: '0x',
  },
  Binance: {
    // TODO: AAVE on Binance testnet?
    aavePool: '0x',
    compound: '0x',
    compoundRewardsController: '0x',
    factory: factoryAddresses.testnet.Binance,
    usdc: usdcAddresses.testnet.Binance,
    tokenMessenger: '0x', // TODO?
    aaveUSDC: '0x',
    aaveRewardsController: '0x',
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
