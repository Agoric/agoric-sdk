// @ts-check

import { E } from '@agoric/eventual-send';

/**
 * @param { ContractFacet } zcf
 */
export function makeEmptyOfferWithResult(zcf) {
  const invitation = zcf.makeInvitation(_ => undefined, 'EmptyOffer');
  const zoe = zcf.getZoeService();
  return E(zoe).offer(invitation); // Promise<OfferResultRecord>,
}
