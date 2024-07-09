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
 * Event source ids used by the bridge device.
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
/** @typedef {(typeof BridgeId)[keyof typeof BridgeId]} BridgeIdValue */

export const CosmosInitKeyToBridgeId = {
  vbankPort: BridgeId.BANK,
  vibcPort: BridgeId.DIBC,
};

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
