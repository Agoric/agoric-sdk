/**
 * @typedef {`0x${string}`} HexAddress
 * @typedef {Record<string, Record<string, HexAddress>>} EvmVaultAddressesMap
 * @typedef {{ mainnet: EvmVaultAddressesMap, testnet: EvmVaultAddressesMap }} VaultAddressesMap
 */

/** @type {VaultAddressesMap} */
export const yearnVaults = {
  mainnet: {
    Ethereum: {
      usdc: '0xa354F35829Ae975e850e23e9615b11Da1B3dC4DE',
    },
  },
  testnet: {},
};
