// @ts-check
import { assertHasData } from '@agoric/smart-wallet/src/utils.js';
import { E } from '@endo/eventual-send';

/** @typedef {import('@agoric/smart-wallet/src/types.js').Petname} Petname */

/**
 * @typedef {{
 *  brand?: Brand,
 *  brandPetname?: Petname,
 *  currentAmount: Amount,
 *  pursePetname?: Petname,
 *  displayInfo?: DisplayInfo,
 * }} PurseInfo
 */

export const fetchCurrent = async currentFollower => {
  await assertHasData(currentFollower);
  const latestIterable = await E(currentFollower).getLatestIterable();
  const iterator = latestIterable[Symbol.asyncIterator]();
  const latest = await iterator.next();

  /** @type {import('@agoric/casting').ValueFollowerElement<import('@agoric/smart-wallet/src/smartWallet').CurrentWalletRecord>} */
  const currentEl = latest.value;
  const wallet = currentEl.value;
  const { offerToPublicSubscriberPaths } = wallet;

  /** @type {Map<Brand, PurseInfo>} */
  const brandToPurse = new Map();
  for (const purse of wallet.purses) {
    const brandDescriptor = wallet.brands.find(bd => purse.brand === bd.brand);
    assert(brandDescriptor, `missing descriptor for brand ${purse.brand}`);
    /** @type {PurseInfo} */
    const purseInfo = {
      brand: purse.brand,
      currentAmount: purse.balance,
      brandPetname: brandDescriptor.petname,
      pursePetname: brandDescriptor.petname,
      displayInfo: brandDescriptor.displayInfo,
    };
    brandToPurse.set(purse.brand, purseInfo);
  }

  return {
    blockHeight: currentEl.blockHeight,
    brandToPurse,
    offerToPublicSubscriberPaths,
  };
};
