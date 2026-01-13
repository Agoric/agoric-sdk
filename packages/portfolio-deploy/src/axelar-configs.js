/**
 * @import {AxelarChain} from '@agoric/portfolio-api/src/constants.js';
 * @import {EVMContractAddresses} from '@aglocal/portfolio-contract/src/portfolio.contract.js';
 * @import {BaseChainInfo, Bech32Address} from '@agoric/orchestration'
 * @import {EVMContractAddressesMap} from '@aglocal/portfolio-contract/src/type-guards.js';
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
export const AxelarChainIdMap = harden({
  Avalanche: {
    testnet: 'Avalanche',
    mainnet: 'Avalanche',
  },
  Ethereum: {
    testnet: 'ethereum-sepolia',
    mainnet: 'Ethereum',
  },
  Arbitrum: {
    testnet: 'arbitrum-sepolia',
    mainnet: 'arbitrum',
  },
  Optimism: {
    testnet: 'optimism-sepolia',
    mainnet: 'optimism',
  },
  Base: {
    testnet: 'base-sepolia',
    mainnet: 'base',
  },
});

// XXX: Ideally this should be Record<keyof typeof AxelarChain, HexAddress>.
// Currently using a looser type to work around compile-time errors.
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

// XXX: For unsupported chains,
// we use `0x` until a proper strategy is defined.

/** @type {AddressesMap} */
const aaveAddresses = harden({
  mainnet: {
    Ethereum: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2', // https://aave.com/docs/resources/addresses -> Ethereum V3 Market -> Pool contract
    Avalanche: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', // https://aave.com/docs/resources/addresses -> Avalanche V3 Market -> Pool contract
    Arbitrum: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', // https://aave.com/docs/resources/addresses -> Arbitrum V3 Market -> Pool contract
    Optimism: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', // https://aave.com/docs/resources/addresses -> Optimism V3 Market -> Pool contract
    Base: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5', // https://aave.com/docs/resources/addresses -> Base V3 Market -> Pool contract
  },
  testnet: {
    Arbitrum: '0xBfC91D59fdAA134A4ED45f7B584cAf96D7792Eff', // https://search.onaave.com/?q=pool%20sepolia
    Avalanche: '0x8B9b2AF4afB389b4a70A474dfD4AdCD4a302bb40', // https://search.onaave.com/?q=pool%20fuji
    Base: '0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27', // https://search.onaave.com/?q=pool%20sepolia
    Ethereum: '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951', // https://aave.com/docs/resources/addresses -> Ethereum Sepolia V3 Market -> Pool contract
    Optimism: '0xb50201558B00496A145fE76f7424749556E326D8', // https://search.onaave.com/?q=pool%20sepolia
  },
});

/** @type {AddressesMap} */
const usdcAddresses = harden({
  mainnet: {
    Avalanche: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', // https://developers.circle.com/stablecoins/usdc-contract-addresses
    Arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // https://developers.circle.com/stablecoins/usdc-contract-addresses
    Ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // https://developers.circle.com/stablecoins/usdc-contract-addresses
    Optimism: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // https://developers.circle.com/stablecoins/usdc-contract-addresses
    Base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // https://developers.circle.com/stablecoins/usdc-contract-addresses
  },
  testnet: {
    Avalanche: '0x5425890298aed601595a70AB815c96711a31Bc65', // https://testnet.snowtrace.io/token/0x5425890298aed601595a70AB815c96711a31Bc65
    Arbitrum: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', // https://sepolia.arbiscan.io/token/0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d
    Ethereum: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // https://developers.circle.com/stablecoins/usdc-contract-addresses
    Optimism: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7', // https://sepolia-optimism.etherscan.io/token/0x5fd84259d66Cd46123540766Be93DFE6D43130D7
    Base: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // https://sepolia.basescan.org/address/0x036CbD53842c5426634e7929541eC2318f3dCF7e
  },
});

