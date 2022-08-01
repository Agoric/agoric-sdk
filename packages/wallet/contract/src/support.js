// @ts-check

import { buildRootObject } from '@agoric/wallet-backend/src/wallet';
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
  const legacyRootObject = buildRootObject();
  await legacyRootObject.startup(terms);
  return E(legacyRootObject).getWallet(bank);
}
