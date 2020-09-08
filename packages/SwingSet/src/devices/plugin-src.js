/* global harden */

import { makeCapTP } from '@agoric/captp';

export function buildRootDeviceNode(tools) {
  const { SO, getDeviceState, setDeviceState, endowments } = tools;
  const restart = getDeviceState();

  let registeredReceiver = restart && restart.registeredReceiver;

  const connectedMods = [];
  const senders = [];
  const connectedState = restart ? [...restart.connectedState] : [];

  function saveState() {
    setDeviceState(
      harden({
        registeredReceiver,
        connectedMods: [...connectedMods],
        connectedState: [...connectedState],
      }),
    );
  }

  /**
   * Load a module and connect to it.
   * @param {string} mod module with an exported `bootPlugin(state = undefined)`
   * @param {(obj: Record<string, any>) => void} receive a message from the module
   * @returns {(obj: Record<string, any>) => void} send a message to the module
   */
  function connect(mod) {
    try {
      const modNS = endowments.require(mod);
      const index = connectedMods.length;
      connectedMods.push(mod);
      const receiver = obj => {
        console.info('receiver', index, obj);

        // We need to run the kernel after the send-only.
        endowments.queueThunkForKernel(() =>
          SO(registeredReceiver).receive(index, obj),
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
    const sender = senders[index];
    console.error('send', obj);
    sender(obj);
  }

  // Connect to all existing modules.
  const preload = restart ? restart.connectedMods : [];
  preload.forEach(mod => {
    try {
      connect(mod);
    } catch (e) {
      console.error(`Cannot connect to ${mod}:`, e);
    }
  });

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
