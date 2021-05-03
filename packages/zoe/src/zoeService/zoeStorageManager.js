// @ts-check

import { MathKind, makeIssuerKit } from '@agoric/ertp';
import { Far } from '@agoric/marshal';

import './types';
import './internal-types';

import { makeIssuerStorage } from '../issuerStorage';
import { makeAndStoreInstanceRecord } from '../instanceRecordStorage';
import { makeIssuerRecord } from '../issuerRecord';
import { makeEscrowStorage } from './escrowStorage';

export const makeZoeStorageManager = () => {
  const issuerStorage = makeIssuerStorage();
  const escrowStorage = makeEscrowStorage();

  const makeZoeInstanceStorageManager = async (
    installation,
    customTerms,
    uncleanIssuerKeywordRecord,
  ) => {
    const { issuers, brands } = await issuerStorage.storeIssuerKeywordRecord(
      uncleanIssuerKeywordRecord,
    );
    Object.entries(issuers).forEach(([keyword, issuer]) =>
      escrowStorage.createPurse(issuer, brands[keyword]),
    );

    const instanceRecordManager = makeAndStoreInstanceRecord(
      installation,
      customTerms,
      issuers,
      brands,
    );

    /** @type {SaveIssuer} */
    const saveIssuer = async (issuerP, keyword) => {
      const issuerRecord = await issuerStorage.storeIssuer(issuerP);
      escrowStorage.createPurse(issuerRecord.issuer, issuerRecord.brand);
      instanceRecordManager.addIssuerToInstanceRecord(keyword, issuerRecord);
      return issuerRecord;
    };

    /** @type {MakeZoeMint} */
    const makeZoeMint = (
      keyword,
      amountMathKind = MathKind.NAT,
      displayInfo,
    ) => {
      // Local indicates one that zoe itself makes from vetted code,
      // and so can be assumed correct and fresh by zoe.
      const {
        mint: localMint,
        issuer: localIssuer,
        brand: localBrand,
      } = makeIssuerKit(keyword, amountMathKind, displayInfo);
      const localIssuerRecord = makeIssuerRecord(
        localBrand,
        localIssuer,
        amountMathKind,
        displayInfo,
      );
      issuerStorage.storeIssuerRecord(localIssuerRecord);
      const localPooledPurse = escrowStorage.makeLocalPurse(
        localIssuerRecord.issuer,
        localIssuerRecord.brand,
      );
      instanceRecordManager.addIssuerToInstanceRecord(
        keyword,
        localIssuerRecord,
      );
      /** @type {ZoeMint} */
      const zoeMint = Far('ZoeMint', {
        getIssuerRecord: () => {
          return localIssuerRecord;
        },
        mintAndEscrow: totalToMint => {
          const payment = localMint.mintPayment(totalToMint);
          localPooledPurse.deposit(payment, totalToMint);
        },
        withdrawAndBurn: totalToBurn => {
          const payment = localPooledPurse.withdraw(totalToBurn);
          localIssuer.burn(payment, totalToBurn);
        },
      });
      return zoeMint;
    };

    /** @returns {ExportedIssuerStorage} */
    const exportIssuerStorage = () =>
      issuerStorage.exportIssuerStorage(
        Object.values(instanceRecordManager.getInstanceRecord().terms.issuers),
      );

    return harden({
      getTerms: instanceRecordManager.getTerms,
      getIssuers: instanceRecordManager.getIssuers,
      getBrands: instanceRecordManager.getBrands,
      saveIssuer,
      makeZoeMint,
      exportInstanceRecord: instanceRecordManager.getInstanceRecord,
      exportIssuerStorage,
      withdrawPayments: escrowStorage.withdrawPayments,
    });
  };

  return {
    makeZoeInstanceStorageManager,
    getMathKindByBrand: issuerStorage.getMathKindByBrand,
    depositPayments: escrowStorage.depositPayments,
  };
};