/** @type {AddressesMap} */
const aaveUsdcAddresses = harden({
  mainnet: {
    Ethereum: '0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c', // https://search.onaave.com/?q=atoken%20usdc%20aavev3ethereum
    Avalanche: '0x625E7708f30cA75bfd92586e17077590C60eb4cD', // https://search.onaave.com/?q=atoken%20usdc%20aavev3avalanche
    Arbitrum: '0x724dc807b04555b71ed48a6896b6F41593b8C637', // https://search.onaave.com/?q=atoken%20usdcn%20aavev3arbitrum // token is USDCn not USDC on Arbitrum
    Optimism: '0x38d693cE1dF5AaDF7bC62595A37D667aD57922e5', // https://search.onaave.com/?q=atoken%20usdcn%20aavev3optimism  // token is USDCn not USDC on Optimism
    Base: '0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB', // https://search.onaave.com/?q=atoken%20usdc%20aavev3base
  },
  testnet: {
    Ethereum: '0x16dA4541aD1807f4443d92D26044C1147406EB80', // https://search.onaave.com/?q=atoken%20usdc%20sepolia
    Arbitrum: '0x460b97BD498E1157530AEb3086301d5225b91216', // https://search.onaave.com/?q=AaveV3ArbitrumSepolia
    Base: '0x10F1A9D11CDf50041f3f8cB7191CBE2f31750ACC', // https://search.onaave.com/?q=AaveV3BaseSepolia
    Optimism: '0xa818F1B57c201E092C4A2017A91815034326Efd1', // https://search.onaave.com/?q=AaveV3OptimismSepolia
    Avalanche: '0x9CFcc1B289E59FBe1E769f020C77315DF8473760', // https://search.onaave.com/?q=AaveV3Fuji
  },
});

/** @type {AddressesMap} */
export const aaveRewardsControllerAddresses = harden({
  mainnet: {
    Ethereum: '0x8164Cc65827dcFe994AB23944CBC90e0aa80bFcb', // https://aave.com/docs/resources/addresses -> Ethereum V3 Market -> DefaultIncentivesController contract
    Avalanche: '0x929EC64c34a17401F460460D4B9390518E5B473e', // https://aave.com/docs/resources/addresses -> Avalanche V3 Market -> DefaultIncentivesController contract
    Arbitrum: '0x929EC64c34a17401F460460D4B9390518E5B473e', // https://aave.com/docs/resources/addresses -> Arbitrum V3 Market -> DefaultIncentivesController contract
    Optimism: '0x929EC64c34a17401F460460D4B9390518E5B473e', // https://aave.com/docs/resources/addresses -> Optimism V3 Market -> DefaultIncentivesController contract
    Base: '0xf9cc4F0D883F1a1eb2c253bdb46c254Ca51E1F44', // https://aave.com/docs/resources/addresses -> Base V3 Market -> DefaultIncentivesController contract
  },
  testnet: {
    Ethereum: '0x4DA5c4da71C5a167171cC839487536d86e083483', // https://aave.com/docs/resources/addresses -> Sepolia V3 Market -> DefaultIncentivesController contract
    Avalanche: '0x03aFC1Dfb53eae8eB7BE0E8CB6524aa79C3F8578', // Fuji https://testnet.snowtrace.io/address/0x03aFC1Dfb53eae8eB7BE0E8CB6524aa79C3F8578
    Arbitrum: '0x3A203B14CF8749a1e3b7314c6c49004B77Ee667A', // https://search.onaave.com/?q=AaveV3ArbitrumSepolia
    Optimism: '0xaD4F91D26254B6B0C6346b390dDA2991FDE2F20d', // https://search.onaave.com/?q=AaveV3OptimismSepolia
    Base: '0x71B448405c803A3982aBa448133133D2DEAFBE5F', // https://search.onaave.com/?q=AaveV3BaseSepolia
  },
});

/** @type {AddressesMap} */
export const compoundAddresses = harden({
  mainnet: {
    Ethereum: '0xc3d688B66703497DAA19211EEdff47f25384cdc3', // https://docs.compound.finance/#networks -> Ethereum USDC -> cUSDCv3 contract
    Arbitrum: '0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf', // https://docs.compound.finance/#networks -> Arbitrum USDC -> cUSDCv3 contract
    Optimism: '0x2e44e174f7D53F0212823acC11C01A11d58c5bCB', // https://docs.compound.finance/#networks -> Optimism USDC -> cUSDCv3 contract
    Base: '0xb125E6687d4313864e53df431d5425969c15Eb2F', // https://docs.compound.finance/#networks -> Base USDC -> cUSDCv3 contract
  },
  testnet: {
    Ethereum: '0xAec1F48e02Cfb822Be958B68C7957156EB3F0b6e', // https://docs.compound.finance/#networks -> Sepolia USDC -> cUSDCv3 contract
    Base: '0x571621Ce60Cebb0c1D442B5afb38B1663C6Bf017', // https://docs.compound.finance/#networks -> Base Sepolia USDC -> cUSDCv3 contract
    Arbitrum: '0x',
    Optimism: '0x',
  },
});

