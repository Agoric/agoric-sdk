// @ts-check

/** @param {ZCF} zcf */
const start = zcf => {
  /** @type {OfferHandler} */
  const handler = (_seat, offerArgs) => {
    assert.typeof(offerArgs.myArg, 'string');
    return offerArgs.myArg;
  };
  const creatorInvitation = zcf.makeInvitation(handler, 'creatorInvitation');
  return harden({ creatorInvitation });
};
harden(start);
export { start };
