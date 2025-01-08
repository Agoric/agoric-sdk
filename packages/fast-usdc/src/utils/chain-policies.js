/** @import {ChainPolicy} from '../types.js'; */

/** @satisfies {Record<'MAINNET'| 'TESTNET', Record<string, ChainPolicy>>} */
export const ChainPolicies = /** @type {const} */ ({
  MAINNET: {
    Arbitrum: {
      attenuatedCttpBridgeAddress: '0xe298b93ffB5eA1FB628e0C0D55A43aeaC268e347',
      cctpTokenMessengerAddress: '0x19330d10D9Cc8751218eaf51E8885D058642E08A',
      chainId: 42161,
      confirmations: 2, // TODO placeholder
    },
    Base: {
      attenuatedCttpBridgeAddress: '0xB6615B2662b35fc3533F8479002e62D0523341De',
      cctpTokenMessengerAddress: '0x1682Ae6375C4E4A97e4B583BC394c861A46D8962',
      chainId: 8453,
      confirmations: 2, // TODO placeholder
    },
    Ethereum: {
      attenuatedCttpBridgeAddress: '0xBC8552339dA68EB65C8b88B414B5854E0E366cFc',
      cctpTokenMessengerAddress: '0xBd3fa81B58Ba92a82136038B25aDec7066af3155',
      chainId: 1,
      confirmations: 2, // TODO placeholder
    },
    Optimism: {
      attenuatedCttpBridgeAddress: '0x48C5417ED570928eC85D5e3AD4e7E0EeD7dB1E2A',
      cctpTokenMessengerAddress: '0x2B4069517957735bE00ceE0fadAE88a26365528f',
      chainId: 10,
      confirmations: 2, // TODO placeholder
    },
    Polygon: {
      attenuatedCttpBridgeAddress: '0x32cb9574650AFF312c80edc4B4343Ff5500767cA',
      cctpTokenMessengerAddress: '0x9daF8c91AEFAE50b9c0E69629D3F6Ca40cA3B3FE',
      chainId: 137,
      confirmations: 2, // TODO placeholder
    },
  },
  TESTNET: {
    // Arbitrum Sepolia
    Arbitrum: {
      attenuatedCttpBridgeAddress: '0xTODO',
      cctpTokenMessengerAddress: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
      chainId: 421614,
      confirmations: 2, // TODO placeholder
    },
    // Base Sepolia
    Base: {
      attenuatedCttpBridgeAddress: '0xTODO',
      cctpTokenMessengerAddress: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
      chainId: 84532,
      confirmations: 2, // TODO placeholder
    },
    // Ethereum Sepolia
    Ethereum: {
      attenuatedCttpBridgeAddress: '0xTODO',
      cctpTokenMessengerAddress: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
      chainId: 11155111,
      confirmations: 2, // TODO placeholder
    },
    // OP Sepolia
    Optimism: {
      attenuatedCttpBridgeAddress: '0xTODO',
      cctpTokenMessengerAddress: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
      chainId: 11155420,
      confirmations: 2, // TODO placeholder
    },
    // Polygon PoS Amoy
    Polygon: {
      attenuatedCttpBridgeAddress: '0xTODO',
      cctpTokenMessengerAddress: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
      chainId: 80002,
      confirmations: 2, // TODO placeholder
    },
  },
});
harden(ChainPolicies);