/** @type {AddressesMap} */
const compoundRewardsControllerAddresses = harden({
  mainnet: {
    Ethereum: '0x1B0e765F6224C21223AeA2af16c1C46E38885a40', // https://docs.compound.finance/#networks -> Ethereum USDC -> Rewards contract
    Arbitrum: '0x88730d254A2f7e6AC8388c3198aFd694bA9f7fae', // https://docs.compound.finance/#networks -> Arbitrum USDC -> Rewards contract
    Optimism: '0x443EA0340cb75a160F31A440722dec7b5bc3C2E9', // https://docs.compound.finance/#networks -> Optimism USDC -> Rewards contract
    Base: '0x123964802e6ABabBE1Bc9547D72Ef1B69B00A6b1', // https://docs.compound.finance/#networks -> Base USDC -> Rewards contract
  },
  testnet: {
    Ethereum: '0x8bF5b658bdF0388E8b482ED51B14aef58f90abfD', // https://docs.compound.finance/#networks -> Sepolia USDC -> Rewards contract
    Base: '0x3394fa1baCC0b47dd0fF28C8573a476a161aF7BC', // https://docs.compound.finance/#networks -> Base Sepolia USDC -> Rewards contract
    Arbitrum: '0x',
    Optimism: '0x',
  },
});

/** @type {Record<string, AddressesMap>} */
const beefyVaultAddresses = harden({
  re7: {
    mainnet: {
      Avalanche: '0xdA640bE4588C469C9DB45D082B36913490924c08', // https://github.com/beefyfinance/beefy-v2/blob/9216cb622aa788668bfc40040b7e17ceb941ecfd/src/config/vault/avax.json#L243
    },
    // No testnet deployments for beefy
    testnet: {},
  },
  morphoGauntletUsdc: {
    mainnet: {
      Ethereum: '0x16F06dE7F077A95684DBAeEdD15A5808c3E13cD0', // https://github.com/beefyfinance/beefy-v2/blob/9216cb622aa788668bfc40040b7e17ceb941ecfd/src/config/vault/ethereum.json#L1169
    },
    testnet: {},
  },
  morphoSmokehouseUsdc: {
    mainnet: {
      Ethereum: '0x562Ea6FfFD1293b9433E7b81A2682C31892ea013', // https://github.com/beefyfinance/beefy-v2/blob/9216cb622aa788668bfc40040b7e17ceb941ecfd/src/config/vault/ethereum.json#L1429
    },
    testnet: {},
  },
  morphoSeamlessUsdc: {
    mainnet: {
      Base: '0xF3C4Db91F380963e00CaA4AC1f0508259C9a3d3A', // https://github.com/beefyfinance/beefy-v2/blob/9216cb622aa788668bfc40040b7e17ceb941ecfd/src/config/vault/base.json#L3945
    },
    testnet: {},
  },
  compoundUsdc: {
    mainnet: {
      Optimism: '0x64ceF7ac6e206944fBF50d9E50Fe934cEd9FdF5F', // https://github.com/beefyfinance/beefy-v2/blob/9216cb622aa788668bfc40040b7e17ceb941ecfd/src/config/vault/optimism.json
      Arbitrum: '0xb9A27ba529634017b12e3cbbbFFb6dB7908a8C8B', // https://github.com/beefyfinance/beefy-v2/blob/9216cb622aa788668bfc40040b7e17ceb941ecfd/src/config/vault/arbitrum.json
    },
    testnet: {},
  },
});

