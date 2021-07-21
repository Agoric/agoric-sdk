// @ts-check

import { makeScalarWeakMap } from '@agoric/store';
import { ToFarFunction } from '@agoric/marshal';

import { makeHandle } from '../makeHandle';

export const makeOfferHandlerStorage = () => {
  /** @type {StoreWeakMap<InvitationHandle, OfferHandler>} */
  const invitationHandleToHandler = makeScalarWeakMap('invitationHandle');

  /** @type {(offerHandler: OfferHandler) => InvitationHandle} */
  const storeOfferHandler = offerHandler => {
    const farOfferHandler = ToFarFunction('offerHandler', offerHandler);
    const invitationHandle = makeHandle('Invitation');
    invitationHandleToHandler.init(invitationHandle, farOfferHandler);
    return invitationHandle;
  };

  /** @type {(invitationHandle: InvitationHandle) => OfferHandler} */
  const takeOfferHandler = invitationHandle => {
    const offerHandler = invitationHandleToHandler.get(invitationHandle);
    invitationHandleToHandler.delete(invitationHandle);
    return offerHandler;
  };

  return harden({
    storeOfferHandler,
    takeOfferHandler,
  });
};
