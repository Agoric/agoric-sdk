/**
 * @typedef {`0x${string}`} HexAddress
 * @typedef {Record<string, Record<string, HexAddress>>} EvmVaultAddressesMap
 * @typedef {{ mainnet: EvmVaultAddressesMap, testnet: EvmVaultAddressesMap }} VaultAddressesMap
 */

/** @type {VaultAddressesMap} */
export const beefyVaults = {
  mainnet: {
    Avalanche: {
      re7: '0xdA640bE4588C469C9DB45D082B36913490924c08', // Beefy Vault for RE7 on Avalanche
    },
  },
  testnet: {},
};