/** @type {Record<string, AddressesMap>} */
const erc4626VaultAddresses = harden({
  vaultU2: {
    mainnet: {},
    testnet: {
      Ethereum: '0xAA1dD21066383b1aC4652Ea41C7520Fb373840Bc', // https://sepolia.etherscan.io/address/0xAA1dD21066383b1aC4652Ea41C7520Fb373840Bc
    },
  },
  morphoClearstarHighYieldUsdc: {
    mainnet: {
      Ethereum: '0x9B5E92fd227876b4C07a8c02367E2CB23c639DfA', // https://app.morpho.org/ethereum/vault/0x9B5E92fd227876b4C07a8c02367E2CB23c639DfA/clearstar-high-yield-usdc
    },
    testnet: {},
  },
  morphoClearstarUsdcCore: {
    mainnet: {
      Ethereum: '0x69A238Ae7ebeb3c53ff3B544E48B96a2142fc284', // https://app.morpho.org/ethereum/vault/0x69A238Ae7ebeb3c53ff3B544E48B96a2142fc284/clearstar-usdc-core
    },
    testnet: {},
  },
  morphoGauntletUsdcRwa: {
    mainnet: {
      Ethereum: '0xA8875aaeBc4f830524e35d57F9772FfAcbdD6C45', // https://app.morpho.org/ethereum/vault/0xA8875aaeBc4f830524e35d57F9772FfAcbdD6C45/gauntlet-usdc-rwa
    },
    testnet: {},
  },
  morphoSteakhouseHighYieldInstant: {
    mainnet: {
      Ethereum: '0xbeeff2C5bF38f90e3482a8b19F12E5a6D2FCa757', // https://app.morpho.org/ethereum/vault/0xbeeff2C5bF38f90e3482a8b19F12E5a6D2FCa757/steakhouse-high-yield-instant
    },
    testnet: {},
  },
  morphoClearstarInstitutionalUsdc: {
    mainnet: {
      Ethereum: '0x8F40e713a1Cfeff2A052E0c610C8118Be3f75b12', // https://app.morpho.org/ethereum/vault/0x8F40e713a1Cfeff2A052E0c610C8118Be3f75b12/clearstar-institutional-usdc
    },
    testnet: {},
  },
  morphoClearstarUsdcReactor: {
    mainnet: {
      Ethereum: '0x62fE596d59fB077c2Df736dF212E0AFfb522dC78', // https://app.morpho.org/ethereum/vault/0x62fE596d59fB077c2Df736dF212E0AFfb522dC78/clearstar-usdc-reactor
    },
    testnet: {},
  },
  morphoAlphaUsdcCore: {
    mainnet: {
      Ethereum: '0xb0f05E4De970A1aaf77f8C2F823953a367504BA9', // https://app.morpho.org/ethereum/vault/0xb0f05E4De970A1aaf77f8C2F823953a367504BA9/alpha-usdc-core
    },
    testnet: {},
  },
  morphoResolvUsdc: {
    mainnet: {
      Ethereum: '0x132E6C9C33A62D7727cd359b1f51e5B566E485Eb', // https://app.morpho.org/ethereum/vault/0x132E6C9C33A62D7727cd359b1f51e5B566E485Eb/resolv-usdc
    },
    testnet: {},
  },
  morphoGauntletUsdcFrontier: {
    mainnet: {
      Ethereum: '0x9a1D6bd5b8642C41F25e0958129B85f8E1176F3e', // https://app.morpho.org/ethereum/vault/0x9a1D6bd5b8642C41F25e0958129B85f8E1176F3e/gauntlet-usdc-frontier
    },
    testnet: {},
  },
  morphoHyperithmUsdcMidcurve: {
    mainnet: {
      Ethereum: '0xCdaea3dde6cE5969aA1414A82A3A681cEd51Ce72', // https://app.morpho.org/ethereum/vault/0xCdaea3dde6cE5969aA1414A82A3A681cEd51Ce72/hyperithm-usdc-midcurve
    },
    testnet: {},
  },
  morphoHyperithmUsdcDegen: {
    mainnet: {
      Ethereum: '0x777791C4d6DC2CE140D00D2828a7C93503c67777', // https://app.morpho.org/ethereum/vault/0x777791C4d6DC2CE140D00D2828a7C93503c67777/hyperithm-usdc-degen,
    },
    testnet: {},
  },
  morphoGauntletUsdcCore: {
    mainnet: {
      Ethereum: '0x8eB67A509616cd6A7c1B3c8C21D48FF57df3d458', // https://app.morpho.org/ethereum/vault/0x8eB67A509616cd6A7c1B3c8C21D48FF57df3d458/gauntlet-usdc-core
    },
    testnet: {},
  },
});

