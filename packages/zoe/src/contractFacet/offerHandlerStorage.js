// @ts-check

import { makeWeakStore } from '@agoric/store';
import { ToFarFunction } from '@endo/marshal';

import { makeHandle } from '../makeHandle.js';

export const makeOfferHandlerStorage = () => {
  /** @type {WeakStore<InvitationHandle, OfferHandler>} */
  const invitationHandleToHandler = makeWeakStore('invitationHandle');

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
