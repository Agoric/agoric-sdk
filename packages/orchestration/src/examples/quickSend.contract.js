import { Far } from '@endo/far';

/**
 * @import {Baggage} from '@agoric/vat-data';
 */

/**
 * @param {ZCF} zcf
 * @param {{}} privateArgs
 * @param {Baggage} baggage
 * @returns
 */
export const start = (zcf, privateArgs, baggage) => {
  /** @type {OfferHandler} */
  const handler = Far('OfferHandler', {
    handle: seat => {
      seat.exit();
      return 'TODO';
    },
  });

  harden(handler);
  return harden({
    publicFacet: Far('QuickSend API', {
      makeInvitation: () => zcf.makeInvitation(handler, 'request destination'),
    }),
  });
};
harden(start);