/** @type {AddressesMap} */
const factoryAddresses = harden({
  mainnet: {
    Arbitrum: '0x3bF3056835f7C25b1f71aff99B734Ad07d644577', // https://arbiscan.io/address/0x3bF3056835f7C25b1f71aff99B734Ad07d644577
    Avalanche: '0xdBde53d9EDaE219C7b8e27fbbeDfB9130F637B46', // https://snowtrace.io/address/0xdBde53d9EDaE219C7b8e27fbbeDfB9130F637B46
    Base: '0x6ca3e8BFe9196A463136cB2442672e46BBe00BCc', // https://basescan.org/address/0x6ca3e8BFe9196A463136cB2442672e46BBe00BCc
    Ethereum: '0x647Ead1a35dbC2b0160Cbe6e565f25C4915a125F', // https://etherscan.io/address/0x647Ead1a35dbC2b0160Cbe6e565f25C4915a125F
    Optimism: '0xE0aFf709b7A6Cdf476738b86354D17bd334eB516', // https://optimistic.etherscan.io/address/0xE0aFf709b7A6Cdf476738b86354D17bd334eB516
  },
  testnet: {
    Arbitrum: '0xcD58949D815d25A06560AFa539972bB5B4B28902', // https://sepolia.arbiscan.io/address/0xcD58949D815d25A06560AFa539972bB5B4B28902
    Avalanche: '0x2B3545638859C49df84660eA2D110f82F2e80De8', // https://testnet.snowtrace.io/address/0x2B3545638859C49df84660eA2D110f82F2e80De8
    Base: '0x98B8598E1cAc53FE9C0B40eB71e3d9aA4ED6bAAF', // https://sepolia.basescan.org/address/0x98B8598E1cAc53FE9C0B40eB71e3d9aA4ED6bAAF
    Ethereum: '0x4cd5CbD60Aa8BE121CB59a89920e88D89c355588', // https://sepolia.etherscan.io/address/0x4cd5CbD60Aa8BE121CB59a89920e88D89c355588
    Optimism: '0x',
  },
});

/** @type {AddressesMap} */
const depositFactoryAddresses = harden({
  // TODO: These are addresses specific to ymax0 and its current contractAddress
  mainnet: {
    Arbitrum: '0x', // https://arbiscan.io/address/0x
    Avalanche: '0x9524EEb5F792944a0FE929bb8Efb354438B19F7C', // https://snowtrace.io/address/0x9524EEb5F792944a0FE929bb8Efb354438B19F7C
    Base: '0x', // https://basescan.org/address/0x
    Ethereum: '0x9524EEb5F792944a0FE929bb8Efb354438B19F7C', // https://etherscan.io/address/0x9524EEb5F792944a0FE929bb8Efb354438B19F7C
    Optimism: '0x', // https://optimistic.etherscan.io/address/0x
  },
  testnet: {
    Arbitrum: '0x', // https://sepolia.arbiscan.io/address/0x
    Avalanche: '0x', // https://testnet.snowtrace.io/address/0x
    Base: '0x', // https://sepolia.basescan.org/address/0x
    Ethereum: '0x209Bf441cBADFE6fBc3bB5303409Bf06656FC33c', // https://sepolia.etherscan.io/address/0x209Bf441cBADFE6fBc3bB5303409Bf06656FC33c
    Optimism: '0x',
  },
});

/**
 * Axelar Gateway contract addresses
 * @see {@link https://docs.axelar.dev/dev/reference/mainnet-contract-addresses/}
 * @see {@link https://docs.axelar.dev/dev/reference/testnet-contract-addresses/}
 * @type {AddressesMap}
 */
const gatewayAddresses = harden({
  mainnet: {
    Arbitrum: '0xe432150cce91c13a887f7D836923d5597adD8E31',
    Avalanche: '0x5029C0EFf6C34351a0CEc334542cDb22c7928f78',
    Base: '0xe432150cce91c13a887f7D836923d5597adD8E31',
    Ethereum: '0x4F4495243837681061C4743b74B3eEdf548D56A5',
    Optimism: '0xe432150cce91c13a887f7D836923d5597adD8E31',
  },
  testnet: {
    Arbitrum: '0xe1cE95479C84e9809269227C7F8524aE051Ae77a',
    Avalanche: '0xC249632c2D40b9001FE907806902f63038B737Ab',
    Base: '0xe432150cce91c13a887f7D836923d5597adD8E31',
    Ethereum: '0xe432150cce91c13a887f7D836923d5597adD8E31',
    Optimism: '0xe432150cce91c13a887f7D836923d5597adD8E31',
  },
});

/**
 * Axelar Gas Service contract addresses
 * @see {@link https://docs.axelar.dev/dev/reference/mainnet-contract-addresses/}
 * @see {@link https://docs.axelar.dev/dev/reference/testnet-contract-addresses/}
 * @type {AddressesMap}
 */
