import { AmountMath } from '@agoric/ertp';
import { makeDurableZone } from '@agoric/zone/durable.js';

/**
 * @param {ZCF} zcf
 * @param {*} _privateArgs
 * @param {MapStore<any, any>} baggage
 */
export const prepare = async (zcf, _privateArgs, baggage) => {
  const zone = makeDurableZone(baggage);

  /** @type {ZCFMint} */
  const zcfMint = baggage.get('myMint');
  const { brand } = zcfMint.getIssuerRecord();

  /** @type {OfferHandler} */
  const offerHandler = seat => {
    const amount = AmountMath.make(brand, 32n);
    zcfMint.mintGains(harden({ Tokens: amount }), seat);
    seat.exit();
    return 'Congratulations, free tokens fur realz!!!';
  };

  return harden({
    publicFacet: zone.exo('PublicFacet', undefined, {
      makeInvitation: () => {
        return zcf.makeInvitation(offerHandler, 'free tokens fur realz');
      },
    }),
  });
};
