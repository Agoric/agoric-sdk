// @ts-check

import { Far } from '@agoric/marshal';

const start = zcf => {
  let offersCount = 0n;

  const refund = seat => {
    offersCount += 1n;
    seat.exit();
    return `The offer was accepted`;
  };
  const makeRefundInvitation = () => zcf.makeInvitation(refund, 'getRefund');

  const publicFacet = Far('publicFacet', {
    getOffersCount: () => offersCount,
    makeInvitation: makeRefundInvitation,
  });

  const creatorInvitation = makeRefundInvitation();

  return harden({ creatorInvitation, publicFacet });
};

harden(start);
export { start };
