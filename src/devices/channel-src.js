import harden from '@agoric/harden';

// pass me endowments = { bridge: { new Map() } }
// bridge[receiverMachineName] = inboundCallback

// and later, call bridge.inboundCallback(`${sender}`, `${data}`)
// and catch exceptions

export default function setup(syscall, helpers, endowments) {
  const { bridge } = endowments;
  function getState() {
    return {};
  }
  function setState(_newState) {
    throw new Error('channel device not yet able to setState');
  }

  return helpers.makeDeviceSlots(
    syscall,
    SO =>
      harden({
        registerInboundCallback(myMachineName, handler) {
          if (bridge.has(myMachineName)) {
            throw new Error(`bridge already has ${myMachineName}`);
          }
          function f(sender, message) {
            try {
              SO(handler).inbound(`${sender}`, `${message}`);
            } catch (e) {
              console.log(`error during inboundCallback: ${e} ${e.message}`);
            }
          }
          bridge.inboundCallback.set(myMachineName, f);
        },
        sendOverChannel(fromMachineName, toMachineName, data) {
          if (!bridge.has(toMachineName)) {
            throw new Error(`bridge does not have ${toMachineName}`);
          }
          const f = bridge.get(toMachineName);
          try {
            f(`${fromMachineName}`, `${data}`);
          } catch (e) {
            console.log(`error during callback: ${e} ${e.message}`);
          }
        },
      }),
    getState,
    setState,
    helpers.name,
  );
}
