// const newBrandOutPoolRecord = brandOutPoolRecord.decrementBy(amountOut);
// const newTraderRecord = traderRecord.incrementBy(amountOut);

// const brandInPoolRecordStage2 = brandInPoolRecord.decrementBy(
//   reducedCentralAmount,
// );
// const brandOutPoolRecordStage3 = newBrandOutPoolRecord.incrementBy(
//   reducedCentralAmount,
// );

// const newTraderRecordStage2 = newTraderRecord.decrementBy(reducedAmountIn);
// const brandInPoolRecordStage3 = brandInPoolRecordStage2.incrementBy(
//   reducedAmountIn,
// );

// zcf.reallocate(
//   newTraderRecordStage2,
//   brandInPoolRecordStage3,
//   brandOutPoolRecordStage3,
// );

///
// swapIn secondaryToSecondary
// const swapIn = (escrowAccount, amountIn, brandOut) => {
//   const [poolIn, poolOut, swapper] = await takeSnapshots([poolInReceipt, poolOutReceipt, swapperReceipt])
//   const {
//     amountIn: reducedAmountIn,
//     amountOut,
//     centralAmount: reducedCentralAmount,
//   } = getPriceGivenAvailableInput(amountIn, brandOut);

//   const proposedAllocations = move(poolOut, escrowAccount, amountOut)
//     .move(poolIn, poolOut, reducedCentralAmount)
//     .move(escrowAccount, poolIn, reducedAmountIn);

//   E(zoe).reallocate(...proposedAllocations);
//   swapperReceipt.releaseFunds();
// };

// swapIn secondaryToSecondary

// snapshot, reallocate, releaseFunds
const swapIn = (swapperEA, amountIn, brandOut) => {
  const callback = ([swapperS, poolInS, poolOutS]) => {

    const {
      amountIn: reducedAmountIn,
      amountOut,
      centralAmount: reducedCentralAmount,
    } = getPriceGivenAvailableInput(amountIn, brandOut);
  
    const proposedAllocations = move(poolOutS, swapperS, amountOut)
      .move(poolInS, poolOutS, reducedCentralAmount)
      .move(swapperS, poolInS, reducedAmountIn)
      .end();

    return proposedAllocations;
  };

  const snapshots = await takeSnapshots([swapperEA, poolInEA, poolOutEA]);
  const transferCompleteP = E(zoe).completeTransfer(callback(snapshots));
};
