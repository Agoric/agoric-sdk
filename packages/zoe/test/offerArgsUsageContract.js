/** @param {ZCF} zcf */
const start = zcf => {
  /** @type {OfferHandler} */
  const handler = (_seat, offerArgs) => {
    // @ts-expect-error xxx HandleOffer
    assert.typeof(offerArgs.myArg, 'string');
    // @ts-expect-error xxx HandleOffer
    return offerArgs.myArg;
  };
  const creatorInvitation = zcf.makeInvitation(handler, 'creatorInvitation');
  return harden({ creatorInvitation });
};
harden(start);
export { start };
