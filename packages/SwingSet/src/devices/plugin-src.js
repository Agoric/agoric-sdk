/* global harden */

import { makeCapTP } from '@agoric/captp';

export function buildRootDeviceNode(tools) {
  const { SO, getDeviceState, setDeviceState, endowments } = tools;
  const restart = getDeviceState();

  let registeredReceiver = restart && restart.registeredReceiver;

  const senders = {};
  // Take a shallow copy so that these are not frozen.
  const connectedMods = restart ? [...restart.connectedMods] : [];
  const connectedState = restart ? [...restart.connectedState] : [];

  function saveState() {
    setDeviceState(
      harden({
        registeredReceiver,
        // Take a shallow copy so that these are not frozen.
        connectedMods: [...connectedMods],
        connectedState: [...connectedState],
      }),
    );
  }
  // Register our first state.
  saveState();

  /**
   * Load a module and connect to it.
   * @param {string} mod module with an exported `bootPlugin(state = undefined)`
   * @param {number} [index=connectedMods.length] the module instance index
   * @param {(obj: Record<string, any>) => void} receive a message from the module
   * @returns {(obj: Record<string, any>) => void} send a message to the module
   */
  function connect(mod, index = connectedMods.length) {
    try {
      // Allocate this module first.
      if (connectedMods[index] === undefined) {
        connectedMods[index] = mod;
        saveState();
      }
      if (connectedMods[index] !== mod) {
        throw TypeError(
          `Index ${index} is already allocated to ${connectedMods[index]}, not ${mod}`,
        );
      }

      const modNS = endowments.require(mod);
      const receiver = obj => {
        // console.info('receiver', index, obj);

        // We need to run the kernel after the send-only.
        endowments.queueThunkForKernel(() =>
          SO(registeredReceiver).dispatch(index, obj),
        );
      };
      // Create a bootstrap reference from the module.
      const bootstrap = modNS.bootPlugin(
        harden({
          getState() {
            return connectedState[index];
          },
          setState(state) {
            connectedState[index] = state;
            saveState();
          },
        }),
      );

      // Establish a CapTP connection.
      const { dispatch } = makeCapTP(mod, receiver, bootstrap);

      // Save the dispatch function for later.
      senders[index] = dispatch;
      return index;
    } catch (e) {
      console.error(`Cannot connect to ${mod}:`, e);
      return `${(e && e.stack) || e}`;
    }
  }

  function send(index, obj) {
    const mod = connectedMods[index];
    console.info('send', index, obj, mod);
    if (!mod) {
      throw TypeError(`No module associated with ${index}`);
    }
    let sender = senders[index];
    if (!sender) {
      // Lazily create a sender.
      console.info('Destroying', index);
      SO(registeredReceiver).abort(index);
      connect(mod, index);
      sender = senders[index];
    }
    // Now actually send.
    sender(obj);
  }

  return harden({
    connect,
    send,
    registerReceiver(receiver) {
      if (registeredReceiver) {
        throw Error(`registerd receiver already set`);
      }
      registeredReceiver = receiver;
      saveState();
    },
  });
}
