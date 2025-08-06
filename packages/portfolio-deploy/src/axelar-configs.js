/**
 * @import {AxelarChain} from '@aglocal/portfolio-contract/src/constants.js';
 * @import {EVMContractAddresses} from '@aglocal/portfolio-contract/src/portfolio.contract.ts';
 * @import {BaseChainInfo, Bech32Address} from '@agoric/orchestration'
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
    Avalanche: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', // https://aave.com/docs/resources/addresses -> Avalanche V3 Market -> Pool contract
    Arbitrum: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', // https://aave.com/docs/resources/addresses -> Arbitrum V3 Market -> Pool contract
    Optimism: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', // https://aave.com/docs/resources/addresses -> Optimism V3 Market -> Pool contract
    // TODO: Temporary placeholder — AAVE support on Polygon is not intended.
    // Find a cleaner strategy to handle unsupported chains.
    Polygon: '0x',
  },
  testnet: {
    Avalanche: '0x8B9b2AF4afB389b4a70A474dfD4AdCD4a302bb40',
    Arbitrum: '0xBfC91D59fdAA134A4ED45f7B584cAf96D7792Eff',
    Optimism: '0xb50201558B00496A145fE76f7424749556E326D8',
    // TODO: Temporary placeholder — AAVE support on Polygon is not intended.
    // Find a cleaner strategy to handle unsupported chains.
    Polygon: '0x',
  },
};

/** @type {AddressesMap} */
const usdcAddresses = {
  mainnet: {
    Avalanche: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', // https://developers.circle.com/stablecoins/usdc-contract-addresses
    Arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // https://developers.circle.com/stablecoins/usdc-contract-addresses
    Optimism: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // https://developers.circle.com/stablecoins/usdc-contract-addresses
    Polygon: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359', // https://developers.circle.com/stablecoins/usdc-contract-addresses
  },
  testnet: {
    Avalanche: '0x5425890298aed601595a70AB815c96711a31Bc65', // https://testnet.snowtrace.io/token/0x5425890298aed601595a70AB815c96711a31Bc65
    Arbitrum: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', // https://sepolia.arbiscan.io/token/0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
    Optimism: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7', // https://sepolia-optimism.etherscan.io/token/0x5fd84259d66Cd46123540766Be93DFE6D43130D7
    Polygon: '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582', // https://amoy.polygonscan.com/token/0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582
  },
};

/** @type {AddressesMap} */
const aaveUsdcAddresses = {
  mainnet: {
    Ethereum: '0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c', // https://search.onaave.com/?q=atoken%20usdc%20aavev3ethereum
    Avalanche: '0x625E7708f30cA75bfd92586e17077590C60eb4cD', // https://search.onaave.com/?q=atoken%20usdc%20aavev3avalanche
    Arbitrum: '0x625E7708f30cA75bfd92586e17077590C60eb4cD', // https://search.onaave.com/?q=atoken%20usdc%20aavev3arbitrum
    Optimism: '0x625E7708f30cA75bfd92586e17077590C60eb4cD', // https://search.onaave.com/?q=atoken%20usdc%20aavev3optimism
    Polygon: '0x625E7708f30cA75bfd92586e17077590C60eb4cD', // https://search.onaave.com/?q=atoken%20usdc%20aavev3polygon
  },
  testnet: {
    Ethereum: '0x16dA4541aD1807f4443d92D26044C1147406EB80', // https://sepolia.etherscan.io/token/0x16da4541ad1807f4443d92d26044c1147406eb80
    Avalanche: '0xb1c85310a1b809C70fA6806d27Da425C1261F801', // Fuji https://testnet.snowtrace.io/token/0xb1c85310a1b809C70fA6806d27Da425C1261F801?chainid=43113
  },
};

/** @type {AddressesMap} */
const aaveRewardsControllerAddresses = {
  mainnet: {
    Avalanche: '0x929EC64c34a17401F460460D4B9390518E5B473e', // https://aave.com/docs/resources/addresses -> Avalanche V3 Market -> DefaultIncentivesController contract
    Arbitrum: '0x929EC64c34a17401F460460D4B9390518E5B473e', // https://aave.com/docs/resources/addresses -> Arbitrum V3 Market -> DefaultIncentivesController contract
    Optimism: '0x929EC64c34a17401F460460D4B9390518E5B473e', // https://aave.com/docs/resources/addresses -> Optimism V3 Market -> DefaultIncentivesController contract
    // TODO: Temporary placeholder — AAVE support on Polygon is not intended.
    // Find a cleaner strategy to handle unsupported chains.
    Polygon: '0x',
  },
  testnet: {
    Avalanche: '0x03aFC1Dfb53eae8eB7BE0E8CB6524aa79C3F8578', // Fuji https://testnet.snowtrace.io/address/0x03aFC1Dfb53eae8eB7BE0E8CB6524aa79C3F8578
    Arbitrum: '0x', // Arbitrum Sepolia
    Optimism: '0x', // OP Sepolia
    // TODO: Temporary placeholder — AAVE support on Polygon is not intended.
    // Find a cleaner strategy to handle unsupported chains.
    Polygon: '0x',
  },
};

