/** @file
 *
 * Some of this config info may make more sense in a particular package. However
 * due to https://github.com/Agoric/agoric-sdk/issues/4620 and our lax package
 * dependency graph, sometimes rational placements cause type resolution errors.
 *
 * So as a work-around some constants that need access from more than one package are placed here.
 */

/**
 * Event source ids used by the bridge device.
 */
export const BridgeId = {
  BANK: 'bank',
  CORE: 'core',
  DIBC: 'dibc',
  STORAGE: 'storage',
  PROVISION: 'provision',
  WALLET: 'wallet',
};
harden(BridgeId);

export const WalletName = {
  depositFacet: 'depositFacet',
};
harden(WalletName);
