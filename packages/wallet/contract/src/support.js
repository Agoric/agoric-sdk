// @ts-check

import { makeHelper } from './wallet.js';

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
  const helper = makeHelper();
  await helper.startup(terms);
  return helper.getWallet(bank);
}
