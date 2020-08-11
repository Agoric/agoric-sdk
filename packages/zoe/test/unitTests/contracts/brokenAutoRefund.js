// @ts-check

/**
 * This is a a broken contact to test zoe's error handling
 * @type {ContractStartFn}
 */
const start = zcf => {
  const refund = seat => {
    seat.exit();
    return `The offer was accepted`;
  };
  const makeRefundInvite = () => zcf.makeInvitation(refund, 'getRefund');
  // should be makeRefundInvite(). Intentionally wrong to provoke an error.
  return { creatorInvitation: makeRefundInvite };
};

harden(start);
export { start };
