// @ts-check

import { makePromiseKit } from '@endo/promise-kit';
import { Far } from '@endo/marshal';
import { E } from '@endo/eventual-send';

export const makePaymentActions = ({
  getBrandRecord,
  getPurseByPetname,
  getRecord,
  updateRecord,
  getAutoDepositPurse,
  getIssuerBoardId,
}) => {
  const depositedPK = makePromiseKit();

  return Far('payment actions', {
    deposit: async (purseOrPetname = undefined) => {
      const oldPaymentRecord = getRecord();
      const { brand, payment } = oldPaymentRecord;
      assert(payment);

      /** @type {Purse} */
      let purse;
      if (purseOrPetname === undefined) {
        const autoDepositPurse = getAutoDepositPurse(brand);
        if (!autoDepositPurse) {
          // No automatic purse right now.
          return depositedPK.promise;
        }
        // Plop into the current autodeposit purse.
        purse = getAutoDepositPurse(brand);
      } else if (
        Array.isArray(purseOrPetname) ||
        typeof purseOrPetname === 'string'
      ) {
        purse = getPurseByPetname(purseOrPetname);
      } else {
        purse = purseOrPetname;
      }
      const brandRecord = getBrandRecord(brand);
      updateRecord({ ...oldPaymentRecord, status: 'pending' }, brandRecord);
      // Now try depositing.
      E(purse)
        .deposit(payment)
        .then(
          depositedAmount => {
            updateRecord(
              {
                ...getRecord(),
                // Remove the payment so it can be GCed.
                payment: undefined,
                status: 'deposited',
                depositedAmount,
              },
              brandRecord,
            );
            depositedPK.resolve(depositedAmount);
          },
          e => {
            console.error(
              'Error depositing payment in',
              purseOrPetname || 'default purse',
              e,
            );
            if (purseOrPetname === undefined) {
              // Error in auto-deposit purse, just fail.  They can try
              // again.
              updateRecord({
                ...getRecord(),
                status: undefined,
              });
              depositedPK.reject(e);
            } else {
              // Error in designated deposit, so retry automatically without
              // a designated purse.
              depositedPK.resolve(getRecord().actions.deposit(undefined));
            }
          },
        );
      return depositedPK.promise;
    },
    refresh: async () => {
      const oldPaymentRecord = getRecord();
      const { brand, issuer, payment } = oldPaymentRecord;
      const brandRecord = getBrandRecord(brand);
      if (!brandRecord) {
        return false;
      }

      if (!issuer) {
        updateRecord(
          {
            ...oldPaymentRecord,
            issuerBoardId: getIssuerBoardId(brandRecord.issuer),
          },
          brandRecord,
        );
        return true;
      }

      if (!payment) {
        return false;
      }

      const isLive = await E(issuer).isLive(payment);
      if (isLive) {
        return false;
      }

      updateRecord({
        ...oldPaymentRecord,
        // Remove the payment itself so it can be GCed.
        payment: undefined,
        status: 'expired',
      });
      return true;
    },
    getAmountOf: async () => {
      const oldPaymentRecord = getRecord();
      const { issuer, payment } = oldPaymentRecord;
      assert(issuer);
      assert(payment);

      // Fetch the current amount of the payment.
      const lastAmount = await E(issuer).getAmountOf(payment);

      updateRecord({
        ...oldPaymentRecord,
        lastAmount,
      });
      return true;
    },
  });
};
