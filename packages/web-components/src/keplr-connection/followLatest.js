// @ts-check
import { iterateEach } from '@agoric/casting';
import { AmountMath } from '@agoric/ertp';

export const followLatest = async ({startingHeight, latestFollower, updatePurses, brandToPurse}) => {
  for await (const { value } of iterateEach(latestFollower, {
    height: startingHeight,
  })) {
    /** @type {import('@agoric/smart-wallet/src/smartWallet').UpdateRecord} */
    const updateRecord = value;
    switch (updateRecord.updated) {
      case 'brand': {
        const {
          descriptor: { brand, petname, displayInfo },
        } = updateRecord;
        const prior = brandToPurse.get(brand);
        const purseObj = {
          brand,
          brandPetname: petname,
          pursePetname: petname,
          displayInfo,
          currentAmount: prior?.currentAmount || AmountMath.makeEmpty(brand),
        };
        brandToPurse.set(brand, purseObj);
        updatePurses(brandToPurse);
        break;
      }
      case 'balance': {
        const { currentAmount } = updateRecord;
        const purseObj = {
          ...brandToPurse.get(currentAmount.brand),
          currentAmount,
          value: currentAmount.value,
        };
        brandToPurse.set(currentAmount.brand, purseObj);
        updatePurses(brandToPurse);
        break;
      }
      case 'offerStatus': {
        break;
      }
      default: {
        // @ts-expect-error exhaustive switch
        throw Error(`Unknown updateRecord ${updateRecord.updated}`);
      }
    }
  }
};