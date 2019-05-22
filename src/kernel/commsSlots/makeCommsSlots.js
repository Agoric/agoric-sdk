import harden from '@agoric/harden';

// state
import makeState from './state/index';

// methods that can be called on the inital obj, 0
import handleCommsController from './commsController';
import makeMapOutbound from './outbound/makeMapOutbound';

// access to the outside world
import makeInboundHandler from './inbound/makeInboundHandler';

export default function makeCommsSlots(syscall, _state, helpers) {
  const enableCSDebug = true;
  const { vatID } = helpers;
  function csdebug(...args) {
    if (enableCSDebug) {
      console.log(...args);
    }
  }

  // setup
  const state = makeState(vatID);
  const { mapOutbound, mapOutboundTarget } = makeMapOutbound(syscall, state);
  const { inboundHandler } = makeInboundHandler(state, syscall);
  const inboundHandlerFacetID = state.ids.allocateID();

  function sendToVatTP(toMachineName, data) {
    const vt = state.machineState.getVatTP();
    if (!vt) {
      throw new Error('sendToVatTP() called before init() did setVatTP()');
    }
    const args = { args: [toMachineName, data] };
    // TODO: this should be sendOnly, once vatManager provides that
    syscall.send(vt, 'send', JSON.stringify(args), []);
  }

  const dispatch = harden({
    deliver(facetid, method, argsStr, kernelToMeSlots, resolverID) {
      const kernelToMeSlotTarget = { type: 'export', id: facetid };
      csdebug(
        `cs[${vatID}].dispatch.deliver ${facetid}.${method} -> ${resolverID}`,
      );

      // CASE 1: we are hitting the initial object (0)
      if (facetid === 0) {
        const result = handleCommsController(
          state,
          syscall,
          method,
          argsStr,
          kernelToMeSlots,
          resolverID,
          helpers,
          inboundHandlerFacetID,
        );
        return result;
      }

      // CASE 2: messages are coming from a device node that we have
      // registered an object with. The device node will use sendOnly(), so
      // we won't get a resolverID.

      // TODO: build out this case, should look like liveSlots
      // TODO: figure out how to move commsSlots into liveSlots
      if (facetid === inboundHandlerFacetID) {
        return inboundHandler(method, argsStr, kernelToMeSlots);
        // TODO: resolve resolverID, at least until we change vattp.js to use
        // sendOnly() for commsHandler.inbound instead of send(), at which
        // point resolverID should always be empty
      }

      // TODO: move the rest of this method into outbound/ somewhere

      // CASE 3: messages from other vats to send to other machines

      // since we are sending to a target that is an object on another
      // machine, it is an ingress to us
      // we must have it in our tables at this point, if we don't it's an error.
      // Otherwise we wouldn't know where to send the outgoing
      // message.
      const {
        otherMachineName,
        meToYouSlot: meToYouTargetSlot,
      } = mapOutboundTarget(kernelToMeSlotTarget);

      // TODO: throw an exception if the otherMachineName that we get
      // from slots is different than otherMachineName that we get
      // from the target slot. That would be the three-party handoff
      // case which we are not supporting yet

      // TODO: don't parse the args we get from the kernel, we should wrap
      // these in a struture that adds methodName/event/target/etc and send
      // that to the other side
      const { args } = JSON.parse(argsStr);

      // map the slots
      // we want to ensure that we are not revealing anything about
      // our internal data - thus we need to transform everything
      // related to slots

      // if something isn't present in the slots (note, not the target), we need to allocate an id for it
      // and store it

      const meToYouSlots = kernelToMeSlots.map(slot =>
        mapOutbound(otherMachineName, slot),
      );

      // TODO: resolverID might be empty if the local vat did
      // syscall.sendOnly, in which case we should leave resultSlot empty too
      const resultSlot = mapOutbound(otherMachineName, {
        type: 'resolver',
        id: resolverID,
      });

      const message = JSON.stringify({
        target: meToYouTargetSlot,
        methodName: method,
        args, // TODO just include argsStr directly
        slots: meToYouSlots,
        resultSlot,
      });

      return sendToVatTP(otherMachineName, message);
    },

    // TODO: change promiseID to a slot instead of wrapping it
    notifyFulfillToData(promiseID, dataStr, kernelToMeSlots) {
      csdebug(
        `cs.dispatch.notifyFulfillToData(${promiseID}, ${dataStr}, ${kernelToMeSlots})`,
      );

      const { otherMachineName, meToYouSlot } = mapOutboundTarget({
        type: 'promise',
        id: promiseID, // cast to kernelToMeSlot
      });

      const meToYouSlots = kernelToMeSlots.map(slot =>
        mapOutbound(otherMachineName, slot),
      );

      // we need to map the slots and pass those on
      const dataMsg = JSON.stringify({
        event: 'notifyFulfillToData',
        promise: meToYouSlot,
        args: dataStr,
        slots: meToYouSlots, // TODO: these should be dependent on the machine we are sending to
      });

      // TODO: figure out whether there is a one-to-one correspondance
      // between our exports to the kernel and objects

      sendToVatTP(otherMachineName, dataMsg);
    },

    // TODO: use a slot with type promise instead of a promiseID
    notifyFulfillToPresence(promiseID, slot) {
      csdebug(`cs.dispatch.notifyFulfillToPresence(${promiseID}, ${slot})`);

      const { otherMachineName, meToYouSlot } = mapOutboundTarget({
        type: 'promise',
        id: promiseID,
      });

      const dataMsg = JSON.stringify({
        event: 'notifyFulfillToPresence',
        promise: meToYouSlot,
        target: mapOutbound(otherMachineName, slot),
      });

      sendToVatTP(otherMachineName, dataMsg);
    },

    // TODO: use promise slot rather than promiseID
    notifyReject(promiseID, data, slots) {
      csdebug(`cs.dispatch.notifyReject(${promiseID}, ${data}, ${slots})`);

      const { otherMachineName, meToYouSlot } = mapOutboundTarget({
        type: 'promise',
        id: promiseID,
      });

      const msg = JSON.stringify({
        event: 'notifyReject',
        promise: meToYouSlot,
        args: data,
        slots: slots.map(slot => mapOutbound(otherMachineName, slot)),
      });

      sendToVatTP(otherMachineName, msg);
    },

    // for testing purposes only
    getState() {
      return state;
    },
  });

  return dispatch;
}
