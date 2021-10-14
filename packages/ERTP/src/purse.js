import { makeNotifierKit } from '@agoric/notifier';
import { makeFarMaker } from '@agoric/marshal';
import { AmountMath } from './amountMath.js';

export const makeEmptyPurseMaker = (
  allegedName,
  assetKind,
  brand,
  purseMethods,
) => {
  let currentBalance = AmountMath.makeEmpty(brand, assetKind);

  /** @type {NotifierRecord<Amount>} */
  const {
    notifier: balanceNotifier,
    updater: balanceUpdater,
  } = makeNotifierKit(currentBalance);

  const updatePurseBalance = newPurseBalance => {
    currentBalance = newPurseBalance;
    balanceUpdater.updateState(currentBalance);
  };

  const makePurseImpl = makeFarMaker(`${allegedName} purse`);

  const makeDepositFacetImpl = makeFarMaker(`${allegedName} depositFacet`);

  const makeEmptyPurse = () => {
    /** @type {Purse} */
    const purse = makePurseImpl({
      deposit: (srcPayment, optAmount = undefined) => {
        // Note COMMIT POINT within deposit.
        return purseMethods.deposit(
          currentBalance,
          updatePurseBalance,
          srcPayment,
          optAmount,
        );
      },
      withdraw: amount =>
        // Note COMMIT POINT within withdraw.
        purseMethods.withdraw(currentBalance, updatePurseBalance, amount),
      getCurrentAmount: () => currentBalance,
      getCurrentAmountNotifier: () => balanceNotifier,
      getAllegedBrand: () => brand,
      // eslint-disable-next-line no-use-before-define
      getDepositFacet: () => depositFacet,
    });

    const depositFacet = makeDepositFacetImpl({
      receive: purse.deposit,
    });

    return purse;
  };
  return makeEmptyPurse;
};
