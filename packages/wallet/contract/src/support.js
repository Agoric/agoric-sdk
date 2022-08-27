// @ts-check

import { buildRootObject } from '@agoric/wallet-backend/src/wallet.js';
import { E } from '@endo/far';

/**
 * @param {ERef<import('@agoric/vats/src/vat-bank.js').Bank>} bank
 * @param {{
 * agoricNames: ERef<NameHub>,
 * board: ERef<Board>,
 * cacheStorageNode: ERef<StorageNode>,
 * myAddressNameAdmin: ERef<MyAddressNameAdmin>,
 * namesByAddress: ERef<NameHub>,
 * zoe: ERef<ZoeService>,
 * }} terms
 */
export async function makeWallet(bank, terms) {
  // TODO drop this wallet-backend legacy and make a SmartWallet object within this package
  // A dapp will be built for either agsolo/wallet-backend OR for smart-wallet
  const legacyRootObject = buildRootObject();
  await legacyRootObject.startup(terms);
  return E(legacyRootObject).getWallet(bank);
}