const gasServiceAddresses = harden({
  mainnet: {
    Arbitrum: '0x2d5d7d31F671F86C782533cc367F14109a082712',
    Avalanche: '0x2d5d7d31F671F86C782533cc367F14109a082712',
    Base: '0x2d5d7d31F671F86C782533cc367F14109a082712',
    Ethereum: '0x2d5d7d31F671F86C782533cc367F14109a082712',
    Optimism: '0x2d5d7d31F671F86C782533cc367F14109a082712',
  },
  testnet: {
    Arbitrum: '0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6',
    Avalanche: '0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6',
    Base: '0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6',
    Ethereum: '0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6',
    Optimism: '0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6',
  },
});

/** @see {@link https://developers.circle.com/cctp/v1/evm-smart-contracts#mainnet-contract-addresses} */
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
    depositFactory: depositFactoryAddresses.mainnet.Avalanche,
    factory: factoryAddresses.mainnet.Avalanche,
    gateway: gatewayAddresses.mainnet.Avalanche,
    gasService: gasServiceAddresses.mainnet.Avalanche,
    usdc: usdcAddresses.mainnet.Avalanche,
    tokenMessenger: mainnetTokenMessenger.Avalanche.Address,
    aaveUSDC: aaveUsdcAddresses.mainnet.Avalanche,
    aaveRewardsController: aaveRewardsControllerAddresses.mainnet.Avalanche,
    Beefy_re7_Avalanche: beefyVaultAddresses.re7.mainnet.Avalanche,
  },
  Ethereum: {
    aavePool: aaveAddresses.mainnet.Ethereum,
    compound: compoundAddresses.mainnet.Ethereum,
    compoundRewardsController:
      compoundRewardsControllerAddresses.mainnet.Ethereum,
    depositFactory: depositFactoryAddresses.mainnet.Ethereum,
    factory: factoryAddresses.mainnet.Ethereum,
    gateway: gatewayAddresses.mainnet.Ethereum,
    gasService: gasServiceAddresses.mainnet.Ethereum,
    usdc: usdcAddresses.mainnet.Ethereum,
    tokenMessenger: mainnetTokenMessenger.Ethereum.Address,
    aaveUSDC: aaveUsdcAddresses.mainnet.Ethereum,
    aaveRewardsController: aaveRewardsControllerAddresses.mainnet.Ethereum,
    Beefy_morphoGauntletUsdc_Ethereum:
      beefyVaultAddresses.morphoGauntletUsdc.mainnet.Ethereum,
    Beefy_morphoSmokehouseUsdc_Ethereum:
      beefyVaultAddresses.morphoSmokehouseUsdc.mainnet.Ethereum,
    ERC4626_morphoClearstarHighYieldUsdc_Ethereum:
      erc4626VaultAddresses.morphoClearstarHighYieldUsdc.mainnet.Ethereum,
    ERC4626_morphoClearstarUsdcCore_Ethereum:
      erc4626VaultAddresses.morphoClearstarUsdcCore.mainnet.Ethereum,
    ERC4626_morphoGauntletUsdcRwa_Ethereum:
      erc4626VaultAddresses.morphoGauntletUsdcRwa.mainnet.Ethereum,
    ERC4626_morphoSteakhouseHighYieldInstant_Ethereum:
      erc4626VaultAddresses.morphoSteakhouseHighYieldInstant.mainnet.Ethereum,
    ERC4626_morphoClearstarInstitutionalUsdc_Ethereum:
      erc4626VaultAddresses.morphoClearstarInstitutionalUsdc.mainnet.Ethereum,
    ERC4626_morphoClearstarUsdcReactor_Ethereum:
      erc4626VaultAddresses.morphoClearstarUsdcReactor.mainnet.Ethereum,
    ERC4626_morphoAlphaUsdcCore_Ethereum:
      erc4626VaultAddresses.morphoAlphaUsdcCore.mainnet.Ethereum,
    ERC4626_morphoResolvUsdc_Ethereum:
      erc4626VaultAddresses.morphoResolvUsdc.mainnet.Ethereum,
    ERC4626_morphoGauntletUsdcFrontier_Ethereum:
      erc4626VaultAddresses.morphoGauntletUsdcFrontier.mainnet.Ethereum,
    ERC4626_morphoHyperithmUsdcMidcurve_Ethereum:
      erc4626VaultAddresses.morphoHyperithmUsdcMidcurve.mainnet.Ethereum,
    ERC4626_morphoHyperithmUsdcDegen_Ethereum:
      erc4626VaultAddresses.morphoHyperithmUsdcDegen.mainnet.Ethereum,
    ERC4626_morphoGauntletUsdcCore_Ethereum:
      erc4626VaultAddresses.morphoGauntletUsdcCore.mainnet.Ethereum,
  },
  Optimism: {
    aavePool: aaveAddresses.mainnet.Optimism,
    compound: compoundAddresses.mainnet.Optimism,
    compoundRewardsController:
      compoundRewardsControllerAddresses.mainnet.Optimism,
    depositFactory: depositFactoryAddresses.mainnet.Optimism,
    factory: factoryAddresses.mainnet.Optimism,
    gateway: gatewayAddresses.mainnet.Optimism,
    gasService: gasServiceAddresses.mainnet.Optimism,
    usdc: usdcAddresses.mainnet.Optimism,
    tokenMessenger: mainnetTokenMessenger['OP Mainnet'].Address,
    aaveUSDC: aaveUsdcAddresses.mainnet.Optimism,
    aaveRewardsController: aaveRewardsControllerAddresses.mainnet.Optimism,
    Beefy_compoundUsdc_Optimism:
      beefyVaultAddresses.compoundUsdc.mainnet.Optimism,
  },
  Arbitrum: {
    aavePool: aaveAddresses.mainnet.Arbitrum,
    compound: compoundAddresses.mainnet.Arbitrum,
    compoundRewardsController:
      compoundRewardsControllerAddresses.mainnet.Arbitrum,
    depositFactory: depositFactoryAddresses.mainnet.Arbitrum,
    factory: factoryAddresses.mainnet.Arbitrum,
    gateway: gatewayAddresses.mainnet.Arbitrum,
    gasService: gasServiceAddresses.mainnet.Arbitrum,
    usdc: usdcAddresses.mainnet.Arbitrum,
    tokenMessenger: mainnetTokenMessenger.Arbitrum.Address,
    aaveUSDC: aaveUsdcAddresses.mainnet.Arbitrum,
    aaveRewardsController: aaveRewardsControllerAddresses.mainnet.Arbitrum,
    Beefy_compoundUsdc_Arbitrum:
      beefyVaultAddresses.compoundUsdc.mainnet.Arbitrum,
  },
  Base: {
    aavePool: aaveAddresses.mainnet.Base,
    compound: compoundAddresses.mainnet.Base,
    compoundRewardsController: compoundRewardsControllerAddresses.mainnet.Base,
    depositFactory: depositFactoryAddresses.mainnet.Base,
    factory: factoryAddresses.mainnet.Base,
    gateway: gatewayAddresses.mainnet.Base,
    gasService: gasServiceAddresses.mainnet.Base,
    usdc: usdcAddresses.mainnet.Base,
    tokenMessenger: mainnetTokenMessenger.Base.Address,
    aaveUSDC: aaveUsdcAddresses.mainnet.Base,
    aaveRewardsController: aaveRewardsControllerAddresses.mainnet.Base,
    Beefy_morphoSeamlessUsdc_Base:
      beefyVaultAddresses.morphoSeamlessUsdc.mainnet.Base,
  },
};
harden(mainnetContracts);

