import harden from '@agoric/harden';

import { makeSeatConfigMaker } from './config/seatConfig';
import { makeMint } from './mint';

/**
 * `makeSeatMint` creates an instance of the seatMint with an
 * associated WeakMap mapping ids (represented by unique empty
 * objects) to use objects
 */
const makeSeatMint = (description = 'seats') => {
  const idObjsToSeats = new WeakMap();

  const addUseObj = (idObj, useObj) => {
    idObjsToSeats.set(idObj, useObj);
  };

  const makeUseObj = seatExtent => {
    return harden(idObjsToSeats.get(seatExtent.id));
  };

  const paymentMakeUseAndBurn = async (assay, payment) => {
    const { extent } = payment.getBalance();
    if (extent === null) {
      throw new Error('the payment is empty or already used');
    }
    const useObj = makeUseObj(extent);
    await assay.burnAll(payment);
    return useObj;
  };

  // Note that we can't burn the underlying purse, we can only empty
  // it and burn the payment we withdraw.
  const purseMakeUseAndBurn = async (assay, purse) => {
    const { extent } = purse.getBalance();
    if (extent === null) {
      throw new Error('the purse is empty or already used');
    }
    const useObj = makeUseObj(extent);
    const payment = purse.withdrawAll();
    await assay.burnAll(payment);
    return useObj;
  };

  const makeSeatConfig = makeSeatConfigMaker(
    paymentMakeUseAndBurn,
    purseMakeUseAndBurn,
  );

  const seatMint = makeMint(description, makeSeatConfig);
  const seatAssay = seatMint.getAssay();

  return harden({
    seatMint,
    seatAssay,
    addUseObj,
  });
};

harden(makeSeatMint);

export { makeSeatMint };
