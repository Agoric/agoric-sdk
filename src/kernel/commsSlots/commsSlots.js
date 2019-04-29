import harden from '@agoric/harden';

// state
import makeState from './state/index';

// bootstrap functions
import handleBootstrap from './handleBootstrap';

export function makeCommsSlots(syscall, _state, helpers, devices) {
  const enableCSDebug = false;
  const { vatID: forVatID } = helpers;
  function csdebug(...args) {
    if (enableCSDebug) {
      console.log(...args);
    }
  }

  // setup
  const state = makeState(forVatID);

  const dispatch = harden({
    deliver(facetid, method, argsbytes, caps, resolverID) {
      csdebug(
        `ls[${forVatID}].dispatch.deliver ${facetid}.${method} -> ${resolverID}`,
      );
      csdebug('argsbytes', argsbytes);
      csdebug('caps', caps);

      // if we are hitting the initial object (0), we are in bootstrap
      if (facetid === 0) {
        const result = handleBootstrap(
          state,
          syscall,
          method,
          argsbytes,
          caps,
          resolverID,
          helpers,
          devices,
        );
        return result;
      }

      // look up facetid and send a message to the resulting machine

      const machineInfo = state.clists.getMachine('inbound', facetid);
      if (!machineInfo) {
        throw new Error('unknown facetid');
      }
      const { args } = JSON.parse(argsbytes);

      const slots = caps.map(facet => {
        const { key } = state.clists.getMachine('inbound', facet.id);
        return { type: 'export', index: key };
      });

      const channel = state.channels.getChannelDevice(machineInfo.machineName);
      const message = JSON.stringify({
        index: machineInfo.key,
        methodName: method,
        args,
        slots,
        resultIndex: resolverID,
      });

      helpers.log(
        `sendOverChannel from ${state.machineState.getMachineName()}, to: ${
          machineInfo.machineName
        } message: ${message}`,
      );

      return devices[channel].sendOverChannel(
        state.machineState.getMachineName(),
        machineInfo.machineName,
        message,
      );
    },

    notifyFulfillToData(promiseID, data, slots) {
      csdebug(
        `cs.dispatch.notifyFulfillToData(${promiseID}, ${data}, ${slots})`,
      );

      const machineInfo = state.clists.getMachine('outbound', {
        type: 'promise',
        id: promiseID,
      });

      const dataMsg = JSON.stringify({
        event: 'notifyFulfillToData',
        resolverID: machineInfo.key,
        data,
      });

      // eslint-disable-next-line array-callback-return
      state.subscribers.get(promiseID).map(subscriber => {
        const channel = state.channels.getChannelDevice(subscriber);

        helpers.log(
          `sendOverChannel from ${state.machineState.getMachineName()}, to: ${subscriber}: ${dataMsg}`,
        );

        devices[channel].sendOverChannel(
          state.machineState.getMachineName(),
          subscriber,
          dataMsg,
        ); // fromMachineName, toMachineName, data
      });
    },

    notifyFulfillToTarget(promiseID, slot) {
      csdebug(`cs.dispatch.notifyFulfillToTarget(${promiseID}, ${slot})`);

      // we are given the promiseID and the slot.
      // we need to get the targetMachine from the promiseID
      // we need to stringify the slot and the promiseID into data.

      // TODO: map the slot
      const data = JSON.stringify({
        event: 'notifyFulfillToTarget',
        promiseID,
        target: slot,
      });

      // eslint-disable-next-line array-callback-return
      state.subscribers.get(promiseID).map(subscriber => {
        const channel = state.channels.getChannelDevice(subscriber);

        helpers.log(`sendOverChannel message: ${data}`);

        devices[channel].sendOverChannel(
          state.machineState.getMachineName(),
          subscriber,
          data,
        ); // fromMachineName, toMachineName, data
      });
    },

    notifyReject(promiseID, data, slots) {
      csdebug(`cs.dispatch.notifyReject(${promiseID}, ${data}, ${slots})`);

      // eslint-disable-next-line array-callback-return
      state.subscribers.get(promiseID).map(subscriber => {
        const channel = state.channels.getChannelDevice(subscriber);

        helpers.log(
          `sendOverChannel notifyReject promiseID: ${promiseID}, data: ${data}`,
        );

        devices[channel].sendOverChannel(
          state.machineState.getMachineName(),
          subscriber,
          data,
        ); // fromMachineName, toMachineName, data
      });
    },

    // for testing purposes only
    getState() {
      return state;
    },
  });

  return dispatch;
}
