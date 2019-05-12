import harden from '@agoric/harden';

// state
import makeState from './state/index';

// methods that can be called on the inital obj, 0
import handleCommsController from './commsController';
import makeMapOutbound from './outbound/makeMapOutbound';

export default function makeCommsSlots(syscall, _state, helpers, devices) {
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

  const dispatch = harden({
    deliver(facetid, method, argsStr, kernelToMeSlots, resolverID) {
      const kernelToMeSlotTarget = { type: 'export', id: facetid };
      csdebug(
        `ls[${vatID}].dispatch.deliver ${facetid}.${method} -> ${resolverID}`,
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
          devices,
        );
        return result;
      }

      // CASE 2: messages are coming from a device node that we have
      // registered an object with
      // TODO: build out this case, should look like liveSlots
      // TODO: figure out how to move commsSlots into liveSlots

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

      const resultSlot = mapOutbound(otherMachineName, {
        type: 'resolver',
        id: resolverID,
      });

      const channel = state.channels.getChannelDevice(otherMachineName);
      const message = JSON.stringify({
        target: meToYouTargetSlot,
        methodName: method,
        args,
        slots: meToYouSlots,
        resultSlot,
      });

      helpers.log(
        `sendOverChannel from ${state.machineState.getMachineName()}, to: ${otherMachineName} message: ${message}`,
      );

      return devices[channel].sendOverChannel(
        state.machineState.getMachineName(),
        otherMachineName,
        message,
      );
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

      const channel = state.channels.getChannelDevice(otherMachineName);

      helpers.log(
        `sendOverChannel from ${state.machineState.getMachineName()}, to: ${otherMachineName}: ${dataMsg}`,
      );

      devices[channel].sendOverChannel(
        state.machineState.getMachineName(),
        otherMachineName,
        dataMsg,
      ); // fromMachineName, toMachineName, data
    },

    // TODO: use a slot with type promise instead of a promiseID
    notifyFulfillToTarget(promiseID, slot) {
      csdebug(`cs.dispatch.notifyFulfillToTarget(${promiseID}, ${slot})`);

      const { otherMachineName, meToYouSlot } = mapOutboundTarget({
        type: 'promise',
        id: promiseID,
      });

      const dataMsg = JSON.stringify({
        event: 'notifyFulfillToTarget',
        promise: meToYouSlot,
        target: mapOutbound(otherMachineName, slot),
      });

      const channel = state.channels.getChannelDevice(otherMachineName);

      helpers.log(`sendOverChannel message: ${dataMsg}`);

      devices[channel].sendOverChannel(
        state.machineState.getMachineName(),
        otherMachineName,
        dataMsg,
      ); // fromMachineName, toMachineName, data
    },

    // TODO: use promise slot rather than promiseID
    notifyReject(promiseID, data, slots) {
      csdebug(`cs.dispatch.notifyReject(${promiseID}, ${data}, ${slots})`);

      const { otherMachineName, meToYouSlot } = mapOutboundTarget({
        type: 'promise',
        id: promiseID,
      });

      const channel = state.channels.getChannelDevice(otherMachineName);

      helpers.log(
        `sendOverChannel notifyReject promiseID: ${promiseID}, data: ${data}`,
      );

      const msg = {
        event: 'notifyReject',
        promise: meToYouSlot,
        args: data,
        slots: slots.map(slot => mapOutbound(otherMachineName, slot)),
      };

      devices[channel].sendOverChannel(
        state.machineState.getMachineName(),
        otherMachineName,
        msg,
      ); // fromMachineName, toMachineName, data
    },

    // for testing purposes only
    getState() {
      return state;
    },
  });

  return dispatch;
}
