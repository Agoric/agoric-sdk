// @ts-check
// @jessie-check

/**
 * @file
 *
 *   Some of this config info may make more sense in a particular package. However
 *   due to https://github.com/Agoric/agoric-sdk/issues/4620 and our lax package
 *   dependency graph, sometimes rational placements cause type resolution
 *   errors.
 *
 *   So as a work-around some constants that need access from more than one
 *   package are placed here.
 */

/**
 * ClusterName specifies a collection of networks. The specific networks
 * associated with a particular name may vary from context to context, and may
 * also overlap (e.g. a "local" cluster may connect to the same remote networks
 * as a "testnet" cluster), but this type nevertheless supports cross-package
 * coordination where the values associated with static labels are subject to
 * choice of cluster. Some examples:
 *
 * - the chain ID for a static label like "Agoric" or "Ethereum"
 * - the cryptographic hash for a static label like "BLD" or "USDC"
 * - the URL for a service like "Agoric RPC" or "Axelar" or "Spectrum"
 *
 * "mainnet" should always include the Agoric network described by
 * https://main.agoric.net/network-config rather than some other alternative.
 *
 * XXX This actually belongs somewhere else, possibly with refactoring.
 * https://github.com/Agoric/agoric-sdk/pull/12185#discussion_r2500123226
 *
 * @typedef {'local' | 'testnet' | 'mainnet'} ClusterName
 */

/**
 * Event source ids used by the bridge device.
 *
 * @enum {(typeof BridgeId)[keyof typeof BridgeId]}
 */
export const BridgeId = /** @type {const} */ ({
  BANK: 'bank',
  CORE: 'core',
  DIBC: 'dibc',
  STORAGE: 'storage',
  PROVISION: 'provision',
  PROVISION_SMART_WALLET: 'provisionWallet',
  VLOCALCHAIN: 'vlocalchain',
  VTRANSFER: 'vtransfer',
  WALLET: 'wallet',
});
harden(BridgeId);

/** @satisfies {Record<string, BridgeId>} */
export const CosmosInitKeyToBridgeId = {
  vbankPort: 'bank',
  vibcPort: 'dibc',
};
harden(CosmosInitKeyToBridgeId);

export const WalletName = /** @type {const} */ ({
  depositFacet: 'depositFacet',
});
harden(WalletName);

// defined in golang/cosmos/x/vbank
export const VBankAccount = /** @type {const} */ ({
  reserve: {
    module: 'vbank/reserve',
    address: 'agoric1ae0lmtzlgrcnla9xjkpaarq5d5dfez63h3nucl',
  },
  provision: {
    module: 'vbank/provision',
    address: 'agoric1megzytg65cyrgzs6fvzxgrcqvwwl7ugpt62346',
  },
});
harden(VBankAccount);
