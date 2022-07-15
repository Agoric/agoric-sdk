// @ts-check

import { makeWeakStore } from '@agoric/store';
import { ToFarFunction } from '@endo/marshal';
import { canBeDurable, provideDurableWeakMapStore } from '@agoric/vat-data';

import { defineDurableHandle } from '../makeHandle.js';

export const makeOfferHandlerStorage = zcfBaggage => {
  const makeInvitationHandle = defineDurableHandle(zcfBaggage, 'Invitation');
  /** @type {WeakStore<InvitationHandle, OfferHandler>} */

  // ZCF needs to ephemerally hold on to ephemeral handlers, and durably hold
  // onto durable handlers. We keep two stores and store each handler in the
  // right one and look for them in both. If Zoe restarts, the ephemeral ones
  // will be lost, and the durable ones will survive.
  const invitationHandleToEphemeralHandler = makeWeakStore(
    'invitationHandleToEphemeralHandler',
  );
  /** @type {WeakStore<InvitationHandle, OfferHandler>} */
  const invitationHandleToDurableHandler = provideDurableWeakMapStore(
    zcfBaggage,
    'invitationHandleToDurableHandler',
  );

  /** @type {(offerHandler: OfferHandler) => InvitationHandle} */
  const storeOfferHandler = offerHandler => {
    if (typeof offerHandler === 'function') {
      offerHandler = ToFarFunction('offerHandler', offerHandler);
    }
    const invitationHandleToHandler = canBeDurable(offerHandler)
      ? invitationHandleToDurableHandler
      : invitationHandleToEphemeralHandler;

    const invitationHandle = makeInvitationHandle();
    invitationHandleToHandler.init(invitationHandle, offerHandler);
    return invitationHandle;
  };

  /**
   * @type {(invitationHandle: InvitationHandle, details?: Details) => OfferHandler}
   */
  const takeOfferHandler = (
    invitationHandle,
    details = 'offerHandler may not have survived upgrade',
  ) => {
    let invitationHandleToHandler;
    if (invitationHandleToDurableHandler.has(invitationHandle)) {
      invitationHandleToHandler = invitationHandleToDurableHandler;
    } else {
      assert(invitationHandleToEphemeralHandler.has(invitationHandle), details);
      invitationHandleToHandler = invitationHandleToEphemeralHandler;
    }
    const offerHandler = invitationHandleToHandler.get(invitationHandle);
    invitationHandleToHandler.delete(invitationHandle);
    return offerHandler;
  };

  return harden({
    storeOfferHandler,
    takeOfferHandler,
  });
};
