import harden from '@agoric/harden';

import { makeSeatConfigMaker } from '@agoric/ertp/core/config/seatConfig';
import { makeMint } from '@agoric/ertp/core/mint';

/**
 * `makeSeatMint` creates an instance of the seatMint with an
 * associated WeakMap mapping handles (represented by unique,
 * unforgeable empty objects) to use objects
 */
const makeSeatMint = (description = 'seats') => {
  const handleToSeat = new WeakMap();

  const addUseObj = (handle, useObj) => {
    handleToSeat.set(handle, useObj);
  };

  const makeUseObj = seatExtent => {
    return harden(handleToSeat.get(seatExtent.handle));
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
