import { alienatePayout } from '../../contractSupport/zoeHelpers';

/** @type {ContractStartFn} */
const start = zcf => {
  let currentSeat;

  const initialOfferHandler = firstSeat => {
    currentSeat = firstSeat;
  };
  const creatorInvitation = zcf.makeInvitation(initialOfferHandler, 'initial');

  const creatorFacet = {
    payout: () => currentSeat.exit(),
    makePayoutSellable: () => {
      const { newZCFSeat, newInvitation } = alienatePayout(
        zcf,
        currentSeat,
        'secondary',
      );
      currentSeat = newZCFSeat;
      return newInvitation;
    },
  };

  return harden({ creatorInvitation, creatorFacet });
};
harden(start);
export { start };
