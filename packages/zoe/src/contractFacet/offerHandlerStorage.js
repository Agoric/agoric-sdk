// @ts-check

import { makeWeakStore as makeNonVOWeakStore } from '@agoric/store';

import { makeHandle } from '../makeHandle';

export const makeOfferHandlerStorage = () => {
  /** @type {WeakStore<InvitationHandle, OfferHandler>} */
  const invitationHandleToHandler = makeNonVOWeakStore(
    'invitationHandle',
    { passableOnly: false }, // TODO transitional until we have far functions
  );

  /** @type {(offerHandler: OfferHandler) => InvitationHandle} */
  const storeOfferHandler = offerHandler => {
    const invitationHandle = makeHandle('Invitation');
    invitationHandleToHandler.init(invitationHandle, offerHandler);
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
