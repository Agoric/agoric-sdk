// @ts-check
import { makeWalletStateCoalescer } from '@agoric/smart-wallet/src/utils.js';
import { boardSlottingMarshaller, storageHelper } from './rpc.js';

/**
 * @param {string} addr
 * @param {import('./rpc').IdMap} ctx
 * @param {object} io
 * @param {import('./rpc.js').VStorage} io.vstorage
 * @returns {Promise<import('@agoric/smart-wallet/src/utils.js').CoalescedWalletState>}
 */
export const getWalletState = async (addr, ctx, { vstorage }) => {
  const capDataStrings = await vstorage.readAll(`published.wallet.${addr}`);
  assert(capDataStrings?.length, 'readAll returned empty');
  const capDatas = storageHelper.parseMany(capDataStrings);

  const coalescer = makeWalletStateCoalescer();

  const mm = boardSlottingMarshaller(ctx.convertSlotToVal);
  for (const capData of capDatas) {
    /** @type import('@agoric/smart-wallet/src/smartWallet').UpdateRecord */
    const updateRecord = mm.unserialize(capData);
    console.warn('wallet update', updateRecord);
    coalescer.include(updateRecord);
  }
  return coalescer.state;
};