/** @type {AddressesMap} */
const compoundAddresses = {
  mainnet: {
    Polygon: '0xF25212E676D1F7F89Cd72fFEe66158f541246445', // https://docs.compound.finance/#networks -> Polygon USDC -> cUSDCv3 contract
    Arbitrum: '0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf', // https://docs.compound.finance/#networks -> Arbitrum USDC -> cUSDCv3 contract
    Optimism: '0x2e44e174f7D53F0212823acC11C01A11d58c5bCB', // https://docs.compound.finance/#networks -> Optimism USDC -> cUSDCv3 contract
  },
  testnet: {
    Polygon: '0xF09F0369aB0a875254fB565E52226c88f10Bc839', // Polygon Mumbai Testnet - USDC Base
    Arbitrum: '0x',
    Optimism: '0x',
  },
};

/** @type {AddressesMap} */
const compoundRewardsControllerAddresses = {
  mainnet: {
    Polygon: '0x45939657d1CA34A8FA39A924B71D28Fe8431e581', // https://docs.compound.finance/#networks -> Polygon USDC -> Rewards contract
    Arbitrum: '0x88730d254A2f7e6AC8388c3198aFd694bA9f7fae', // https://docs.compound.finance/#networks -> Polygon USDC -> Rewards contract
    Optimism: '0x443EA0340cb75a160F31A440722dec7b5bc3C2E9', // https://docs.compound.finance/#networks -> Polygon USDC -> Rewards contract
  },
  testnet: {
    Polygon: '0x0785f2AC0dCBEDEE4b8D62c25A34098E9A0dF4bB', // Polygon Mumbai Testnet - USDC Base
    Arbitrum: '0x',
    Optimism: '0x',
  },
};

/** @type {AddressesMap} */
const beefyre7Addresses = {
  mainnet: {
    Avalanche: '0xdA640bE4588C469C9DB45D082B36913490924c08', // Beefy re7 vault on Avalanche
  },
  // No testnet beefy vaults available as yet
  testnet: {},
};

// TODO: deploy the factory in testnet and fill these addresses
/** @type {AddressesMap} */
const factoryAddresses = {
  mainnet: {
    Avalanche: '0x724fB9Fd9876d12Da33223C84E7Abf46fFc159C1', // https://snowtrace.io/address/0x724fB9Fd9876d12Da33223C84E7Abf46fFc159C1
    Arbitrum: '0x6ca3e8BFe9196A463136cB2442672e46BBe00BCc', // https://arbiscan.io/address/0x6ca3e8BFe9196A463136cB2442672e46BBe00BCc
    Optimism: '0x724fB9Fd9876d12Da33223C84E7Abf46fFc159C1', // https://optimistic.etherscan.io/address/0x724fB9Fd9876d12Da33223C84E7Abf46fFc159C1
    Polygon: '0x724fB9Fd9876d12Da33223C84E7Abf46fFc159C1', // https://polygonscan.com/address/0x724fB9Fd9876d12Da33223C84E7Abf46fFc159C1
  },
  testnet: {
    Avalanche: '0xe4Bf676E956AF5f30876b9af9E93D3CCC4D2ECfF', // https://testnet.snowtrace.io/address/0xe4Bf676E956AF5f30876b9af9E93D3CCC4D2ECfF
    Arbitrum: '0x',
    Optimism: '0x',
    Polygon: '0x',
  },
};

/** @see {@link https://developers.circle.com/cctp/evm-smart-contracts#tokenmessenger-mainnet} */
const mainnetTokenMessenger = (rows =>
  Object.fromEntries(
    rows.map(([Chain, Domain, Address]) => [Chain, { Domain, Address }]),
  ))(
  /** @type {[string, number, `0x${string}`][]} */ ([
    ['Avalanche', 1, '0x6B25532e1060CE10cc3B0A99e5683b91BFDe6982'],
    ['OP Mainnet', 2, '0x2B4069517957735bE00ceE0fadAE88a26365528f'],
    ['Arbitrum', 3, '0x19330d10D9Cc8751218eaf51E8885D058642E08A'],
    ['Polygon PoS', 7, '0x9daF8c91AEFAE50b9c0E69629D3F6Ca40cA3B3FE'],
    ['Unichain', 10, '0x4e744b28E787c3aD0e810eD65A24461D4ac5a762'],
  ]),
);

/**
 * Mainnet configuration with real contract addresses
 * @type {EVMContractAddressesMap}
 */
