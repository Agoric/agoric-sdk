import { AmountMath } from '@agoric/ertp';
import {
  floorMultiplyBy,
  makeRatio,
} from '@agoric/zoe/src/contractSupport/ratio.js';
import { Far } from '@endo/marshal';
import { reverseInterest } from '../../src/interest-math.js';

export const makeCompoundedInterestProvider = brand => {
  let compoundedInterest = makeRatio(100n, brand);
  return {
    getCompoundedInterest: () => compoundedInterest,
    chargeHundredPercentInterest: () => {
      compoundedInterest = makeRatio(
        compoundedInterest.numerator.value * 2n,
        brand,
      );
    },
  };
};
/**
 * @param {VaultId} vaultId
 * @param {Amount<'nat'>} initDebt
 * @param {Amount<'nat'>} [initCollateral]
 * @param {any} [manager]
 * @returns {Vault & { setDebt: (Amount) => void }}
 */

export const makeFakeVault = (
  vaultId,
  initDebt,
  initCollateral = AmountMath.make(initDebt.brand, 100n),
  manager = makeCompoundedInterestProvider(initDebt.brand),
) => {
  let normalizedDebt = reverseInterest(
    initDebt,
    manager.getCompoundedInterest(),
  );
  let collateral = initCollateral;
  const fakeSeat = {};
  const vault = Far('Vault', {
    getCollateralAmount: () => collateral,
    getNormalizedDebt: () => normalizedDebt,
    getCurrentDebt: () =>
      floorMultiplyBy(normalizedDebt, manager.getCompoundedInterest()),
    setDebt: newDebt =>
      (normalizedDebt = reverseInterest(
        newDebt,
        manager.getCompoundedInterest(),
      )),
    setCollateral: newCollateral => (collateral = newCollateral),
    getIdInManager: () => vaultId,
    liquidate: () => {},
    getVaultSeat: () => fakeSeat,
  });
  // @ts-expect-error cast
  return vault;
};