/** @see {@link https://developers.circle.com/cctp/v1/evm-smart-contracts#testnet-contract-addresses} */
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
    depositFactory: depositFactoryAddresses.testnet.Avalanche,
    factory: factoryAddresses.testnet.Avalanche,
    gateway: gatewayAddresses.testnet.Avalanche,
    gasService: gasServiceAddresses.testnet.Avalanche,
    usdc: usdcAddresses.testnet.Avalanche,
    tokenMessenger: testnetTokenMessenger['Avalanche Fuji'].Address,
    aaveUSDC: aaveUsdcAddresses.testnet.Avalanche,
    aaveRewardsController: aaveRewardsControllerAddresses.testnet.Avalanche,
  },
  Base: {
    aavePool: aaveAddresses.testnet.Base,
    compound: compoundAddresses.testnet.Base,
    compoundRewardsController: compoundRewardsControllerAddresses.testnet.Base,
    depositFactory: depositFactoryAddresses.testnet.Base,
    factory: factoryAddresses.testnet.Base,
    gateway: gatewayAddresses.testnet.Base,
    gasService: gasServiceAddresses.testnet.Base,
    usdc: usdcAddresses.testnet.Base,
    tokenMessenger: testnetTokenMessenger['Base Sepolia'].Address,
    aaveUSDC: aaveUsdcAddresses.testnet.Base,
    aaveRewardsController: aaveRewardsControllerAddresses.testnet.Base,
  },
  Ethereum: {
    aavePool: aaveAddresses.testnet.Ethereum,
    compound: compoundAddresses.testnet.Ethereum,
    compoundRewardsController:
      compoundRewardsControllerAddresses.testnet.Ethereum,
    depositFactory: depositFactoryAddresses.testnet.Ethereum,
    factory: factoryAddresses.testnet.Ethereum,
    gateway: gatewayAddresses.testnet.Ethereum,
    gasService: gasServiceAddresses.testnet.Ethereum,
    usdc: usdcAddresses.testnet.Ethereum,
    tokenMessenger: testnetTokenMessenger['Ethereum Sepolia'].Address,
    aaveUSDC: aaveUsdcAddresses.testnet.Ethereum,
    aaveRewardsController: aaveRewardsControllerAddresses.testnet.Ethereum,
    ERC4626_vaultU2_Ethereum: erc4626VaultAddresses.vaultU2.testnet.Ethereum,
  },
  Optimism: {
    aavePool: aaveAddresses.testnet.Optimism,
    compound: compoundAddresses.testnet.Optimism,
    compoundRewardsController:
      compoundRewardsControllerAddresses.testnet.Optimism,
    depositFactory: depositFactoryAddresses.testnet.Optimism,
    factory: factoryAddresses.testnet.Optimism,
    gateway: gatewayAddresses.testnet.Optimism,
    gasService: gasServiceAddresses.testnet.Optimism,
    usdc: usdcAddresses.testnet.Optimism,
    tokenMessenger: testnetTokenMessenger['OP Sepolia'].Address,
    aaveUSDC: aaveUsdcAddresses.testnet.Optimism,
    aaveRewardsController: aaveRewardsControllerAddresses.testnet.Optimism,
  },
  Arbitrum: {
    aavePool: aaveAddresses.testnet.Arbitrum,
    compound: compoundAddresses.testnet.Arbitrum,
    compoundRewardsController:
      compoundRewardsControllerAddresses.testnet.Arbitrum,
    depositFactory: depositFactoryAddresses.testnet.Arbitrum,
    factory: factoryAddresses.testnet.Arbitrum,
    gateway: gatewayAddresses.testnet.Arbitrum,
    gasService: gasServiceAddresses.testnet.Arbitrum,
    usdc: usdcAddresses.testnet.Arbitrum,
    tokenMessenger: testnetTokenMessenger['Arbitrum Sepolia'].Address,
    aaveUSDC: aaveUsdcAddresses.testnet.Arbitrum,
    aaveRewardsController: aaveRewardsControllerAddresses.testnet.Arbitrum,
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
export const axelarConfig = harden({
  Arbitrum: {
    axelarId: AxelarChainIdMap.Arbitrum.mainnet,
    chainInfo: {
      namespace: 'eip155',
      reference: '42161',
      cctpDestinationDomain: 3,
    },
    contracts: { ...mainnetContracts.Arbitrum },
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
  Base: {
    axelarId: AxelarChainIdMap.Base.mainnet,
    chainInfo: {
      namespace: 'eip155',
      reference: '8453',
      cctpDestinationDomain: 6,
    },
    contracts: { ...mainnetContracts.Base },
  },
  Ethereum: {
    axelarId: AxelarChainIdMap.Ethereum.mainnet,
    chainInfo: {
      namespace: 'eip155',
      reference: '1',
      cctpDestinationDomain: 0,
    },
    contracts: { ...mainnetContracts.Ethereum },
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
});

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
export const axelarConfigTestnet = harden({
  Arbitrum: {
    axelarId: AxelarChainIdMap.Arbitrum.testnet,
    chainInfo: {
      namespace: 'eip155',
      reference: '421614',
      cctpDestinationDomain: 3,
    },
    contracts: { ...testnetContracts.Arbitrum },
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
  Base: {
    axelarId: AxelarChainIdMap.Base.testnet,
    chainInfo: {
      namespace: 'eip155',
      reference: '84532',
      cctpDestinationDomain: 6,
    },
    contracts: { ...testnetContracts.Base },
  },
  Ethereum: {
    axelarId: AxelarChainIdMap.Ethereum.testnet,
    chainInfo: {
      namespace: 'eip155',
      reference: '11155111',
      cctpDestinationDomain: 0,
    },
    contracts: { ...testnetContracts.Ethereum },
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
});

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
export const gmpAddresses = harden({
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
});
