// @jessie-check

import { makeScalarWeakMapStore } from '@agoric/store';
import { ToFarFunction } from '@endo/marshal';
import { canBeDurable, provideDurableWeakMapStore } from '@agoric/vat-data';

import { defineDurableHandle } from '../makeHandle.js';

/**
 * The following should work. But for some reason, @endo/errors does
 * not export the type `Details`.
 * See https://github.com/endojs/endo/issues/2339
 *
 * at-import {Details} from '@endo/errors'
 *
 * In the meantime...
 *
 * @typedef {string | {}} Details
 */

/**
 * @import {RemotableBrand} from '@endo/eventual-send';
 * @import {RemotableObject} from '@endo/pass-style';
 */

/**
 * @typedef {RemotableBrand & RemotableObject & OfferHandler} PassableOfferHandler
 */

export const makeOfferHandlerStorage = zcfBaggage => {
  const makeInvitationHandle = defineDurableHandle(zcfBaggage, 'Invitation');
  /** @type {WeakMapStore<InvitationHandle, PassableOfferHandler>} */

  // ZCF needs to ephemerally hold on to ephemeral handlers, and durably hold
  // onto handlers that are intended to be durable. We keep two stores and store
  // each handler in the right one. When retrieving, we look for them in both.
  // If Zoe restarts, the ephemeral ones will be lost, and the durable ones will
  // survive.
  const invitationHandleToEphemeralHandler = makeScalarWeakMapStore(
    'invitationHandleToEphemeralHandler',
  );
  /** @type {WeakMapStore<InvitationHandle, PassableOfferHandler>} */
  const invitationHandleToDurableHandler = provideDurableWeakMapStore(
    zcfBaggage,
    'invitationHandleToDurableHandler',
  );

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