const mainnetContracts = {
  Avalanche: {
    aavePool: aaveAddresses.mainnet.Avalanche,
    compound: '0x', // TODO
    compoundRewardsController: '0x', // TODO
    factory: factoryAddresses.mainnet.Avalanche,
    usdc: usdcAddresses.mainnet.Avalanche,
    tokenMessenger: mainnetTokenMessenger.Avalanche.Address,
    aaveUSDC: aaveUsdcAddresses.mainnet.Avalanche,
    aaveRewardsController: aaveRewardsControllerAddresses.mainnet.Avalanche,
    Beefy_re7_Avalanche: beefyre7Addresses.mainnet.Avalanche,
  },
  Optimism: {
    aavePool: aaveAddresses.mainnet.Optimism,
    compound: compoundAddresses.mainnet.Optimism,
    compoundRewardsController:
      compoundRewardsControllerAddresses.mainnet.Optimism,
    factory: factoryAddresses.mainnet.Optimism,
    usdc: usdcAddresses.mainnet.Optimism,
    tokenMessenger: mainnetTokenMessenger['OP Mainnet'].Address,
    aaveUSDC: aaveUsdcAddresses.mainnet.Optimism,
    aaveRewardsController: aaveRewardsControllerAddresses.mainnet.Optimism,
  },
  Arbitrum: {
    aavePool: aaveAddresses.mainnet.Arbitrum,
    compound: compoundAddresses.mainnet.Arbitrum,
    compoundRewardsController:
      compoundRewardsControllerAddresses.mainnet.Arbitrum,
    factory: factoryAddresses.mainnet.Arbitrum,
    usdc: usdcAddresses.mainnet.Arbitrum,
    tokenMessenger: mainnetTokenMessenger.Arbitrum.Address,
    aaveUSDC: aaveUsdcAddresses.mainnet.Arbitrum,
    aaveRewardsController: aaveRewardsControllerAddresses.mainnet.Arbitrum,
  },
  Polygon: {
    aavePool: aaveAddresses.mainnet.Polygon,
    compound: compoundAddresses.mainnet.Polygon,
    compoundRewardsController:
      compoundRewardsControllerAddresses.mainnet.Polygon,
    factory: factoryAddresses.mainnet.Polygon,
    usdc: usdcAddresses.mainnet.Polygon,
    tokenMessenger: mainnetTokenMessenger['Polygon PoS'].Address,
    aaveUSDC: aaveUsdcAddresses.mainnet.Polygon,
    aaveRewardsController: aaveRewardsControllerAddresses.mainnet.Polygon,
  },
};
harden(mainnetContracts);

/** https://developers.circle.com/cctp/evm-smart-contracts#tokenmessenger-testnet */
const testnetTokenMessenger = (rows =>
  Object.fromEntries(
    rows.map(([Chain, Domain, Address]) => [Chain, { Domain, Address }]),
  ))(
  /** @type {[string, number, `0x${string}`][]} */ ([
    ['Avalanche Fuji', 1, '0xeb08f243E5d3FCFF26A9E38Ae5520A669f4019d0'],
    ['OP Sepolia', 2, '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5'],
    ['Arbitrum Sepolia', 3, '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5'],
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
};

/**
 * @typedef {{
 *   mainnet: {
 *     AXELAR_GMP: Bech32Address,
 *     AXELAR_GAS: Bech32Address,
 *   },
 *   testnet: {
 *     AXELAR_GMP: Bech32Address,
 *     AXELAR_GAS: Bech32Address,
 *   },
 * }} GMPAddresses
 */

/**
 * These addresses are canonical per Axelar.
 *
 * **AXELAR_GMP:**
 * The Axelar GMP account address is documented in various places.
 * One reference: {@link https://docs.axelar.dev/dev/general-message-passing/cosmos-gmp/overview/#messages-from-cosmwasm}
 *
 * **AXELAR_GAS:**
 * The GAS service address is not directly cited in the docs,
 * but appears in the AxelarJS source:
 * {@link https://github.com/axelarnetwork/axelarjs/blob/fae808d4a2a1e34f386d6486f5f3708dd7a25cf5/packages/core/src/index.ts#L9-L13}
 *
 * Both addresses were also confirmed directly with the Axelar team via Slack.
 * @type {GMPAddresses}
 */
export const gmpAddresses = {
  mainnet: {
    /**
     * GMP address on mainnet.
      @see https://axelarscan.io/account/axelar1dv4u5k73pzqrxlzujxg3qp8kvc3pje7jtdvu72npnt5zhq05ejcsn5qme5 */
    AXELAR_GMP:
      'axelar1dv4u5k73pzqrxlzujxg3qp8kvc3pje7jtdvu72npnt5zhq05ejcsn5qme5',
    /**
     * GAS receiver address on mainnet.
      @see https://axelarscan.io/account/axelar1aythygn6z5thymj6tmzfwekzh05ewg3l7d6y89 */
    AXELAR_GAS: 'axelar1aythygn6z5thymj6tmzfwekzh05ewg3l7d6y89',
  },
  testnet: {
    /**
     * GMP address on testnet.
      @see https://testnet.axelarscan.io/account/axelar1dv4u5k73pzqrxlzujxg3qp8kvc3pje7jtdvu72npnt5zhq05ejcsn5qme5 */
    AXELAR_GMP:
      'axelar1dv4u5k73pzqrxlzujxg3qp8kvc3pje7jtdvu72npnt5zhq05ejcsn5qme5',
    /**
     * GAS receiver address on testnet.
      @see https://testnet.axelarscan.io/account/axelar1zl3rxpp70lmte2xr6c4lgske2fyuj3hupcsvcd */
    AXELAR_GAS: 'axelar1zl3rxpp70lmte2xr6c4lgske2fyuj3hupcsvcd',
  },
};
