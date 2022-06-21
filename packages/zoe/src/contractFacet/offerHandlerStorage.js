// @ts-check

import { makeWeakStore } from '@agoric/store';
import { ToFarFunction } from '@endo/marshal';
import { makeScalarBigMapStore } from '@agoric/vat-data';

import { defineDurableHandle } from '../makeHandle.js';

export const makeOfferHandlerStorage = (
  zcfBaggage = makeScalarBigMapStore('zcfBaggage', { durable: true }),
) => {
  const makeInvitationHandle = defineDurableHandle(zcfBaggage, 'Invitation');
  /** @type {WeakStore<InvitationHandle, OfferHandler>} */
  // TODO(MSM): we need to manage durable offerHandlers
  const invitationHandleToHandler = makeWeakStore('invitationHandle');

  /** @type {(offerHandler: OfferHandler) => InvitationHandle} */
  const storeOfferHandler = offerHandler => {
    const farOfferHandler = ToFarFunction('offerHandler', offerHandler);
    const invitationHandle = makeInvitationHandle();
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
