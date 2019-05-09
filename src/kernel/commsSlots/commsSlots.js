import harden from '@agoric/harden';

// state
import makeState from './state/index';

// methods that can be called on the inital obj, 0
import handleInitialObj from './handleInitialObj';

export function makeCommsSlots(syscall, _state, helpers, devices) {
  const enableCSDebug = false;
  const { vatID } = helpers;
  function csdebug(...args) {
    if (enableCSDebug) {
      console.log(...args);
    }
  }

  // setup
  const state = makeState(vatID);

  function mapOutbound(otherMachineName, kernelToMeSlot) {
    const outgoingWireMessageObj = state.clists.mapKernelSlotToOutgoingWireMessage(
      kernelToMeSlot,
    ); //  otherMachineName, direction, meToYouSlot
    if (outgoingWireMessageObj === undefined) {
      // this is something that we have on this machine, and we want
      // to tell another machine about it.
      // OR we have an error

      let meToYouSlot;

      switch (kernelToMeSlot.type) {
        case 'export': {
          throw new Error(
            'we do not expect an export (something we have given to the kernel) if outgoingWireMessageObj is undefined',
          );
        }
        case 'import': {
          const type = 'your-ingress';
          const id = state.ids.allocateID();
          meToYouSlot = {
            type,
            id,
          };
          break;
        }
        case 'promise': {
          // the promise in an argument is always sent as a promise
          // this is *our* answer, and *their* question
          // TODO: is this right?

          // we need a way to store the promise, and send a
          // notification to the other side when it is resolved or rejected
          const pr = syscall.createPromise();

          // add resolver
          const newResolverKernelToMeSlot = {
            type: 'resolver',
            id: pr.resolverID,
          };

          // we are creating a promise chain, send our new promise
          meToYouSlot = { type: 'your-question', id: pr.promiseID };

          state.resolvers.add(kernelToMeSlot, newResolverKernelToMeSlot);
          break;
        }
        case 'resolver': {
          // TODO: check that this is right
          // kernel type is resolver
          // we are allocating the id
          // therefore, this is *our* question, and *their* answer

          // we need a way to store the resolver, and resolve or
          // reject it when we get a notification to do so from
          // the other side.
          const pr = syscall.createPromise();

          // add promise
          const promiseKernelToMeSlot = {
            type: 'promise',
            id: pr.promiseID,
          };

          // resolver should be the original resolver - kernelToMeSlot

          // we are creating a promise chain
          meToYouSlot = { type: 'your-answer', id: pr.resolverID };

          state.resolvers.add(promiseKernelToMeSlot, kernelToMeSlot);
          break;
        }
        default: {
          throw new Error('unexpected kernelToMeSlot.type');
        }
      }

      const youToMeSlot = state.clists.changePerspective(meToYouSlot);
      state.clists.add(
        otherMachineName,
        kernelToMeSlot,
        youToMeSlot,
        meToYouSlot,
      );
    }
    const outgoingWireMessage = state.clists.mapKernelSlotToOutgoingWireMessage(
      kernelToMeSlot,
    );
    return outgoingWireMessage.meToYouSlot;
  }

  function mapOutboundTarget(kernelToMeSlot) {
    const outgoingWireMessageObj = state.clists.mapKernelSlotToOutgoingWireMessage(
      kernelToMeSlot,
    ); //  otherMachineName, direction, meToYouSlot
    // we will need to know what machine to send it to, just from the
    // kernel slot

    // we also do not allocate a new id, if we can't find it, it's an
    // error.
    if (!outgoingWireMessageObj) {
      throw new Error(
        `targetSlot ${JSON.stringify(kernelToMeSlot)} is not recognized`,
      );
    }
    return outgoingWireMessageObj;
  }

  const dispatch = harden({
    deliver(facetid, method, argsStr, kernelToMeSlots, resolverID) {
      const kernelToMeSlotTarget = { type: 'export', id: facetid };
      csdebug(
        `ls[${vatID}].dispatch.deliver ${facetid}.${method} -> ${resolverID}`,
      );

      // CASE 1: we are hitting the initial object (0)
      if (facetid === 0) {
        const result = handleInitialObj(
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

      const resolverMeToYouSlot = mapOutbound(otherMachineName, {
        type: 'resolver',
        id: resolverID,
      });

      const channel = state.channels.getChannelDevice(otherMachineName);
      const message = JSON.stringify({
        target: meToYouTargetSlot,
        methodName: method,
        args,
        slots: meToYouSlots,
        answerSlot: resolverMeToYouSlot,
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
