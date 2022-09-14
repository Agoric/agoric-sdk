// @ts-check
import { boardSlottingMarshaller, storageHelper } from './rpc.js';

/**
 * @param {string} addr
 * @param {import('./rpc').IdMap} ctx
 * @param {object} io
 * @param {import('./rpc.js').VStorage} io.vstorage
 */
export const getWalletState = async (addr, ctx, { vstorage }) => {
  const capDataStrings = await vstorage.readAll(`published.wallet.${addr}`);
  assert(capDataStrings?.length, 'readAll returned empty');
  const capDatas = storageHelper.parseMany(capDataStrings);

  // XXX very similar to `coalesceUpdates` util

  /** @type {Map<number, import('./psm').OfferSpec>} */
  const offers = new Map();
  /** @type {Map<Brand, Amount>} */
  const balances = new Map();
  /** @type {import('./format').AssetDescriptor[]} */
  const brands = [];
  const mm = boardSlottingMarshaller(ctx.convertSlotToVal);
  capDatas.forEach(capData => {
    /** @type import('@agoric/smart-wallet/src/smartWallet').UpdateRecord */
    const update = mm.unserialize(capData);
    console.warn('wallet update', update);
    assert(update.updated, 'missing key: updated');
    switch (update.updated) {
      case 'offerStatus': {
        const { status } = update;
        if (!offers.has(status.id)) {
          offers.set(status.id, status);
        }
        break;
      }
      case 'balance': {
        const { currentAmount } = update;
        if (!balances.has(currentAmount.brand)) {
          balances.set(currentAmount.brand, currentAmount);
        }
        break;
      }
      case 'brand': {
        // @ts-expect-error cast for unserialization hack
        brands.push(update.descriptor);
        break;
      }
      default:
        // @ts-expect-error
        throw Error(`unsupported update ${update.updated}`);
    }
  });
  return { balances, brands, offers };
};
